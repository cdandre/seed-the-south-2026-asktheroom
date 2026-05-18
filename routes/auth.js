// better-auth handles every /api/auth/* path (sign-up, sign-in, get-session,
// sign-out, etc.). Forward the raw request; the per-request `auth` instance
// was attached by the middleware in worker.js.
import { Hono } from "hono";

const app = new Hono();

app.all("/*", (c) => c.get("auth").handler(c.req.raw));

export default app;
