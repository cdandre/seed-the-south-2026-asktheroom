// Feature: Answers + notifications.
// Owner: backend-2
// Mounted at /api/answers in worker.js.
//
// Endpoints:
//   GET  /?question_id=...   -> list answers for a question, oldest first.
//   POST /                   -> create answer. Body: { question_id, body }. Session required.
//                              Also updates questions.last_answered_at and inserts a
//                              notification for the question author (if not self).
//   GET  /notifications      -> list unread notifications for current user.
//   POST /notifications/read -> mark all current-user notifications read.

import { Hono } from "hono";
import { jsonError, newId } from "../utils.js";

const app = new Hono();

const MAX_BODY = 1000;

// GET /api/answers?question_id=...
app.get("/", async (c) => {
  const questionId = c.req.query("question_id");
  if (!questionId) {
    return jsonError(c, 400, "question_id is required");
  }
  try {
    const { results } = await c.env.DB.prepare(
      `SELECT id, question_id, author_id, author_name, body, created_at
         FROM answers
        WHERE question_id = ?
        ORDER BY created_at ASC`,
    )
      .bind(questionId)
      .all();
    return c.json({ answers: results ?? [] });
  } catch (e) {
    console.error("GET /api/answers failed:", e);
    return jsonError(c, 500, "failed to load answers");
  }
});

// POST /api/answers   body: { question_id, body }
app.post("/", async (c) => {
  const session = c.get("session");
  if (!session?.user) {
    return jsonError(c, 401, "sign in required");
  }

  let payload;
  try {
    payload = await c.req.json();
  } catch {
    return jsonError(c, 400, "invalid json body");
  }

  const questionId = typeof payload?.question_id === "string" ? payload.question_id.trim() : "";
  const body = typeof payload?.body === "string" ? payload.body.trim() : "";

  if (!questionId) {
    return jsonError(c, 400, "question_id is required");
  }
  if (!body) {
    return jsonError(c, 400, "answer cannot be empty");
  }
  if (body.length > MAX_BODY) {
    return jsonError(c, 400, `answer must be ${MAX_BODY} characters or fewer`);
  }

  try {
    // Confirm question exists and grab its author for the notification side-effect.
    const question = await c.env.DB.prepare(
      `SELECT id, author_id FROM questions WHERE id = ?`,
    )
      .bind(questionId)
      .first();

    if (!question) {
      return jsonError(c, 404, "question not found");
    }

    const id = newId();
    const now = Date.now();
    const authorId = session.user.id;
    const authorName = session.user.name || session.user.email || "Someone";

    await c.env.DB.prepare(
      `INSERT INTO answers (id, question_id, author_id, author_name, body, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
      .bind(id, questionId, authorId, authorName, body, now)
      .run();

    await c.env.DB.prepare(
      `UPDATE questions SET last_answered_at = ? WHERE id = ?`,
    )
      .bind(now, questionId)
      .run();

    if (question.author_id && question.author_id !== authorId) {
      await c.env.DB.prepare(
        `INSERT INTO notifications (id, user_id, question_id, answer_id, read, created_at)
         VALUES (?, ?, ?, ?, 0, ?)`,
      )
        .bind(newId(), question.author_id, questionId, id, now)
        .run();
    }

    return c.json(
      {
        answer: {
          id,
          question_id: questionId,
          author_id: authorId,
          author_name: authorName,
          body,
          created_at: now,
        },
      },
      201,
    );
  } catch (e) {
    console.error("POST /api/answers failed:", e);
    return jsonError(c, 500, "failed to post answer");
  }
});

// GET /api/answers/notifications
app.get("/notifications", async (c) => {
  const session = c.get("session");
  if (!session?.user) {
    return jsonError(c, 401, "sign in required");
  }
  try {
    const { results } = await c.env.DB.prepare(
      `SELECT id, question_id, answer_id, created_at
         FROM notifications
        WHERE user_id = ? AND read = 0
        ORDER BY created_at DESC`,
    )
      .bind(session.user.id)
      .all();
    return c.json({ notifications: results ?? [] });
  } catch {
    return jsonError(c, 500, "failed to load notifications");
  }
});

// POST /api/answers/:answerId/accept
// Marks an answer as the accepted answer for its question.
// Only the question's author can accept. POST with empty body to accept;
// posting with { unaccept: true } clears acceptance.
app.post("/:answerId/accept", async (c) => {
  const session = c.get("session");
  if (!session?.user) return jsonError(c, 401, "sign in required");
  const answerId = c.req.param("answerId");
  if (!answerId) return jsonError(c, 400, "missing answer id");

  let payload = {};
  try { payload = await c.req.json(); } catch { payload = {}; }
  const unaccept = !!payload?.unaccept;

  try {
    const answer = await c.env.DB.prepare(
      `SELECT a.id, a.question_id, q.author_id AS question_author_id
         FROM answers a
         JOIN questions q ON q.id = a.question_id
        WHERE a.id = ?`,
    ).bind(answerId).first();

    if (!answer) return jsonError(c, 404, "answer not found");
    if (answer.question_author_id !== session.user.id) {
      return jsonError(c, 403, "only the question author can accept an answer");
    }

    await c.env.DB.prepare(
      `UPDATE questions SET accepted_answer_id = ? WHERE id = ?`,
    ).bind(unaccept ? null : answerId, answer.question_id).run();

    return c.json({ ok: true, question_id: answer.question_id, accepted_answer_id: unaccept ? null : answerId });
  } catch (e) {
    console.error("accept answer failed:", e);
    return jsonError(c, 500, "failed to accept answer");
  }
});

// POST /api/answers/notifications/read
app.post("/notifications/read", async (c) => {
  const session = c.get("session");
  if (!session?.user) {
    return jsonError(c, 401, "sign in required");
  }
  try {
    await c.env.DB.prepare(
      `UPDATE notifications SET read = 1 WHERE user_id = ? AND read = 0`,
    )
      .bind(session.user.id)
      .run();
    return c.json({ ok: true });
  } catch {
    return jsonError(c, 500, "failed to mark notifications read");
  }
});

export default app;
