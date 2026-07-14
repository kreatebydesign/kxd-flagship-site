/**
 * Phase 33A.1 — Sanitize failure messages for storage / logs.
 * Never persist tokens, secrets, or large provider payloads.
 */

const SECRETISH =
  /(authorization|bearer\s+[a-z0-9._+-]+|access[_-]?token|refresh[_-]?token|api[_-]?key|client_secret|private_key|-----BEGIN)/i;

export function sanitizeReportingFailureMessage(
  raw: unknown,
  fallback = "Provider sync failed.",
): string {
  if (raw == null) return fallback;
  let text = typeof raw === "string" ? raw : String(raw);
  text = text.replace(/\s+/g, " ").trim();
  if (!text) return fallback;

  if (SECRETISH.test(text)) {
    return "Provider sync failed (sensitive details redacted).";
  }

  // Strip query-like credential fragments.
  text = text
    .replace(/Bearer\s+[A-Za-z0-9._\-]+/gi, "Bearer [redacted]")
    .replace(/(access_token|refresh_token|api_key|client_secret)=([^\s&]+)/gi, "$1=[redacted]");

  if (text.length > 280) {
    text = `${text.slice(0, 277)}...`;
  }
  return text;
}
