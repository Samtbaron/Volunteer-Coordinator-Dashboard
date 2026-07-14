// Shared helper. Row data can come from an uploaded CSV — never trust it enough
// to drop straight into innerHTML without escaping.
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[ch]));
}

export { escapeHtml };
