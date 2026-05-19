// Landing page — redirects to /home if signed in, else to /auth.
// Owner: frontend-1
//
// Simple bounce; keep it tiny so it renders fast for the demo.

import { Hono } from "hono";

const app = new Hono();

app.get("/", (c) => {
  const session = c.get("session");
  return c.redirect(session ? "/home" : "/about");
});

export default app;
