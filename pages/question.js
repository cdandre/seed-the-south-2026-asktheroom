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
import { escapeHtml as escape } from "../utils.js";

const app = new Hono();

const layout = (title, body) => `<!DOCTYPE html><html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escape(title)} — Ask the Room</title>
<meta name="description" content="A crowdsourced Q&amp;A app for founders. Built live at Seed the South 2026 by AI agents." />
<meta property="og:title" content="${escape(title)} — Ask the Room" />
<meta property="og:description" content="Crowdsourced Q&amp;A for founders. Built live at Seed the South 2026 by AI agents." />
<meta property="og:type" content="article" />
<meta name="twitter:card" content="summary" />
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
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
         margin: 0; background: var(--bg); color: var(--text); line-height: 1.5;
         font-size: 17px; }
  a { color: var(--amber); text-decoration: none; }
  .wrap { max-width: 720px; margin: 0 auto; padding: 16px; }
  header { display: flex; align-items: center; justify-content: space-between;
           padding: 14px 0 20px; border-bottom: 1px solid var(--border); margin-bottom: 22px; }
  header a.back {
    color: var(--muted); text-decoration: none; font-size: 15px;
    padding: 12px 8px 12px 4px; min-height: 44px;
    display: inline-flex; align-items: center;
  }
  header a.back:hover { color: var(--text); }
  header .brand { font-weight: 800; font-size: 20px; color: var(--amber); letter-spacing: 0.2px; }
  .card { background: var(--panel); border: 1px solid var(--border); border-radius: 12px;
          padding: 18px; margin-bottom: 16px; }
  .meta { display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
          color: var(--muted); font-size: 13px; margin-bottom: 10px; }
  .author { font-weight: 600; color: var(--text); }
  .author.anon { color: var(--muted); font-style: italic; font-weight: 500; }
  .tag { display: inline-block; padding: 2px 10px; border-radius: 999px;
         background: rgba(245, 166, 35, 0.13); color: var(--amber);
         font-size: 12px; font-weight: 700; letter-spacing: 0.3px; }
  .qbody { font-size: 19px; line-height: 1.45; white-space: pre-wrap; word-wrap: break-word;
           color: var(--text); }
  .vote-row { display: flex; align-items: center; gap: 14px; margin-top: 16px;
              padding-top: 14px; border-top: 1px solid var(--border); }
  .vote-btn { background: var(--panel-2); border: 1px solid var(--border); color: var(--text);
              padding: 8px 16px; border-radius: 8px; font-weight: 600; cursor: pointer;
              font-size: 15px; transition: all 0.15s; display: inline-flex; align-items: center; gap: 6px;
              min-width: 110px; min-height: 44px; justify-content: center; }
  .vote-btn:hover { border-color: var(--amber); }
  .vote-btn.upvoted { background: rgba(245, 166, 35, 0.15); border-color: var(--amber); color: var(--amber); }
  .vote-count { font-weight: 600; font-size: 14px; cursor: pointer; user-select: none;
                color: var(--muted); border-bottom: 1px dotted var(--muted); }
  .vote-count:hover { color: var(--text); }
  .upvoters { margin-top: 12px; padding: 10px 12px; background: var(--panel-2);
              border: 1px solid var(--border); border-radius: 8px;
              font-size: 13px; color: var(--muted); }
  .upvoters.hidden { display: none; }
  .upvoters strong { color: var(--text); }
  h2.answers-head { font-size: 16px; margin: 24px 0 12px; color: var(--amber);
                    font-weight: 700; letter-spacing: 0.3px; text-transform: uppercase; }
  .answer { background: var(--panel); border: 1px solid var(--border); border-radius: 10px;
            padding: 14px 16px; margin-bottom: 10px; }
  .answer .meta { margin-bottom: 6px; }
  .answer-body { white-space: pre-wrap; word-wrap: break-word; font-size: 15px; color: var(--text); }
  .empty { color: var(--muted); font-style: italic; padding: 14px; text-align: center; }
  .empty.first { color: var(--amber); }
  .accept-btn {
    min-height: 44px; font-size: 14px !important; padding: 10px 16px !important;
  }
  .ans-vote-btn {
    min-height: 44px; min-width: 120px; font-size: 14px !important; padding: 10px 14px !important;
    justify-content: center;
  }
  .form-card textarea { width: 100%; min-height: 100px; padding: 12px;
                        background: var(--bg); color: var(--text);
                        border: 1px solid var(--border); border-radius: 8px;
                        font: inherit; font-size: 16px; resize: vertical; }
  .form-card textarea:focus { outline: 2px solid var(--amber); border-color: var(--amber); }
  .form-foot { display: flex; justify-content: space-between; align-items: center;
               margin-top: 8px; }
  .counter { font-size: 12px; color: var(--muted); }
  .counter.over { color: var(--danger); font-weight: 600; }
  button.submit { background: var(--amber); color: #1a1408; border: 0; padding: 10px 20px;
                  border-radius: 8px; font-weight: 800; cursor: pointer; font-size: 15px; }
  button.submit:hover { background: var(--amber-2); }
  button.submit:disabled { opacity: 0.6; cursor: not-allowed; }
  .err { color: var(--danger); font-size: 14px; margin-top: 8px; }
  .signin-prompt { text-align: center; padding: 18px; color: var(--muted); }
  .signin-prompt a { color: var(--amber); font-weight: 600; }
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
  const currentUserId = session?.user?.id || null;

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
    const CURRENT_USER_ID = ${JSON.stringify(currentUserId)};

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
          '<button id="votebtn" class="vote-btn' + (myVote ? ' upvoted' : '') + '"' +
            ' aria-label="Upvote question (' + count + ' upvote' + (count === 1 ? '' : 's') + ')"' +
            ' aria-pressed="' + (myVote ? 'true' : 'false') + '">' +
            '▲ ' + count +
          '</button>' +
          '<span class="vote-count" id="vcount" title="Tap to see who upvoted">' +
            count + ' upvote' + (count === 1 ? '' : 's') +
          '</span>' +
          '<span id="verr" class="err" style="margin-top: 0; margin-left: auto;"></span>' +
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
      const errEl = document.getElementById('verr');
      if (errEl) errEl.textContent = '';
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
        const errEl2 = document.getElementById('verr');
        if (errEl2) errEl2.textContent = e.message || 'Vote failed';
      } finally {
        const b = document.getElementById('votebtn');
        if (b) b.disabled = false;
      }
    }

    function renderAnswers(list) {
      const root = document.getElementById('answers');
      if (!list || list.length === 0) {
        root.innerHTML = '<div class="empty first">No answers yet. Be the first.</div>';
        return;
      }
      // Trust server ordering (accepted first, then upvote_count DESC, then created_at ASC).
      const acceptedId = qState && qState.accepted_answer_id;
      const isAsker = !!CURRENT_USER_ID && qState && qState.author_id === CURRENT_USER_ID;
      root.innerHTML = list.map(a => {
        const name = a.author_name || 'Someone';
        const isAccepted = a.id === acceptedId;
        const upCount = Number(a.upvote_count) || 0;
        const upvoted = !!a.user_upvoted;
        const acceptBadge = isAccepted
          ? '<span style="background: rgba(46, 204, 113, 0.18); color: #2ecc71; padding: 2px 10px; border-radius: 999px; font-size: 12px; font-weight: 700; letter-spacing: 0.3px;">&check; Accepted</span>'
          : '';
        const acceptBtn = (isAsker && !isAccepted)
          ? '<button class="accept-btn" data-aid="' + esc(a.id) + '" style="background: var(--panel-2); border: 1px solid var(--border); color: var(--muted); border-radius: 8px; cursor: pointer;">Accept this answer</button>'
          : (isAsker && isAccepted)
            ? '<button class="accept-btn unaccept-btn" data-aid="' + esc(a.id) + '" style="background: transparent; border: 1px solid var(--border); color: var(--muted); border-radius: 8px; cursor: pointer;">Unaccept</button>'
            : '';
        const upvoteBtn =
          '<button class="ans-vote-btn vote-btn' + (upvoted ? ' upvoted' : '') + '" data-aid="' + esc(a.id) + '"' +
            ' aria-label="Upvote answer (' + upCount + ' upvote' + (upCount === 1 ? '' : 's') + ')"' +
            ' aria-pressed="' + (upvoted ? 'true' : 'false') + '">' +
            '▲ ' + upCount +
          '</button>' +
          '<span class="ans-vote-count" data-aid="' + esc(a.id) + '" style="font-size: 14px; color: var(--muted); margin-left: 8px;">' +
            'upvote' + (upCount === 1 ? '' : 's') +
          '</span>' +
          '<span class="err" data-ans-err="' + esc(a.id) + '" style="margin-top: 0; margin-left: 8px; min-height: 0;"></span>';
        return '<div class="answer"' + (isAccepted ? ' style="border-color: rgba(46, 204, 113, 0.35);"' : '') + '>' +
          '<div class="meta">' +
            '<span class="author">' + esc(name) + '</span>' +
            '<span>' + esc(fmtTime(a.created_at)) + '</span>' +
            acceptBadge +
          '</div>' +
          '<div class="answer-body">' + esc(a.body || a.text || '') + '</div>' +
          '<div style="margin-top: 12px; display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">' +
            upvoteBtn +
            (acceptBtn ? '<span style="flex: 1;"></span>' + acceptBtn : '') +
          '</div>' +
        '</div>';
      }).join('');

      // Wire up accept / unaccept buttons.
      root.querySelectorAll('.accept-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const aid = btn.getAttribute('data-aid');
          const unaccepting = btn.classList.contains('unaccept-btn');
          const errEl = root.querySelector('[data-ans-err="' + (window.CSS && CSS.escape ? CSS.escape(aid) : aid) + '"]');
          if (errEl) errEl.textContent = '';
          btn.disabled = true;
          try {
            await jsonFetch('/api/answers/' + encodeURIComponent(aid) + '/accept', {
              method: 'POST',
              body: JSON.stringify(unaccepting ? { unaccept: true } : {}),
            });
            // Reload question + answers to reflect new accepted state.
            const q = await jsonFetch('/api/questions/' + encodeURIComponent(QID));
            renderQuestion(q);
            const a = await jsonFetch('/api/answers?question_id=' + encodeURIComponent(QID));
            renderAnswers(Array.isArray(a) ? a : (a.answers || []));
          } catch (e) {
            if (errEl) errEl.textContent = e.message || 'Accept failed';
            btn.disabled = false;
          }
        });
      });

      // Wire up per-answer upvote buttons.
      root.querySelectorAll('.ans-vote-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          if (!SIGNED_IN) {
            location.href = '/auth?from=/q/' + encodeURIComponent(QID);
            return;
          }
          const aid = btn.getAttribute('data-aid');
          const errEl = root.querySelector('[data-ans-err="' + (window.CSS && CSS.escape ? CSS.escape(aid) : aid) + '"]');
          if (errEl) errEl.textContent = '';
          btn.disabled = true;
          try {
            const r = await jsonFetch('/api/votes/answer', {
              method: 'POST',
              body: JSON.stringify({ answer_id: aid }),
            });
            // Reload answers — order may change (top-voted bubbles up).
            const a = await jsonFetch('/api/answers?question_id=' + encodeURIComponent(QID));
            renderAnswers(Array.isArray(a) ? a : (a.answers || []));
          } catch (e) {
            if (e.status === 401) {
              location.href = '/auth?from=/q/' + encodeURIComponent(QID);
              return;
            }
            if (errEl) errEl.textContent = e.message || 'Upvote failed';
            btn.disabled = false;
          }
        });
      });
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
