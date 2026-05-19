// Feature: Questions (feed + ask + notifications).
// Owner: backend-1
//
// Mount path: /api/questions
// Notifications: GET /api/questions/notifications (declared before /:id so it isn't shadowed).

import { Hono } from "hono";
import { jsonError } from "../utils.js";

const KNOWN_TAGS = ["Fundraising", "Hiring", "Product", "Sales", "Operations", "Other"];
const UPVOTER_SEP = "|::|"; // unlikely to appear in a user-entered display name

const app = new Hono();

function rowToItem(row) {
  const anonymous = !!row.anonymous;
  const csv = row.upvoter_names_csv;
  const upvoterNames = csv
    ? String(csv).split(UPVOTER_SEP).filter(Boolean)
    : [];
  const userUpvoted = !!row.user_upvoted_marker;
  const bookmarked = !!row.bookmarked_marker;
  return {
    id: row.id,
    text: row.body,
    body: row.body,
    tag: row.tag,
    anonymous,
    author_id: row.author_id,
    author_name: anonymous ? null : row.author_name,
    created_at: row.created_at,
    upvote_count: Number(row.upvote_count) || 0,
    upvoter_names: upvoterNames,
    upvoters: upvoterNames.map((n) => ({ user_name: n })),
    answer_count: Number(row.answer_count) || 0,
    accepted_answer_id: row.accepted_answer_id || null,
    upvoted: userUpvoted,
    user_upvoted: userUpvoted,
    has_upvoted: userUpvoted,
    bookmarked,
  };
}

// GET /api/questions/notifications — must precede /:id
app.get("/notifications", async (c) => {
  const session = c.get("session");
  if (!session?.user) return c.json({ unread_count: 0 });
  const userId = session.user.id;
  const since = Date.now() - 5 * 60 * 1000;
  try {
    const row = await c.env.DB.prepare(
      `SELECT COUNT(*) AS n
         FROM answers a
         JOIN questions q ON q.id = a.question_id
        WHERE q.author_id = ?
          AND a.author_id != ?
          AND a.created_at >= ?`
    )
      .bind(userId, userId, since)
      .first();
    return c.json({ unread_count: Number(row?.n) || 0 });
  } catch {
    return jsonError(c, 500, "failed to load notifications");
  }
});

// GET /api/questions
app.get("/", async (c) => {
  const tag = c.req.query("tag");
  if (tag && !KNOWN_TAGS.includes(tag)) {
    return jsonError(c, 400, "unknown tag");
  }
  const sort = c.req.query("sort") === "top" ? "top" : "newest";
  const q = (c.req.query("q") || "").trim().slice(0, 100);
  const filter = c.req.query("filter") === "saved" ? "saved" : null;
  const session = c.get("session");
  const userId = session?.user?.id || null;
  // Saved filter only makes sense when signed in. Empty list when anonymous —
  // cleaner than a 401 because the home page can still render the tab.
  if (filter === "saved" && !userId) {
    return c.json({ questions: [] });
  }
  try {
    const userVoteSubquery = userId
      ? `(SELECT 1 FROM upvotes uu WHERE uu.question_id = q.id AND uu.user_id = ?)`
      : `0`;
    const bookmarkSubquery = userId
      ? `(SELECT 1 FROM bookmarks bb WHERE bb.question_id = q.id AND bb.user_id = ?)`
      : `0`;
    const orderBy = sort === "top"
      ? `ORDER BY upvote_count DESC, q.created_at DESC`
      : `ORDER BY q.created_at DESC`;
    const whereClauses = [];
    if (tag) whereClauses.push("q.tag = ?");
    // Search matches question body always; matches author name only on non-anonymous
    // questions (prevents enumerating anonymous-question authors via search).
    if (q) whereClauses.push("(q.body LIKE ? OR (q.anonymous = 0 AND q.author_name LIKE ?))");
    if (filter === "saved") {
      whereClauses.push("q.id IN (SELECT question_id FROM bookmarks WHERE user_id = ?)");
    }
    const whereSql = whereClauses.length ? `WHERE ${whereClauses.join(" AND ")}` : "";
    const sql = `
      SELECT q.id, q.author_id, q.author_name, q.anonymous, q.tag, q.body,
             q.created_at, q.last_answered_at, q.accepted_answer_id,
             (SELECT COUNT(*) FROM upvotes u  WHERE u.question_id  = q.id) AS upvote_count,
             (SELECT COUNT(*) FROM answers a  WHERE a.question_id  = q.id) AS answer_count,
             (SELECT GROUP_CONCAT(u2.user_name, '${UPVOTER_SEP}')
                FROM upvotes u2 WHERE u2.question_id = q.id) AS upvoter_names_csv,
             ${userVoteSubquery} AS user_upvoted_marker,
             ${bookmarkSubquery} AS bookmarked_marker
        FROM questions q
       ${whereSql}
       ${orderBy}
       LIMIT 100
    `;
    // Bind order must match placeholder order in SQL above:
    //   userVoteSubquery (?), bookmarkSubquery (?), then WHERE clauses.
    const binds = [];
    if (userId) binds.push(userId, userId);
    if (tag) binds.push(tag);
    if (q) {
      const pattern = `%${q.replace(/[%_\\]/g, "\\$&")}%`;
      binds.push(pattern, pattern);
    }
    if (filter === "saved") binds.push(userId);
    const stmt = binds.length
      ? c.env.DB.prepare(sql).bind(...binds)
      : c.env.DB.prepare(sql);
    const { results } = await stmt.all();
    const items = (results || []).map(rowToItem);
    return c.json({ questions: items });
  } catch (e) {
    console.error("GET /api/questions failed:", e);
    return jsonError(c, 500, "failed to load questions");
  }
});

// POST /api/questions
app.post("/", async (c) => {
  const session = c.get("session");
  if (!session?.user) return jsonError(c, 401, "sign in required");

  let body;
  try {
    body = await c.req.json();
  } catch {
    return jsonError(c, 400, "invalid JSON body");
  }

  const rawText = body?.text ?? body?.body;
  const text = typeof rawText === "string" ? rawText.trim() : "";
  const tag = typeof body?.tag === "string" ? body.tag : "";

  if (typeof body?.anonymous !== "boolean") {
    return jsonError(c, 400, "anonymous must be a boolean");
  }
  const anonymous = body.anonymous;

  if (!text || text.length < 1 || text.length > 2000) {
    return jsonError(c, 400, "text must be 1-2000 characters");
  }
  if (!KNOWN_TAGS.includes(tag)) {
    return jsonError(c, 400, "tag must be one of: " + KNOWN_TAGS.join(", "));
  }

  const id = crypto.randomUUID();
  const now = Date.now();
  const authorId = session.user.id;
  const authorName = session.user.name || session.user.email || "Unknown";

  try {
    await c.env.DB.prepare(
      `INSERT INTO questions (id, author_id, author_name, anonymous, tag, body, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(id, authorId, authorName, anonymous ? 1 : 0, tag, text, now)
      .run();
  } catch (e) {
    console.error("POST /api/questions failed:", e);
    return jsonError(c, 500, "failed to save question");
  }

  return c.json(
    {
      id,
      text,
      body: text,
      tag,
      anonymous,
      author_id: authorId,
      author_name: anonymous ? null : authorName,
      created_at: now,
      upvote_count: 0,
      upvoter_names: [],
      upvoters: [],
      answer_count: 0,
      accepted_answer_id: null,
    },
    201
  );
});

// GET /api/questions/:id
app.get("/:id", async (c) => {
  const id = c.req.param("id");
  if (!id) return jsonError(c, 400, "missing id");
  const session = c.get("session");
  const userId = session?.user?.id || null;

  try {
    const userVoteSubquery = userId
      ? `(SELECT 1 FROM upvotes uu WHERE uu.question_id = q.id AND uu.user_id = ?)`
      : `0`;
    const bookmarkSubquery = userId
      ? `(SELECT 1 FROM bookmarks bb WHERE bb.question_id = q.id AND bb.user_id = ?)`
      : `0`;
    const sql = `
      SELECT q.id, q.author_id, q.author_name, q.anonymous, q.tag, q.body,
             q.created_at, q.last_answered_at, q.accepted_answer_id,
             (SELECT COUNT(*) FROM upvotes u  WHERE u.question_id  = q.id) AS upvote_count,
             (SELECT COUNT(*) FROM answers a  WHERE a.question_id  = q.id) AS answer_count,
             (SELECT GROUP_CONCAT(u2.user_name, '${UPVOTER_SEP}')
                FROM upvotes u2 WHERE u2.question_id = q.id) AS upvoter_names_csv,
             ${userVoteSubquery} AS user_upvoted_marker,
             ${bookmarkSubquery} AS bookmarked_marker
        FROM questions q
       WHERE q.id = ?
    `;
    const binds = userId ? [userId, userId, id] : [id];
    const row = await c.env.DB.prepare(sql).bind(...binds).first();

    if (!row) return jsonError(c, 404, "question not found");

    // rowToItem already maps user_upvoted_marker → upvoted/user_upvoted/has_upvoted,
    // so the response shape is consistent with the list endpoint.
    return c.json(rowToItem(row));
  } catch (e) {
    console.error("GET /api/questions/:id failed:", e);
    return jsonError(c, 500, "failed to load question");
  }
});

export default app;
