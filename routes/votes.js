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

const app = new Hono();

function newId() {
  return crypto.randomUUID();
}

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
    return c.json({ message: "sign in required" }, 401);
  }

  let payload;
  try {
    payload = await c.req.json();
  } catch {
    return c.json({ message: "invalid json body" }, 400);
  }

  const questionId = typeof payload?.question_id === "string" ? payload.question_id.trim() : "";
  if (!questionId) {
    return c.json({ message: "question_id is required" }, 400);
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
      return c.json({ message: "question not found" }, 404);
    }

    await c.env.DB.prepare(
      `INSERT INTO upvotes (id, question_id, user_id, user_name, created_at)
       VALUES (?, ?, ?, ?, ?)`,
    )
      .bind(newId(), questionId, userId, userName, Date.now())
      .run();

    const count = await countUpvotes(c.env.DB, questionId);
    return c.json({ upvoted: true, count });
  } catch (err) {
    return c.json({ message: "failed to toggle upvote" }, 500);
  }
});

// GET /api/votes?question_id=...
app.get("/", async (c) => {
  const questionId = c.req.query("question_id");
  if (!questionId) {
    return c.json({ message: "question_id is required" }, 400);
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
  } catch (err) {
    return c.json({ message: "failed to load upvoters" }, 500);
  }
});

export default app;
