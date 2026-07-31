/**
 * Redact capability tokens from persisted delivery previews.
 * Full secure URLs are returned once to authenticated operators only.
 */

export function redactSecureUrl(secureUrl: string): string {
  try {
    const u = new URL(secureUrl);
    const parts = u.pathname.split("/").filter(Boolean);
    const last = parts[parts.length - 1] ?? "";
    if (last.length >= 8) {
      parts[parts.length - 1] = `${last.slice(0, 8)}…[redacted]`;
      u.pathname = `/${parts.join("/")}`;
      return u.toString();
    }
  } catch {
    /* fall through */
  }
  return "[redacted-secure-url]";
}

export function scrubTokenFromText(text: string, rawToken: string): string {
  if (!rawToken || rawToken.length < 8) return text;
  return text.split(rawToken).join(`${rawToken.slice(0, 8)}…[redacted]`);
}
