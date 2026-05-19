// Feature: Upvotes (THE killer feature per room vote).
// Owner: backend-2
// Mounted at /api/votes in worker.js.
//
// Endpoints:
//   POST /                   -> toggle upvote on a question. Body: { question_id }.
//                              Requires session.
//                              Returns: { upvoted: boolean, count: number }
//   GET  /?question_id=...   -> list upvoters for a question.
//                              Returns: { upvoters: [{ user_id, user_name, created_at }], count }
//
// Room voted "see who voted" 3-2 — upvoter names are public per question.

import { Hono } from "hono";
import { jsonError, newId } from "../utils.js";

const app = new Hono();

async function countUpvotes(db, questionId) {
  const row = await db
    .prepare(`SELECT COUNT(*) AS n FROM upvotes WHERE question_id = ?`)
    .bind(questionId)
    .first();
  return row?.n ?? 0;
}

// POST /api/votes   body: { question_id }
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
  if (!questionId) {
    return jsonError(c, 400, "question_id is required");
  }

  const userId = session.user.id;
  const userName = session.user.name || session.user.email || "Someone";

  try {
    const exists = await c.env.DB.prepare(
      `SELECT id FROM upvotes WHERE question_id = ? AND user_id = ?`,
    )
      .bind(questionId, userId)
      .first();

    if (exists) {
      await c.env.DB.prepare(
        `DELETE FROM upvotes WHERE question_id = ? AND user_id = ?`,
      )
        .bind(questionId, userId)
        .run();
      const count = await countUpvotes(c.env.DB, questionId);
      return c.json({ upvoted: false, count });
    }

    // Confirm question exists before inserting (cheap guard).
    const question = await c.env.DB.prepare(
      `SELECT id FROM questions WHERE id = ?`,
    )
      .bind(questionId)
      .first();
    if (!question) {
      return jsonError(c, 404, "question not found");
    }

    // INSERT OR IGNORE: if a concurrent request raced to insert the same upvote
    // (UNIQUE constraint on (question_id, user_id) would otherwise throw), we
    // silently no-op and return the current count. Net effect: idempotent toggle.
    await c.env.DB.prepare(
      `INSERT OR IGNORE INTO upvotes (id, question_id, user_id, user_name, created_at)
       VALUES (?, ?, ?, ?, ?)`,
    )
      .bind(newId(), questionId, userId, userName, Date.now())
      .run();

    const count = await countUpvotes(c.env.DB, questionId);
    return c.json({ upvoted: true, count });
  } catch (e) {
    console.error("upvote toggle failed:", e);
    return jsonError(c, 500, "failed to toggle upvote");
  }
});

// GET /api/votes?question_id=...
app.get("/", async (c) => {
  const questionId = c.req.query("question_id");
  if (!questionId) {
    return jsonError(c, 400, "question_id is required");
  }
  try {
    const { results } = await c.env.DB.prepare(
      `SELECT user_id, user_name, created_at
         FROM upvotes
        WHERE question_id = ?
        ORDER BY created_at ASC`,
    )
      .bind(questionId)
      .all();
    const upvoters = results ?? [];
    return c.json({ upvoters, count: upvoters.length });
  } catch (e) {
    console.error("GET /api/votes failed:", e);
    return jsonError(c, 500, "failed to load upvoters");
  }
});

// --- Answer upvotes -------------------------------------------------------
// Mirrors the question-upvote pattern above, but keyed on answer_id and
// backed by the answer_upvotes table. Anyone (including the answer's own
// author) can upvote an answer — that's standard Q&A behavior.

async function countAnswerUpvotes(db, answerId) {
  const row = await db
    .prepare(`SELECT COUNT(*) AS n FROM answer_upvotes WHERE answer_id = ?`)
    .bind(answerId)
    .first();
  return row?.n ?? 0;
}

// POST /api/votes/answer   body: { answer_id }
app.post("/answer", async (c) => {
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

  const answerId = typeof payload?.answer_id === "string" ? payload.answer_id.trim() : "";
  if (!answerId) {
    return jsonError(c, 400, "answer_id is required");
  }

  const userId = session.user.id;
  const userName = session.user.name || session.user.email || "Someone";

  try {
    const exists = await c.env.DB.prepare(
      `SELECT id FROM answer_upvotes WHERE answer_id = ? AND user_id = ?`,
    )
      .bind(answerId, userId)
      .first();

    if (exists) {
      await c.env.DB.prepare(
        `DELETE FROM answer_upvotes WHERE answer_id = ? AND user_id = ?`,
      )
        .bind(answerId, userId)
        .run();
      const count = await countAnswerUpvotes(c.env.DB, answerId);
      return c.json({ upvoted: false, count });
    }

    // Confirm answer exists before inserting (cheap guard, mirrors question check).
    const answer = await c.env.DB.prepare(
      `SELECT id FROM answers WHERE id = ?`,
    )
      .bind(answerId)
      .first();
    if (!answer) {
      return jsonError(c, 404, "answer not found");
    }

    // INSERT OR IGNORE: race-safe idempotent toggle (UNIQUE on answer_id+user_id).
    await c.env.DB.prepare(
      `INSERT OR IGNORE INTO answer_upvotes (id, answer_id, user_id, user_name, created_at)
       VALUES (?, ?, ?, ?, ?)`,
    )
      .bind(newId(), answerId, userId, userName, Date.now())
      .run();

    const count = await countAnswerUpvotes(c.env.DB, answerId);
    return c.json({ upvoted: true, count });
  } catch (e) {
    console.error("answer upvote toggle failed:", e);
    return jsonError(c, 500, "failed to toggle answer upvote");
  }
});

// GET /api/votes/answer?answer_id=...
app.get("/answer", async (c) => {
  const answerId = c.req.query("answer_id");
  if (!answerId) {
    return jsonError(c, 400, "answer_id is required");
  }
  try {
    const { results } = await c.env.DB.prepare(
      `SELECT user_id, user_name, created_at
         FROM answer_upvotes
        WHERE answer_id = ?
        ORDER BY created_at ASC`,
    )
      .bind(answerId)
      .all();
    const upvoters = results ?? [];
    return c.json({ upvoters, count: upvoters.length });
  } catch (e) {
    console.error("GET /api/votes/answer failed:", e);
    return jsonError(c, 500, "failed to load answer upvoters");
  }
});

export default app;
