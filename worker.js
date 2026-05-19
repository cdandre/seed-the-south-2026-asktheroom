// Tiny entry. Auth middleware attaches per-request `auth` to context, then
// the Hono app mounts API routes + HTML pages. Do not inline feature code here.
import { Hono } from "hono";
import { createAuth } from "./auth.js";

import authRoute from "./routes/auth.js";
import questionsRoute from "./routes/questions.js";
import answersRoute from "./routes/answers.js";
import votesRoute from "./routes/votes.js";

import indexPage from "./pages/index.js";
import authPage from "./pages/auth.js";
import aboutPage from "./pages/about.js";
import homePage from "./pages/home.js";
import questionPage from "./pages/question.js";

const app = new Hono();

// Per-request better-auth instance + session shortcut.
app.use("*", async (c, next) => {
  const auth = createAuth(c.env);
  c.set("auth", auth);
  const session = await auth.api
    .getSession({ headers: c.req.raw.headers })
    .catch(() => null);
  c.set("session", session);
  await next();
});

// API surface
app.route("/api/auth", authRoute);
app.route("/api/questions", questionsRoute);
app.route("/api/answers", answersRoute);
app.route("/api/votes", votesRoute);

// HTML pages
app.route("/", indexPage);
app.route("/auth", authPage);
app.route("/about", aboutPage);
app.route("/home", homePage);
app.route("/q", questionPage);

export default app;
