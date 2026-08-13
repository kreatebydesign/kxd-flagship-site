/**
 * Robin Cole for Tracy — approved campaign brand assets.
 * Sourced from the Robin Cole Campaign Brand Kit (not generated).
 * Used when CES/onboarding logo is absent so portal surfaces represent
 * Robin's campaign instead of leaking KXD marketing favicon/logo.
 */

/** Favicon / compact mark — not the sidebar wordmark. */
export const ROBIN_COLE_LOGO_SRC = "/migrated-assets/logos/robin-cole/icon.png";
/** Primary campaign lockup for portal sidebar identity. */
export const ROBIN_COLE_SIDEBAR_LOGO_SRC =
  "/migrated-assets/logos/robin-cole/logo.png";
export const ROBIN_COLE_FAVICON_SRC = "/migrated-assets/logos/robin-cole/favicon.ico";
export const ROBIN_COLE_APPLE_ICON_SRC =
  "/migrated-assets/logos/robin-cole/apple-touch-icon.png";
export const ROBIN_COLE_LOGO_ALT = "Robin Cole for Tracy";

const ROBIN_SLUG_RE = /^(robin-cole|robin-for-tracy|robin-cole-for-tracy|robin-cole-city-council)(-|$)/i;

export function isRobinColeClient(input: {
  clientSlug?: string | null;
  clientName?: string | null;
}): boolean {
  const slug = String(input.clientSlug ?? "").trim();
  const name = String(input.clientName ?? "").trim();
  if (slug && ROBIN_SLUG_RE.test(slug)) return true;
  if (/robin\s*cole/i.test(name)) return true;
  return false;
}
