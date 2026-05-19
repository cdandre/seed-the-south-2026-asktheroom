// About page: explains what Ask the Room is. Public; no auth required.

import { Hono } from "hono";

const app = new Hono();

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta name="description" content="A crowdsourced Q&amp;A app for founders, built live by AI agents at Seed the South 2026." />
<meta property="og:title" content="About Ask the Room" />
<meta property="og:description" content="A crowdsourced Q&amp;A app for founders, built live by AI agents at Seed the South 2026." />
<meta property="og:url" content="https://asktheroom.org/about" />
<meta property="og:type" content="website" />
<meta name="twitter:card" content="summary" />
<title>About — Ask the Room</title>
<style>
  :root {
    --bg: #0b0d10; --panel: #14181d; --panel-2: #1b2128;
    --border: #2a323c; --text: #e8edf2; --muted: #8a96a3;
    --amber: #f5a623; --amber-2: #ffb845;
  }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
    margin: 0; background: var(--bg); color: var(--text); line-height: 1.55; font-size: 17px; }
  a { color: var(--amber); text-decoration: none; }
  a:hover { text-decoration: underline; }
  .wrap { max-width: 680px; margin: 0 auto; padding: 28px 20px 60px; }
  header { display: flex; align-items: center; justify-content: space-between;
    padding: 0 0 24px; border-bottom: 1px solid var(--border); margin-bottom: 32px; }
  .brand { font-weight: 800; font-size: 22px; color: var(--amber); letter-spacing: 0.2px; }
  .cta {
    background: var(--amber); color: #1a1408; padding: 10px 18px;
    border-radius: 8px; font-weight: 800; font-size: 15px;
  }
  .cta:hover { background: var(--amber-2); text-decoration: none; }
  h1 { font-size: 36px; line-height: 1.15; margin: 0 0 12px; letter-spacing: -0.5px; }
  .tagline { color: var(--muted); font-size: 18px; margin: 0 0 36px; }
  h2 { font-size: 14px; color: var(--amber); text-transform: uppercase;
    letter-spacing: 0.6px; margin: 32px 0 12px; }
  ul { padding-left: 22px; margin: 0; }
  li { margin-bottom: 8px; }
  .meta { color: var(--muted); font-size: 14px; padding: 16px 18px;
    background: var(--panel); border: 1px solid var(--border); border-radius: 12px;
    margin-top: 32px; }
  .meta b { color: var(--text); }
  .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid var(--border);
    color: var(--muted); font-size: 13px; display: flex; justify-content: space-between;
    gap: 16px; flex-wrap: wrap; }
</style>
</head>
<body>
<div class="wrap">
  <header>
    <div class="brand">Ask the Room</div>
    <a class="cta" href="/auth">Sign up</a>
  </header>

  <h1>A small Q&amp;A app for founders.</h1>
  <p class="tagline">Post a question you'd love a 30-second answer to. Others upvote what matters and chime in.</p>

  <h2>What it does</h2>
  <ul>
    <li><b>Ask anything.</b> Short or long, named or anonymous, tagged by topic (Fundraising, Hiring, Product, Sales, Operations, Other).</li>
    <li><b>Upvote what you want answered.</b> Other founders see who voted, so signal travels.</li>
    <li><b>Answer in your voice.</b> Longer replies allowed — this isn't Twitter.</li>
    <li><b>Get notified.</b> A small badge lights up in the header when someone answers your question.</li>
  </ul>

  <h2>What it's not</h2>
  <ul>
    <li>Not a Slack replacement.</li>
    <li>Not for long debates — best for short answerable questions.</li>
    <li>No DMs, no group chats, no follower graph.</li>
  </ul>

  <h2>How it was built</h2>
  <p>Live, at <a href="https://seedthesouth.org">Seed the South 2026</a>, in 45 minutes. The room of 30+ founders chose the concept, answered clarifying questions about how it should work, and watched 7 AI agents — one architect, three frontends, two backends, one integrator — write the code in parallel and deploy it to this domain. The whole build is on <a href="https://github.com/cdandre/seed-the-south-2026-asktheroom">GitHub</a> if you want to read what each agent did, in order.</p>

  <div class="meta">
    <div><b>Stack:</b> Cloudflare Workers + Hono + D1 (SQLite at the edge) + better-auth.</div>
    <div style="margin-top: 6px;"><b>Host:</b> <a href="https://1shotlabs.com">1Shot Labs</a> &middot; built by <a href="https://pattern50.com">Pattern50</a>.</div>
  </div>

  <div class="footer">
    <span><a href="/auth">Sign up / sign in</a></span>
    <span><a href="https://github.com/cdandre/seed-the-south-2026-asktheroom">View source</a></span>
  </div>
</div>
</body>
</html>`;

app.get("/", (c) => c.html(html));

export default app;
