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

const app = new Hono();

const MAX_BODY = 1000;

function newId() {
  // crypto.randomUUID is available in the Workers runtime.
  return crypto.randomUUID();
}

// GET /api/answers?question_id=...
app.get("/", async (c) => {
  const questionId = c.req.query("question_id");
  if (!questionId) {
    return c.json({ message: "question_id is required" }, 400);
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
  } catch (err) {
    return c.json({ message: "failed to load answers" }, 500);
  }
});

// POST /api/answers   body: { question_id, body }
app.post("/", async (c) => {
  const session = c.get("session");
  if (!session?.user) {
    return c.json({ message: "sign in required" }, 401);
  }

  let payload;
  try {
    payload = await c.req.json();
  } catch {
    return c.json({ message: "invalid json body" }, 400);
  }

  const questionId = typeof payload?.question_id === "string" ? payload.question_id.trim() : "";
  const body = typeof payload?.body === "string" ? payload.body.trim() : "";

  if (!questionId) {
    return c.json({ message: "question_id is required" }, 400);
  }
  if (!body) {
    return c.json({ message: "answer cannot be empty" }, 400);
  }
  if (body.length > MAX_BODY) {
    return c.json({ message: `answer must be ${MAX_BODY} characters or fewer` }, 400);
  }

  try {
    // Confirm question exists and grab its author for the notification side-effect.
    const question = await c.env.DB.prepare(
      `SELECT id, author_id FROM questions WHERE id = ?`,
    )
      .bind(questionId)
      .first();

    if (!question) {
      return c.json({ message: "question not found" }, 404);
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
  } catch (err) {
    return c.json({ message: "failed to post answer" }, 500);
  }
});

// GET /api/answers/notifications
app.get("/notifications", async (c) => {
  const session = c.get("session");
  if (!session?.user) {
    return c.json({ message: "sign in required" }, 401);
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
  } catch (err) {
    return c.json({ message: "failed to load notifications" }, 500);
  }
});

// POST /api/answers/notifications/read
app.post("/notifications/read", async (c) => {
  const session = c.get("session");
  if (!session?.user) {
    return c.json({ message: "sign in required" }, 401);
  }
  try {
    await c.env.DB.prepare(
      `UPDATE notifications SET read = 1 WHERE user_id = ? AND read = 0`,
    )
      .bind(session.user.id)
      .run();
    return c.json({ ok: true });
  } catch (err) {
    return c.json({ message: "failed to mark notifications read" }, 500);
  }
});

export default app;
