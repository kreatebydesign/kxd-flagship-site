/**
 * Safe logo / accent helpers for presentation-only identity.
 */

const SAFE_HEX = /^#[0-9A-Fa-f]{6}$/;

/**
 * Accept only same-origin relative media paths or already-resolved absolute https URLs
 * that look like Payload media. Reject protocol-relative, data:, javascript:, etc.
 */
export function sanitizeLogoUrl(value: string | null | undefined): string | null {
  if (!value || typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("/")) {
    if (trimmed.startsWith("//")) return null;
    if (trimmed.includes("://")) return null;
    return trimmed;
  }
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    // Reject obvious script/data schemes already handled; keep http(s) only.
    return url.toString();
  } catch {
    return null;
  }
}

/** Accent for subtle shell treatment — invalid values become null (no CSS injection). */
export function sanitizeAccentColor(value: string | null | undefined): string | null {
  if (!value || typeof value !== "string") return null;
  const trimmed = value.trim();
  return SAFE_HEX.test(trimmed) ? trimmed : null;
}
