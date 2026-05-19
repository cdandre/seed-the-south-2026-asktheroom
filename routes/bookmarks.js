// Feature: Bookmarks (follow / save a question).
// Mounted at /api/bookmarks in worker.js.
//
// Endpoints:
//   POST /         body: { question_id }  -> toggle bookmark; returns { bookmarked, count }
//   GET  /         -> { question_ids: [...] } for current user
//
// Side-effects: a bookmarked question lights up the existing notifications badge
// when somebody else answers it (see routes/answers.js for the dedupe logic).

import { Hono } from "hono";
import { jsonError, newId } from "../utils.js";

const app = new Hono();

// POST /api/bookmarks  { question_id }
// Toggles the bookmark. INSERT OR IGNORE keeps it race-safe against double-tap.
app.post("/", async (c) => {
  const session = c.get("session");
  if (!session?.user) return jsonError(c, 401, "sign in required");

  let payload;
  try {
    payload = await c.req.json();
  } catch {
    return jsonError(c, 400, "invalid JSON body");
  }

  const questionId =
    typeof payload?.question_id === "string" ? payload.question_id.trim() : "";
  if (!questionId) return jsonError(c, 400, "question_id is required");

  const userId = session.user.id;
  try {
    // Confirm the question exists so we don't create dangling bookmarks.
    const q = await c.env.DB.prepare(
      `SELECT id FROM questions WHERE id = ?`,
    )
      .bind(questionId)
      .first();
    if (!q) return jsonError(c, 404, "question not found");

    const existing = await c.env.DB.prepare(
      `SELECT id FROM bookmarks WHERE user_id = ? AND question_id = ?`,
    )
      .bind(userId, questionId)
      .first();

    let bookmarked;
    if (existing) {
      await c.env.DB.prepare(
        `DELETE FROM bookmarks WHERE user_id = ? AND question_id = ?`,
      )
        .bind(userId, questionId)
        .run();
      bookmarked = false;
    } else {
      await c.env.DB.prepare(
        `INSERT OR IGNORE INTO bookmarks (id, user_id, question_id, created_at)
         VALUES (?, ?, ?, ?)`,
      )
        .bind(newId(), userId, questionId, Date.now())
        .run();
      bookmarked = true;
    }

    const countRow = await c.env.DB.prepare(
      `SELECT COUNT(*) AS n FROM bookmarks WHERE user_id = ?`,
    )
      .bind(userId)
      .first();

    return c.json({ bookmarked, count: Number(countRow?.n) || 0 });
  } catch (e) {
    console.error("POST /api/bookmarks failed:", e);
    return jsonError(c, 500, "failed to toggle bookmark");
  }
});

// GET /api/bookmarks  -> { question_ids: [...] }
// Simpler shape than full bookmark rows; the client uses this just to mark stars
// on already-fetched feed items.
app.get("/", async (c) => {
  const session = c.get("session");
  if (!session?.user) return jsonError(c, 401, "sign in required");
  try {
    const { results } = await c.env.DB.prepare(
      `SELECT question_id FROM bookmarks
        WHERE user_id = ?
        ORDER BY created_at DESC`,
    )
      .bind(session.user.id)
      .all();
    const ids = (results || []).map((r) => r.question_id);
    return c.json({ question_ids: ids });
  } catch (e) {
    console.error("GET /api/bookmarks failed:", e);
    return jsonError(c, 500, "failed to load bookmarks");
  }
});

export default app;
