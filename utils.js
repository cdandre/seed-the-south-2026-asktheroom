// Server-side helpers shared across routes + pages.
// Client-side equivalents inside <script> blocks stay separate — different runtime.

export function jsonError(c, status, message) {
  return c.json({ message }, status);
}

export function newId() {
  return crypto.randomUUID();
}

export function escapeHtml(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Shared dark-theme tokens + base resets used by pages/home.js and pages/question.js.
// Interpolated into each page's <style> block BEFORE page-specific styles.
// NOTE: pages/auth.js uses a DIFFERENT palette (--accent, different --bg) — do not apply there.
// pages/about.js uses the same tokens but a narrower subset (no .card/.tag rules) — left untouched.
export function sharedDarkStyles() {
  return `
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
      font-size: 17px; line-height: 1.45; overflow-x: hidden; }
    a { color: var(--amber); text-decoration: none; }
    .card {
      background: var(--panel); border: 1px solid var(--border); border-radius: 12px;
      padding: 16px; margin-bottom: 16px;
    }
    .tag {
      display: inline-block; padding: 2px 10px; border-radius: 999px;
      background: rgba(245, 166, 35, 0.13); color: var(--amber);
      font-size: 12px; font-weight: 700; letter-spacing: 0.3px;
    }
  `;
}

// Shared client-side renderMarkdown source. Interpolated as raw JS into each page's
// inline <script> block. String.raw preserves the regex backslashes verbatim so the
// rendered <script> contains \b, \n, \w etc. as single-backslash escape sequences —
// matching exactly what the previous template-literal-escaped inline copies produced.
//
// Safe-by-construction: input is ALREADY HTML-escaped. Tiny allowlist only —
// bold (double asterisk), italic (single asterisk), http(s) URLs, single newline -> br,
// double newline -> two brs. No markdown link syntax, no bullets, no headers, no code,
// no raw HTML.
export function markdownRendererSource() {
  return String.raw`
    function renderMarkdown(escapedText) {
      if (escapedText == null) return "";
      let s = String(escapedText);
      // 1. URLs first (so bold/italic markers inside URLs do not get matched).
      s = s.replace(/\bhttps?:\/\/[^\s<*]+/g, (url) => {
        // Strip trailing punctuation that is usually sentence-glue, not URL.
        const m = url.match(/[.,;:!?)\]}'"]+$/);
        let tail = "";
        if (m) { tail = m[0]; url = url.slice(0, url.length - tail.length); }
        return '<a href="' + url + '" target="_blank" rel="noopener noreferrer">' + url + "</a>" + tail;
      });
      // 2. Bold: double-asterisk pairs.
      s = s.replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>");
      // 3. Italic: single-asterisk pairs. Boundary guards reject bullet-style
      //    leading asterisks and avoid touching inside already-inserted tags.
      s = s.replace(
        /(^|[^*\w<])\*(?!\s)([^*\n<>]*[^\s*<>]|[^\s*<>])\*(?!\w)/g,
        "$1<em>$2</em>"
      );
      // 4. Line breaks.
      s = s.replace(/\n\n+/g, "<br><br>").replace(/\n/g, "<br>");
      return s;
    }
  `;
}
