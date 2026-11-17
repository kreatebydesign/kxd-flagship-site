/**
 * KXD Signature Experience — canonical copy, colors, timing, and official logo reference.
 * Single source of truth for every client portal. Presentation only.
 */

/** Internal product name */
export const KXD_SIGNATURE_EXPERIENCE_NAME = "KXD Signature Experience";

/** Matt-approved gold monogram — never substitute or recolor. */
export const KXD_OFFICIAL_GOLD_LOGO_PATH = "/migrated-assets/brand/kxd-logo-transparent.png";

export const KXD_SIGNATURE_CANVAS = "#030304";

/** Metallic gold accent — harmonized with official logo PNG. */
export const KXD_SIGNATURE_GOLD = "#c2aa72";
export const KXD_SIGNATURE_GOLD_LIGHT = "rgba(255, 232, 190, 0.42)";
export const KXD_SIGNATURE_WARM_WHITE = "#f4f0e8";

export const KXD_SIGNATURE_HEADLINE = "Exceptional by Design.";

export const KXD_PORTAL_ATTRIBUTION_URL = "https://www.kreatebydesign.com";
export const KXD_PORTAL_ATTRIBUTION_COMPANY = "Kreate by Design";
export const KXD_PORTAL_ATTRIBUTION_COPY = `Designed & Developed by ${KXD_PORTAL_ATTRIBUTION_COMPANY}`;

/** @deprecated alias */
export const CES_DEFAULT_PARTNER_FOOTER_COPY = KXD_PORTAL_ATTRIBUTION_COPY;

/** Total experience length (ms) — Stage 4 completes by 2.5s. */
export const KXD_SIGNATURE_EXPERIENCE_DURATION_MS = 2500;

/** Animation stage markers (ms) — for documentation and tests. */
export const KXD_SIGNATURE_STAGE = {
  lineStart: 0,
  lineEnd: 400,
  logoStart: 400,
  logoEnd: 1100,
  copyStart: 1000,
  copyEnd: 1900,
  dissolveStart: 1900,
  dissolveEnd: 2500,
} as const;