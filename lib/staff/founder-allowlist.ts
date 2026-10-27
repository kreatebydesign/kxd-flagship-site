/** Founder email allowlist — shared by studio operator gates and staff checks. */

export function parseFounderAllowlistEmails(): Set<string> {
  const raw =
    process.env.KXD_SCHEDULING_FOUNDER_EMAILS?.trim() ||
    process.env.KXD_INQUIRY_EMAIL?.trim() ||
    "matt@kreatebydesign.com";
  return new Set(
    raw
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isFounderAllowlistEmail(email: string | null | undefined): boolean {
  const normalized = String(email ?? "").trim().toLowerCase();
  if (!normalized) return false;
  return parseFounderAllowlistEmails().has(normalized);
}
