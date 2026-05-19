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
  return {
    id: row.id,
    text: row.body,
    body: row.body,
    tag: row.tag,
    anonymous,
    author_name: anonymous ? null : row.author_name,
    created_at: row.created_at,
    upvote_count: Number(row.upvote_count) || 0,
    upvoter_names: upvoterNames,
    upvoters: upvoterNames.map((n) => ({ user_name: n })),
    answer_count: Number(row.answer_count) || 0,
    upvoted: userUpvoted,
    user_upvoted: userUpvoted,
    has_upvoted: userUpvoted,
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
  const session = c.get("session");
  const userId = session?.user?.id || null;
  try {
    const userVoteSubquery = userId
      ? `(SELECT 1 FROM upvotes uu WHERE uu.question_id = q.id AND uu.user_id = ?)`
      : `0`;
    const orderBy = sort === "top"
      ? `ORDER BY upvote_count DESC, q.created_at DESC`
      : `ORDER BY q.created_at DESC`;
    const sql = `
      SELECT q.id, q.author_id, q.author_name, q.anonymous, q.tag, q.body,
             q.created_at, q.last_answered_at,
             (SELECT COUNT(*) FROM upvotes u  WHERE u.question_id  = q.id) AS upvote_count,
             (SELECT COUNT(*) FROM answers a  WHERE a.question_id  = q.id) AS answer_count,
             (SELECT GROUP_CONCAT(u2.user_name, '${UPVOTER_SEP}')
                FROM upvotes u2 WHERE u2.question_id = q.id) AS upvoter_names_csv,
             ${userVoteSubquery} AS user_upvoted_marker
        FROM questions q
       ${tag ? "WHERE q.tag = ?" : ""}
       ${orderBy}
       LIMIT 100
    `;
    const binds = [];
    if (userId) binds.push(userId);
    if (tag) binds.push(tag);
    const stmt = binds.length
      ? c.env.DB.prepare(sql).bind(...binds)
      : c.env.DB.prepare(sql);
    const { results } = await stmt.all();
    const items = (results || []).map(rowToItem);
    return c.json({ questions: items });
  } catch {
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
  } catch {
    return jsonError(c, 500, "failed to save question");
  }

  return c.json(
    {
      id,
      text,
      body: text,
      tag,
      anonymous,
      author_name: anonymous ? null : authorName,
      created_at: now,
      upvote_count: 0,
      upvoter_names: [],
      upvoters: [],
      answer_count: 0,
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
    const row = await c.env.DB.prepare(
      `SELECT q.id, q.author_id, q.author_name, q.anonymous, q.tag, q.body,
              q.created_at, q.last_answered_at,
              (SELECT COUNT(*) FROM upvotes u  WHERE u.question_id  = q.id) AS upvote_count,
              (SELECT COUNT(*) FROM answers a  WHERE a.question_id  = q.id) AS answer_count,
              (SELECT GROUP_CONCAT(u2.user_name, '${UPVOTER_SEP}')
                 FROM upvotes u2 WHERE u2.question_id = q.id) AS upvoter_names_csv
         FROM questions q
        WHERE q.id = ?`
    )
      .bind(id)
      .first();

    if (!row) return jsonError(c, 404, "question not found");

    let hasUpvoted = false;
    if (userId) {
      const v = await c.env.DB.prepare(
        `SELECT 1 AS x FROM upvotes WHERE question_id = ? AND user_id = ? LIMIT 1`
      )
        .bind(id, userId)
        .first();
      hasUpvoted = !!v;
    }

    const item = rowToItem(row);
    item.has_upvoted = hasUpvoted;
    item.user_upvoted = hasUpvoted;
    item.upvoted = hasUpvoted;
    return c.json(item);
  } catch {
    return jsonError(c, 500, "failed to load question");
  }
});

export default app;
