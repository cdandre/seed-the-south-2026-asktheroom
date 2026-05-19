-- Ask the Room — application tables.
-- Auth tables (user, session, account, verification) live in auth-schema.js
-- and are migrated separately by drizzle-kit. Do NOT define them here.

CREATE TABLE IF NOT EXISTS questions (
  id TEXT PRIMARY KEY,
  author_id TEXT NOT NULL,
  author_name TEXT NOT NULL,
  anonymous INTEGER NOT NULL DEFAULT 0,
  tag TEXT NOT NULL DEFAULT 'Other',
  body TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  last_answered_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_questions_created_at ON questions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_questions_tag ON questions(tag);

CREATE TABLE IF NOT EXISTS answers (
  id TEXT PRIMARY KEY,
  question_id TEXT NOT NULL,
  author_id TEXT NOT NULL,
  author_name TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_answers_question_id ON answers(question_id, created_at DESC);

CREATE TABLE IF NOT EXISTS upvotes (
  id TEXT PRIMARY KEY,
  question_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  UNIQUE(question_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_upvotes_question_id ON upvotes(question_id);

CREATE TABLE IF NOT EXISTS answer_upvotes (
  id TEXT PRIMARY KEY,
  answer_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  UNIQUE(answer_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_answer_upvotes_answer_id ON answer_upvotes(answer_id);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  question_id TEXT NOT NULL,
  answer_id TEXT NOT NULL,
  read INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id, read, created_at DESC);
