// Question detail page: /q/:id
// Owner: frontend-3
//
// Endpoints used:
//   GET  /api/questions/:id          -> { id, body, tag, anonymous, author_name,
//                                         created_at, upvote_count, answer_count,
//                                         upvoters: [{ user_id, user_name }] }
//   GET  /api/answers?question_id=:id -> [{ id, question_id, author_name, body, created_at }]
//   POST /api/votes  { question_id } -> { upvoted, count }
//   POST /api/answers { question_id, body } -> created answer
//   POST /api/answers/notifications/read    -> clear my badge on load

import { Hono } from "hono";

const app = new Hono();

const escape = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[c]);

const layout = (title, body) => `<!DOCTYPE html><html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escape(title)} — Ask the Room</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
         margin: 0; background: #f7f7f5; color: #1a1a1a; line-height: 1.5; }
  .wrap { max-width: 720px; margin: 0 auto; padding: 16px; }
  header { display: flex; align-items: center; justify-content: space-between; padding: 12px 0 20px; }
  header a.back { color: #4a4a4a; text-decoration: none; font-size: 15px; }
  header a.back:hover { color: #000; }
  header .brand { font-weight: 700; font-size: 18px; }
  .card { background: #fff; border: 1px solid #e2e2dc; border-radius: 12px; padding: 18px;
          box-shadow: 0 1px 2px rgba(0,0,0,0.03); margin-bottom: 16px; }
  .meta { display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
          color: #6a6a6a; font-size: 13px; margin-bottom: 10px; }
  .author { font-weight: 600; color: #1a1a1a; }
  .author.anon { color: #8a8a8a; font-style: italic; font-weight: 500; }
  .tag { background: #eef3ff; color: #2c4fb8; padding: 2px 10px; border-radius: 999px;
         font-size: 12px; font-weight: 600; }
  .qbody { font-size: 19px; line-height: 1.45; white-space: pre-wrap; word-wrap: break-word; }
  .vote-row { display: flex; align-items: center; gap: 12px; margin-top: 16px;
              padding-top: 14px; border-top: 1px solid #f0efeb; }
  .vote-btn { background: #fff; border: 1.5px solid #2c4fb8; color: #2c4fb8;
              padding: 8px 16px; border-radius: 999px; font-weight: 600; cursor: pointer;
              font-size: 15px; transition: all 0.15s; }
  .vote-btn:hover { background: #eef3ff; }
  .vote-btn.upvoted { background: #2c4fb8; color: #fff; }
  .vote-count { font-weight: 700; font-size: 16px; cursor: pointer; user-select: none; }
  .vote-count:hover { text-decoration: underline; }
  .upvoters { margin-top: 12px; padding: 10px 12px; background: #f7f7f5;
              border-radius: 8px; font-size: 13px; color: #4a4a4a; }
  .upvoters.hidden { display: none; }
  .upvoters strong { color: #1a1a1a; }
  h2.answers-head { font-size: 16px; margin: 24px 0 12px; color: #4a4a4a; font-weight: 600; }
  .answer { background: #fff; border: 1px solid #e2e2dc; border-radius: 10px;
            padding: 14px 16px; margin-bottom: 10px; }
  .answer .meta { margin-bottom: 6px; }
  .answer-body { white-space: pre-wrap; word-wrap: break-word; font-size: 15px; }
  .empty { color: #8a8a8a; font-style: italic; padding: 14px; text-align: center; }
  .form-card textarea { width: 100%; min-height: 100px; padding: 12px;
                        border: 1px solid #d4d4ce; border-radius: 8px; font: inherit;
                        font-size: 15px; resize: vertical; }
  .form-card textarea:focus { outline: none; border-color: #2c4fb8; }
  .form-foot { display: flex; justify-content: space-between; align-items: center;
               margin-top: 8px; }
  .counter { font-size: 12px; color: #8a8a8a; }
  .counter.over { color: #c83434; font-weight: 600; }
  button.submit { background: #2c4fb8; color: #fff; border: 0; padding: 10px 20px;
                  border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 15px; }
  button.submit:hover { background: #1f3a8c; }
  button.submit:disabled { background: #b4b4b0; cursor: not-allowed; }
  .err { color: #c83434; font-size: 14px; margin-top: 8px; }
  .signin-prompt { text-align: center; padding: 18px; color: #4a4a4a; }
  .signin-prompt a { color: #2c4fb8; font-weight: 600; }
</style>
</head><body>
<div class="wrap">
  <header>
    <a class="back" href="/home">&larr; Back to feed</a>
    <span class="brand">Ask the Room</span>
  </header>
  ${body}
</div>
</body></html>`;

app.get("/:id", async (c) => {
  const id = c.req.param("id");
  const session = c.get("session");
  const signedIn = !!session;

  const body = `
  <div id="qcard" class="card"><div class="empty">Loading question...</div></div>
  <h2 class="answers-head">Answers</h2>
  <div id="answers"><div class="empty">Loading answers...</div></div>
  ${
    signedIn
      ? `<div class="card form-card">
           <div style="font-weight:600;margin-bottom:8px;">Your answer</div>
           <textarea id="atext" maxlength="1000" placeholder="30 seconds of wisdom..."></textarea>
           <div class="form-foot">
             <button class="submit" id="asubmit">Post answer</button>
             <span class="counter" id="counter">0 / 1000</span>
           </div>
           <div class="err" id="aerr"></div>
         </div>`
      : `<div class="card signin-prompt">
           <a href="/auth?from=/q/${escape(id)}">Sign in to upvote or answer</a>
         </div>`
  }
  <script>
    const QID = ${JSON.stringify(id)};
    const SIGNED_IN = ${signedIn ? "true" : "false"};

    async function jsonFetch(url, opts = {}) {
      const r = await fetch(url, {
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        ...opts,
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        const err = new Error(data.message || data.error || ('HTTP ' + r.status));
        err.status = r.status;
        throw err;
      }
      return data;
    }

    function esc(s) {
      return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({
        '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
      })[c]);
    }

    function fmtTime(ts) {
      if (!ts) return '';
      const d = new Date(typeof ts === 'number' ? ts : Date.parse(ts));
      const now = Date.now();
      const diff = now - d.getTime();
      if (diff < 60_000) return 'just now';
      if (diff < 3_600_000) return Math.floor(diff / 60_000) + 'm ago';
      if (diff < 86_400_000) return Math.floor(diff / 3_600_000) + 'h ago';
      return d.toLocaleDateString();
    }

    let qState = null;
    let myVote = false;

    function renderQuestion(q) {
      qState = q;
      const upvoters = q.upvoters || (q.upvoter_names ? q.upvoter_names.map(n => ({ user_name: n })) : []);
      const count = q.upvote_count != null ? q.upvote_count : upvoters.length;
      const authorClass = q.anonymous ? 'author anon' : 'author';
      const authorName = q.anonymous ? 'Anonymous' : (q.author_name || 'Anonymous');
      const html =
        '<div class="meta">' +
          '<span class="' + authorClass + '">' + esc(authorName) + '</span>' +
          (q.tag ? '<span class="tag">' + esc(q.tag) + '</span>' : '') +
          '<span>' + esc(fmtTime(q.created_at)) + '</span>' +
        '</div>' +
        '<div class="qbody">' + esc(q.body || q.text || '') + '</div>' +
        '<div class="vote-row">' +
          '<button id="votebtn" class="vote-btn' + (myVote ? ' upvoted' : '') + '">' +
            (myVote ? 'Upvoted' : 'Upvote') +
          '</button>' +
          '<span class="vote-count" id="vcount" title="Tap to see who upvoted">' +
            count + ' upvote' + (count === 1 ? '' : 's') +
          '</span>' +
        '</div>' +
        '<div id="upvoters" class="upvoters hidden"></div>';
      document.getElementById('qcard').innerHTML = html;

      document.getElementById('votebtn').addEventListener('click', toggleVote);
      document.getElementById('vcount').addEventListener('click', toggleUpvoters);
      renderUpvoters(upvoters);
    }

    function renderUpvoters(list) {
      const el = document.getElementById('upvoters');
      if (!el) return;
      if (!list || list.length === 0) {
        el.innerHTML = '<em>No upvotes yet.</em>';
      } else {
        el.innerHTML = '<strong>Upvoted by:</strong> ' +
          list.map(u => esc(u.user_name || u.name || 'Someone')).join(', ');
      }
    }

    function toggleUpvoters() {
      const el = document.getElementById('upvoters');
      el.classList.toggle('hidden');
    }

    async function toggleVote() {
      if (!SIGNED_IN) {
        location.href = '/auth?from=/q/' + encodeURIComponent(QID);
        return;
      }
      const btn = document.getElementById('votebtn');
      btn.disabled = true;
      try {
        const r = await jsonFetch('/api/votes', {
          method: 'POST',
          body: JSON.stringify({ question_id: QID }),
        });
        myVote = !!r.upvoted;
        // Refresh question to get new count + upvoter list.
        const q = await jsonFetch('/api/questions/' + encodeURIComponent(QID));
        renderQuestion(q);
      } catch (e) {
        if (e.status === 401) {
          location.href = '/auth?from=/q/' + encodeURIComponent(QID);
          return;
        }
        alert(e.message || 'Vote failed');
      } finally {
        const b = document.getElementById('votebtn');
        if (b) b.disabled = false;
      }
    }

    function renderAnswers(list) {
      const root = document.getElementById('answers');
      if (!list || list.length === 0) {
        root.innerHTML = '<div class="empty">No answers yet. Be the first.</div>';
        return;
      }
      root.innerHTML = list.map(a => {
        const anon = a.anonymous;
        const cls = anon ? 'author anon' : 'author';
        const name = anon ? 'Anonymous' : (a.author_name || 'Anonymous');
        return '<div class="answer">' +
          '<div class="meta">' +
            '<span class="' + cls + '">' + esc(name) + '</span>' +
            '<span>' + esc(fmtTime(a.created_at)) + '</span>' +
          '</div>' +
          '<div class="answer-body">' + esc(a.body || a.text || '') + '</div>' +
        '</div>';
      }).join('');
    }

    async function loadAll() {
      try {
        const q = await jsonFetch('/api/questions/' + encodeURIComponent(QID));
        // Try to detect if current user upvoted by checking upvoters list against session.
        // Backend may also return q.user_upvoted; respect that if present.
        if (q.user_upvoted != null) myVote = !!q.user_upvoted;
        renderQuestion(q);
      } catch (e) {
        document.getElementById('qcard').innerHTML =
          '<div class="empty">Could not load question: ' + esc(e.message) + '</div>';
      }
      try {
        const a = await jsonFetch('/api/answers?question_id=' + encodeURIComponent(QID));
        renderAnswers(Array.isArray(a) ? a : (a.answers || []));
      } catch (e) {
        document.getElementById('answers').innerHTML =
          '<div class="empty">Could not load answers: ' + esc(e.message) + '</div>';
      }
      // Clear notifications badge for the asker.
      if (SIGNED_IN) {
        fetch('/api/answers/notifications/read', {
          method: 'POST',
          credentials: 'include',
          headers: { 'content-type': 'application/json' },
        }).catch(() => {});
      }
    }

    if (SIGNED_IN) {
      const ta = document.getElementById('atext');
      const ctr = document.getElementById('counter');
      const sub = document.getElementById('asubmit');
      const err = document.getElementById('aerr');
      ta.addEventListener('input', () => {
        const n = ta.value.length;
        ctr.textContent = n + ' / 1000';
        ctr.classList.toggle('over', n > 1000);
        sub.disabled = n === 0 || n > 1000;
      });
      sub.addEventListener('click', async () => {
        const text = ta.value.trim();
        if (!text) return;
        err.textContent = '';
        sub.disabled = true;
        try {
          await jsonFetch('/api/answers', {
            method: 'POST',
            body: JSON.stringify({ question_id: QID, body: text }),
          });
          ta.value = '';
          ctr.textContent = '0 / 1000';
          // Reload answers.
          const a = await jsonFetch('/api/answers?question_id=' + encodeURIComponent(QID));
          renderAnswers(Array.isArray(a) ? a : (a.answers || []));
        } catch (e) {
          if (e.status === 401) {
            location.href = '/auth?from=/q/' + encodeURIComponent(QID);
            return;
          }
          err.textContent = e.message || 'Failed to post answer';
        } finally {
          sub.disabled = false;
        }
      });
    }

    loadAll();
  </script>
  `;

  return c.html(layout("Question", body));
});

export default app;
