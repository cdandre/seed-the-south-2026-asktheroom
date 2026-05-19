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
