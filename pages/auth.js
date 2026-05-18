// Auth page: sign-up + sign-in.
// Owner: frontend-1
// Default tab = SIGN UP. Errors show server `data.message`. Redirect to /home.

import { Hono } from "hono";

const app = new Hono();

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Ask the Room — Sign up</title>
<style>
  :root {
    --bg: #0e0f12;
    --panel: #16181d;
    --panel-2: #1d2027;
    --text: #f4f4f5;
    --muted: #9aa0a6;
    --border: #2a2e36;
    --accent: #f59e0b;
    --accent-2: #fbbf24;
    --accent-ink: #1a1206;
    --error: #ef4444;
    --error-bg: #2b1517;
  }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: var(--bg); color: var(--text);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Roboto, sans-serif;
    -webkit-font-smoothing: antialiased; min-height: 100vh; }
  .wrap {
    min-height: 100vh; display: flex; align-items: center; justify-content: center;
    padding: 32px 20px;
    background: radial-gradient(1100px 600px at 50% -10%, rgba(245, 158, 11, 0.10), transparent 60%);
  }
  .card {
    width: 100%; max-width: 440px;
    background: var(--panel); border: 1px solid var(--border); border-radius: 16px;
    padding: 32px; box-shadow: 0 20px 60px rgba(0,0,0,0.35);
  }
  .brand { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; }
  .brand-dot { width: 12px; height: 12px; border-radius: 50%; background: var(--accent);
    box-shadow: 0 0 16px rgba(245,158,11,0.7); }
  .brand-name { font-size: 14px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--muted); }
  h1 { font-size: 26px; margin: 6px 0 4px; font-weight: 650; letter-spacing: -0.01em; }
  .sub { color: var(--muted); margin: 0 0 22px; font-size: 14px; }
  .tabs { display: flex; gap: 6px; background: var(--panel-2); padding: 4px; border-radius: 10px;
    border: 1px solid var(--border); margin-bottom: 20px; }
  .tab {
    flex: 1; background: transparent; border: 0; color: var(--muted);
    padding: 10px 14px; font-size: 14px; font-weight: 600; letter-spacing: 0.01em;
    border-radius: 7px; cursor: pointer; transition: background 0.15s, color 0.15s;
  }
  .tab.active { background: var(--accent); color: var(--accent-ink); }
  .tab:not(.active):hover { color: var(--text); }
  form { display: flex; flex-direction: column; gap: 14px; }
  label { font-size: 13px; color: var(--muted); display: block; margin-bottom: 6px; }
  input {
    width: 100%; background: var(--panel-2); border: 1px solid var(--border);
    color: var(--text); font-size: 15px; padding: 12px 14px; border-radius: 9px;
    outline: none; transition: border-color 0.15s, box-shadow 0.15s;
    font-family: inherit;
  }
  input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(245,158,11,0.18); }
  button.submit {
    margin-top: 4px;
    background: var(--accent); color: var(--accent-ink);
    border: 0; padding: 13px 16px; font-size: 15px; font-weight: 700;
    border-radius: 9px; cursor: pointer; transition: background 0.15s, transform 0.05s;
  }
  button.submit:hover { background: var(--accent-2); }
  button.submit:active { transform: translateY(1px); }
  button.submit:disabled { opacity: 0.6; cursor: not-allowed; }
  .error {
    display: none; background: var(--error-bg); border: 1px solid rgba(239,68,68,0.4);
    color: #fecaca; padding: 10px 12px; border-radius: 9px; font-size: 13.5px;
  }
  .error.show { display: block; }
  .footer { text-align: center; margin-top: 18px; color: var(--muted); font-size: 12px; }
  .footer a { color: var(--accent-2); text-decoration: none; }
  .field-row.hidden { display: none; }
</style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <div class="brand">
        <span class="brand-dot"></span>
        <span class="brand-name">Ask the Room</span>
      </div>
      <h1 id="title">Create your account</h1>
      <p class="sub" id="subtitle">Join the room. Ask, upvote, answer.</p>

      <div class="tabs" role="tablist">
        <button class="tab active" id="tab-signup" type="button" role="tab">Sign up</button>
        <button class="tab" id="tab-signin" type="button" role="tab">Sign in</button>
      </div>

      <div class="error" id="error" role="alert"></div>

      <form id="auth-form" autocomplete="on" novalidate>
        <div class="field-row" id="row-name">
          <label for="name">Your name</label>
          <input id="name" name="name" type="text" autocomplete="name" placeholder="Jane Founder" />
        </div>
        <div class="field-row">
          <label for="email">Email</label>
          <input id="email" name="email" type="email" autocomplete="email" required placeholder="you@startup.co" />
        </div>
        <div class="field-row">
          <label for="password">Password</label>
          <input id="password" name="password" type="password" autocomplete="current-password" required minlength="8" placeholder="At least 8 characters" />
        </div>
        <button class="submit" type="submit" id="submit-btn">Create account</button>
      </form>

      <div class="footer">Live at Seed the South 2026 &middot; <a href="/">home</a></div>
    </div>
  </div>

<script>
(function () {
  var mode = "signup";
  var formEl = document.getElementById("auth-form");
  var errEl = document.getElementById("error");
  var btnEl = document.getElementById("submit-btn");
  var titleEl = document.getElementById("title");
  var subtitleEl = document.getElementById("subtitle");
  var tabSignup = document.getElementById("tab-signup");
  var tabSignin = document.getElementById("tab-signin");
  var rowName = document.getElementById("row-name");
  var nameEl = document.getElementById("name");
  var emailEl = document.getElementById("email");
  var passEl = document.getElementById("password");

  function showError(msg) {
    errEl.textContent = msg;
    errEl.classList.add("show");
  }
  function clearError() {
    errEl.textContent = "";
    errEl.classList.remove("show");
  }

  function setMode(next) {
    mode = next;
    clearError();
    if (mode === "signup") {
      tabSignup.classList.add("active");
      tabSignin.classList.remove("active");
      rowName.classList.remove("hidden");
      titleEl.textContent = "Create your account";
      subtitleEl.textContent = "Join the room. Ask, upvote, answer.";
      btnEl.textContent = "Create account";
      passEl.setAttribute("autocomplete", "new-password");
      nameEl.setAttribute("required", "required");
    } else {
      tabSignin.classList.add("active");
      tabSignup.classList.remove("active");
      rowName.classList.add("hidden");
      titleEl.textContent = "Welcome back";
      subtitleEl.textContent = "Sign in to ask, upvote, and answer.";
      btnEl.textContent = "Sign in";
      passEl.setAttribute("autocomplete", "current-password");
      nameEl.removeAttribute("required");
    }
  }

  tabSignup.addEventListener("click", function () { setMode("signup"); });
  tabSignin.addEventListener("click", function () { setMode("signin"); });

  async function jsonFetch(url, body) {
    var res = await fetch(url, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body || {}),
    });
    var data = null;
    try { data = await res.json(); } catch (_) { data = null; }
    return { ok: res.ok, status: res.status, data: data };
  }

  function extractError(result) {
    var d = result && result.data;
    if (d) {
      if (typeof d.message === "string" && d.message.length) return d.message;
      if (d.error) {
        if (typeof d.error === "string") return d.error;
        if (typeof d.error.message === "string") return d.error.message;
        if (typeof d.error.code === "string") return d.error.code;
      }
      if (typeof d.code === "string" && d.code.length) return d.code + " (HTTP " + result.status + ")";
    }
    return "Request failed (HTTP " + (result ? result.status : "?") + ")";
  }

  formEl.addEventListener("submit", async function (ev) {
    ev.preventDefault();
    clearError();
    var email = (emailEl.value || "").trim();
    var password = passEl.value || "";
    var name = (nameEl.value || "").trim();

    if (!email) { showError("Email is required."); return; }
    if (!password || password.length < 8) { showError("Password must be at least 8 characters."); return; }
    if (mode === "signup" && !name) { showError("Please enter your name."); return; }

    btnEl.disabled = true;
    var originalLabel = btnEl.textContent;
    btnEl.textContent = mode === "signup" ? "Creating account..." : "Signing in...";

    try {
      var result;
      if (mode === "signup") {
        result = await jsonFetch("/api/auth/sign-up/email", {
          email: email,
          password: password,
          name: name,
        });
      } else {
        result = await jsonFetch("/api/auth/sign-in/email", {
          email: email,
          password: password,
        });
      }

      if (!result.ok) {
        showError(extractError(result));
        btnEl.disabled = false;
        btnEl.textContent = originalLabel;
        return;
      }

      // Success. better-auth sets the session cookie; autoSignIn is on for signup.
      window.location.assign("/home");
    } catch (err) {
      showError((err && err.message) ? err.message : "Network error. Try again.");
      btnEl.disabled = false;
      btnEl.textContent = originalLabel;
    }
  });

  // Workshop rule: land on SIGN UP.
  setMode("signup");
})();
</script>
</body>
</html>`;

app.get("/", (c) => c.html(html));

export default app;
