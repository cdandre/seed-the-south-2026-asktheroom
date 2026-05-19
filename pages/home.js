// Home page: feed + ask form.
// Owner: frontend-2
//
// Endpoints used (must match backend):
//   GET  /api/questions?tag=<tag>
//   POST /api/questions            { body, tag, anonymous }
//   GET  /api/votes?question_id=<id>
//   POST /api/votes                { question_id }
//   GET  /api/answers/notifications        -> array; length = unread count
//   POST /api/answers/notifications/read   -> clear

import { Hono } from "hono";
import { escapeHtml } from "../utils.js";

const app = new Hono();

const TAGS = ["Fundraising", "Hiring", "Product", "Sales", "Operations", "Other"];

const layout = (userName) => `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="description" content="A crowdsourced Q&amp;A app for founders. Post a question, upvote what matters, get answers. Built live at Seed the South 2026 by AI agents." />
  <meta property="og:title" content="Ask the Room" />
  <meta property="og:description" content="Crowdsourced Q&amp;A for founders. Built live at Seed the South 2026 by AI agents." />
  <meta property="og:url" content="https://asktheroom.org" />
  <meta property="og:type" content="website" />
  <title>Ask the Room</title>
  <style>
    :root {
      --bg: #0b0d10;
      --panel: #14181d;
      --panel-2: #1b2128;
      --border: #2a323c;
      --text: #e8edf2;
      --muted: #8a96a3;
      --amber: #f5a623;
      --amber-2: #ffb845;
      --danger: #ff5d5d;
    }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; background: var(--bg); color: var(--text);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 17px; line-height: 1.45; }
    a { color: var(--amber); text-decoration: none; }
    header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 14px 20px; border-bottom: 1px solid var(--border);
      background: var(--panel); position: sticky; top: 0; z-index: 10;
    }
    .brand { font-weight: 800; font-size: 22px; color: var(--amber); letter-spacing: 0.2px; }
    .who { color: var(--muted); font-size: 14px; }
    .who b { color: var(--text); }
    .hdr-right { display: flex; align-items: center; gap: 14px; }
    .bell {
      position: relative; background: var(--panel-2); border: 1px solid var(--border);
      color: var(--text); padding: 8px 12px; border-radius: 8px; cursor: pointer;
      font-size: 14px;
    }
    .bell .badge {
      position: absolute; top: -7px; right: -7px; background: var(--amber);
      color: #1a1408; border-radius: 999px; min-width: 20px; height: 20px;
      font-size: 12px; font-weight: 800; display: none; align-items: center;
      justify-content: center; padding: 0 6px;
    }
    .bell .badge.on { display: inline-flex; }
    .signout {
      background: transparent; border: 1px solid var(--border); color: var(--muted);
      padding: 8px 12px; border-radius: 8px; cursor: pointer; font-size: 14px;
    }
    .signout:hover { color: var(--text); border-color: var(--muted); }
    main { max-width: 760px; margin: 0 auto; padding: 22px 18px 80px; }
    .card {
      background: var(--panel); border: 1px solid var(--border); border-radius: 12px;
      padding: 16px; margin-bottom: 16px;
    }
    .ask h2 { margin: 0 0 10px; font-size: 16px; color: var(--amber); letter-spacing: 0.3px; text-transform: uppercase; }
    .ask textarea {
      width: 100%; min-height: 90px; resize: vertical;
      background: var(--bg); color: var(--text); border: 1px solid var(--border);
      border-radius: 8px; padding: 12px; font: inherit;
    }
    .ask textarea:focus, .ask select:focus { outline: 2px solid var(--amber); border-color: var(--amber); }
    .ask-row {
      display: flex; gap: 10px; align-items: center; margin-top: 10px; flex-wrap: wrap;
    }
    .ask select, .filter select {
      background: var(--bg); color: var(--text); border: 1px solid var(--border);
      border-radius: 8px; padding: 10px 12px; font: inherit;
    }
    .anon { display: flex; align-items: center; gap: 8px; color: var(--muted); font-size: 14px; cursor: pointer; }
    .anon input { width: 18px; height: 18px; accent-color: var(--amber); }
    .submit {
      margin-left: auto;
      background: var(--amber); color: #1a1408; border: 0; border-radius: 8px;
      padding: 10px 18px; font-weight: 800; font-size: 15px; cursor: pointer;
    }
    .submit:hover { background: var(--amber-2); }
    .submit:disabled { opacity: 0.6; cursor: progress; }
    .err { color: var(--danger); font-size: 14px; margin-top: 8px; min-height: 18px; }
    .filter { display: flex; align-items: center; gap: 10px; margin: 8px 4px 14px; }
    .filter label { color: var(--muted); font-size: 14px; }
    .feed-status { color: var(--muted); font-size: 14px; padding: 24px; text-align: center; }
    .q { display: block; color: inherit; }
    .q-head { display: flex; align-items: center; gap: 10px; font-size: 13px; color: var(--muted); margin-bottom: 8px; flex-wrap: wrap; }
    .q-author { color: var(--text); font-weight: 600; }
    .q-author.anon { color: var(--muted); font-style: italic; font-weight: 500; }
    .tag {
      display: inline-block; padding: 2px 10px; border-radius: 999px;
      background: rgba(245, 166, 35, 0.13); color: var(--amber);
      font-size: 12px; font-weight: 700; letter-spacing: 0.3px;
    }
    .q-body { color: var(--text); font-size: 16px; margin: 4px 0 12px; white-space: pre-wrap; word-break: break-word; }
    .q-foot { display: flex; align-items: center; gap: 14px; font-size: 14px; }
    .upvote {
      background: var(--panel-2); border: 1px solid var(--border); color: var(--text);
      padding: 6px 12px; border-radius: 8px; cursor: pointer; font: inherit;
      display: inline-flex; align-items: center; gap: 6px;
    }
    .upvote:hover { border-color: var(--amber); }
    .upvote.on { background: rgba(245, 166, 35, 0.15); border-color: var(--amber); color: var(--amber); }
    .upvote .arrow { font-weight: 800; }
    .upvoters {
      color: var(--muted); font-size: 13px; cursor: pointer; user-select: none;
      border-bottom: 1px dotted var(--muted);
    }
    .upvoters:hover { color: var(--text); }
    .upvoter-pop {
      display: none; margin-top: 8px; padding: 8px 12px;
      background: var(--panel-2); border: 1px solid var(--border); border-radius: 8px;
      font-size: 13px; color: var(--muted);
    }
    .upvoter-pop.on { display: block; }
    .answers-link { color: var(--muted); margin-left: auto; }
    .answers-link:hover { color: var(--amber); }
    .open-link { color: var(--amber); font-weight: 600; }
    @media (max-width: 540px) {
      main { padding: 14px 12px 60px; }
      .ask-row { gap: 8px; }
      .submit { margin-left: 0; width: 100%; }
    }
  </style>
</head>
<body>
  <header>
    <div class="brand">Ask the Room</div>
    <div class="hdr-right">
      <div class="who">Hi, <b>${escapeHtml(userName)}</b></div>
      <button id="bell" class="bell" type="button" title="Notifications">
        <span>Notifications</span>
        <span class="badge" id="bell-badge">0</span>
      </button>
      <button id="signout" class="signout" type="button">Sign out</button>
    </div>
  </header>

  <main>
    <section class="card ask">
      <h2>Ask the room</h2>
      <form id="ask-form">
        <textarea id="ask-body" maxlength="1000" placeholder="What do you wish someone would answer in 30 seconds?" required></textarea>
        <div class="ask-row">
          <select id="ask-tag">
            ${TAGS.map((t) => `<option value="${t}">${t}</option>`).join("")}
          </select>
          <label class="anon"><input type="checkbox" id="ask-anon" /> Post anonymously</label>
          <button id="ask-submit" class="submit" type="submit">Post question</button>
        </div>
        <div class="err" id="ask-err"></div>
      </form>
    </section>

    <div class="filter">
      <input id="search-input" type="search" placeholder="Search questions..." style="flex:1; min-width:160px; background: var(--bg); color: var(--text); border: 1px solid var(--border); border-radius: 8px; padding: 10px 12px; font: inherit;" />
      <label for="tag-filter">Filter:</label>
      <select id="tag-filter">
        <option value="">All tags</option>
        ${TAGS.map((t) => `<option value="${t}">${t}</option>`).join("")}
      </select>
      <label for="sort-by">Sort:</label>
      <select id="sort-by">
        <option value="newest">Newest</option>
        <option value="top">Most upvoted</option>
      </select>
    </div>

    <div id="feed" class="feed">
      <div class="feed-status">Loading questions…</div>
    </div>
  </main>

  <script>
    const TAGS = ${JSON.stringify(TAGS)};

    async function jsonFetch(url, opts = {}) {
      const r = await fetch(url, {
        credentials: "include",
        headers: { "content-type": "application/json", ...(opts.headers || {}) },
        ...opts,
      });
      const data = await r.json().catch(() => ({}));
      if (r.status === 401) { location.href = "/auth"; throw new Error("unauthorized"); }
      if (!r.ok) throw new Error(data.message || data.error || (r.status + " " + r.statusText));
      return data;
    }

    function escapeHtml(s) {
      return String(s == null ? "" : s)
        .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
    }

    function timeAgo(ts) {
      if (!ts) return "";
      const s = Math.max(1, Math.floor((Date.now() - ts) / 1000));
      if (s < 60) return s + "s ago";
      const m = Math.floor(s / 60); if (m < 60) return m + "m ago";
      const h = Math.floor(m / 60); if (h < 24) return h + "h ago";
      const d = Math.floor(h / 24); return d + "d ago";
    }

    const feedEl = document.getElementById("feed");
    const tagFilter = document.getElementById("tag-filter");
    const sortBy = document.getElementById("sort-by");
    const searchInput = document.getElementById("search-input");

    async function loadFeed() {
      const params = new URLSearchParams();
      if (tagFilter.value) params.set("tag", tagFilter.value);
      if (sortBy.value && sortBy.value !== "newest") params.set("sort", sortBy.value);
      const qv = searchInput.value.trim();
      if (qv) params.set("q", qv);
      const url = "/api/questions" + (params.toString() ? "?" + params.toString() : "");
      try {
        const items = await jsonFetch(url);
        renderFeed(Array.isArray(items) ? items : (items.questions || []));
      } catch (e) {
        feedEl.innerHTML = '<div class="feed-status">Could not load feed: ' + escapeHtml(e.message) + '</div>';
      }
    }

    // Debounced search: 300ms after last keystroke.
    let searchTimer = null;
    searchInput.addEventListener("input", () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(loadFeed, 300);
    });

    function renderFeed(items) {
      if (!items.length) {
        feedEl.innerHTML = '<div class="feed-status">No questions yet. Ask the first one.</div>';
        return;
      }
      feedEl.innerHTML = items.map((q) => {
        const isAnon = q.anonymous || q.author_name === "Anonymous";
        const author = isAnon
          ? '<span class="q-author anon">Anonymous</span>'
          : '<span class="q-author">' + escapeHtml(q.author_name || "Someone") + '</span>';
        const tag = q.tag ? '<span class="tag">' + escapeHtml(q.tag) + '</span>' : '';
        const upCount = q.upvote_count || 0;
        const ansCount = q.answer_count || 0;
        const upvoted = q.upvoted ? "on" : "";
        return ''
          + '<article class="card q" data-qid="' + escapeHtml(q.id) + '">'
          +   '<div class="q-head">'
          +     author + tag + '<span>' + timeAgo(q.created_at) + '</span>'
          +   '</div>'
          +   '<div class="q-body">' + escapeHtml(q.body) + '</div>'
          +   '<div class="q-foot">'
          +     '<button type="button" class="upvote ' + upvoted + '" data-act="upvote">'
          +       '<span class="arrow">&#9650;</span><span class="count">' + upCount + '</span>'
          +     '</button>'
          +     '<span class="upvoters" data-act="show-upvoters">who voted</span>'
          +     '<a class="answers-link" href="/q/' + encodeURIComponent(q.id) + '">'
          +       ansCount + ' answer' + (ansCount === 1 ? '' : 's')
          +     '</a>'
          +     '<a class="open-link" href="/q/' + encodeURIComponent(q.id) + '">Open &rarr;</a>'
          +   '</div>'
          +   '<div class="upvoter-pop" data-pop></div>'
          + '</article>';
      }).join("");
    }

    feedEl.addEventListener("click", async (ev) => {
      const card = ev.target.closest(".q");
      if (!card) return;
      const qid = card.getAttribute("data-qid");
      const upvoteBtn = ev.target.closest('[data-act="upvote"]');
      const showVoters = ev.target.closest('[data-act="show-upvoters"]');
      if (upvoteBtn) {
        ev.preventDefault();
        upvoteBtn.disabled = true;
        try {
          const res = await jsonFetch("/api/votes", {
            method: "POST", body: JSON.stringify({ question_id: qid }),
          });
          upvoteBtn.classList.toggle("on", !!res.upvoted);
          const c = upvoteBtn.querySelector(".count");
          if (c && typeof res.count === "number") c.textContent = res.count;
          // refresh popover if open
          const pop = card.querySelector("[data-pop]");
          if (pop && pop.classList.contains("on")) loadUpvoters(qid, pop);
        } catch (e) {
          alert(e.message);
        } finally { upvoteBtn.disabled = false; }
        return;
      }
      if (showVoters) {
        const pop = card.querySelector("[data-pop]");
        if (!pop) return;
        if (pop.classList.contains("on")) { pop.classList.remove("on"); return; }
        pop.classList.add("on");
        pop.textContent = "Loading…";
        loadUpvoters(qid, pop);
      }
    });

    async function loadUpvoters(qid, pop) {
      try {
        const data = await jsonFetch("/api/votes?question_id=" + encodeURIComponent(qid));
        const list = Array.isArray(data) ? data : (data.upvoters || []);
        if (!list.length) { pop.textContent = "No upvotes yet."; return; }
        pop.textContent = "Upvoted by: " + list.map((u) => u.user_name || "Someone").join(", ");
      } catch (e) {
        pop.textContent = "Could not load: " + e.message;
      }
    }

    tagFilter.addEventListener("change", loadFeed);
    sortBy.addEventListener("change", loadFeed);

    const askForm = document.getElementById("ask-form");
    const askErr = document.getElementById("ask-err");
    const askBtn = document.getElementById("ask-submit");
    askForm.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      askErr.textContent = "";
      const body = document.getElementById("ask-body").value.trim();
      const tag = document.getElementById("ask-tag").value;
      const anonymous = document.getElementById("ask-anon").checked;
      if (!body) { askErr.textContent = "Question can't be empty."; return; }
      askBtn.disabled = true;
      try {
        await jsonFetch("/api/questions", {
          method: "POST", body: JSON.stringify({ body, tag, anonymous }),
        });
        document.getElementById("ask-body").value = "";
        document.getElementById("ask-anon").checked = false;
        await loadFeed();
      } catch (e) {
        askErr.textContent = e.message;
      } finally { askBtn.disabled = false; }
    });

    // Notifications
    const bell = document.getElementById("bell");
    const badge = document.getElementById("bell-badge");
    let lastNotifCount = 0;

    async function pollNotifications() {
      try {
        const data = await jsonFetch("/api/answers/notifications");
        const list = Array.isArray(data) ? data : (data.notifications || []);
        const n = list.length;
        lastNotifCount = n;
        if (n > 0) { badge.textContent = String(n); badge.classList.add("on"); }
        else { badge.classList.remove("on"); }
      } catch (_) { /* silent */ }
    }
    bell.addEventListener("click", async () => {
      if (lastNotifCount === 0) return;
      try {
        await jsonFetch("/api/answers/notifications/read", { method: "POST", body: "{}" });
      } catch (_) {}
      lastNotifCount = 0;
      badge.classList.remove("on");
    });

    // Sign out
    document.getElementById("signout").addEventListener("click", async () => {
      try { await jsonFetch("/api/auth/sign-out", { method: "POST", body: "{}" }); }
      catch (_) {}
      location.href = "/auth";
    });

    loadFeed();
    pollNotifications();
    setInterval(pollNotifications, 10000);
    // Auto-refresh feed every 30s. Skip if the user is typing in the ask textarea
    // or has any vote/popover panel open (which can be open from a tap).
    setInterval(() => {
      const askingActive = document.activeElement === document.getElementById("ask-body");
      const popoverOpen = feedEl.querySelector(".upvoter-pop.on");
      if (askingActive || popoverOpen) return;
      loadFeed();
    }, 30000);
  </script>
</body>
</html>`;

app.get("/", (c) => {
  const session = c.get("session");
  if (!session) return c.redirect("/auth");
  const userName = session.user?.name || session.user?.email || "founder";
  return c.html(layout(userName));
});

export default app;
