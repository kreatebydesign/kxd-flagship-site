/**
 * Sanitize operator-authored and system text for client-facing output.
 */

const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const FORMULA_PREFIX = /^\s*[=+\-@]/;

export function sanitizeReportText(value: unknown, maxLen = 12000): string {
  if (value == null) return "";
  let text = String(value).replace(CONTROL_CHARS, "").trim();
  if (FORMULA_PREFIX.test(text)) {
    text = `'${text}`;
  }
  if (text.length > maxLen) {
    text = `${text.slice(0, maxLen - 1)}…`;
  }
  return text;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function stripInternalNotesFromSnapshot<T extends { internalNotes?: string }>(
  snapshot: T,
): Omit<T, "internalNotes"> & { internalNotes: "" } {
  return { ...snapshot, internalNotes: "" };
}

const CLIENT_FACING_LEAK_PATTERNS: RegExp[] = [
  /\bclientVisible\s*=\s*false\b/gi,
  /\bclientVisible:\s*false\b/gi,
  /\bMatt approves?\b/gi,
  /\breport identity\b/gi,
  /\boperator staging\b/gi,
  /\bdraft mechanics\b/gi,
  /\binternal implementation instructions?\b/gi,
  /\bpremium partnership\b/gi,
  /\bSEO upgrade\b/gi,
  /\bprimal-google-ads-audit-[0-9-]+\b/gi,
  /\boperator-only\b/gi,
  /\bin-review\b/gi,
  /\bdataProvenance\b/gi,
];

export function stripClientFacingOperatorLeaks(value: unknown, maxLen = 12000): string {
  let text = sanitizeReportText(value, maxLen);
  for (const pattern of CLIENT_FACING_LEAK_PATTERNS) {
    pattern.lastIndex = 0;
    text = text.replace(pattern, "").trim();
  }
  return text.replace(/\n{3,}/g, "\n\n").trim();
}

const LEAK_PATTERNS: RegExp[] = [
  /sk_live_[A-Za-z0-9]+/gi,
  /sk_test_[A-Za-z0-9]+/gi,
  /whsec_[A-Za-z0-9]+/gi,
  /Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi,
  /-----BEGIN [A-Z ]+PRIVATE KEY-----/gi,
  /storage\/commercial-documents\//gi,
  /DATABASE_URL\s*=/gi,
];

export function assertNoSecretLeak(text: string, context: string): void {
  for (const pattern of LEAK_PATTERNS) {
    pattern.lastIndex = 0;
    if (pattern.test(text)) {
      throw new Error(`Potential secret or private path leaked in ${context}.`);
    }
  }
}

export function safeFilenameSegment(value: string, fallback = "client"): string {
  const cleaned = value
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 48);
  return cleaned || fallback;
}
