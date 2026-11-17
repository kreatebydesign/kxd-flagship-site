/**
 * Shared KXD client-portal brand signature — official logo, attribution copy, session intro.
 * Presentation only; does not affect auth, billing, or client records.
 */

/** Matt-approved gold monogram (same asset as agreements and public KxdLogo). */
export const KXD_OFFICIAL_GOLD_LOGO_PATH = "/migrated-assets/brand/kxd-logo-transparent.png";

export const KXD_PORTAL_ATTRIBUTION_URL = "https://www.kreatebydesign.com";

export const KXD_PORTAL_ATTRIBUTION_COMPANY = "Kreate by Design";

/** Standard client-portal sidebar attribution (exact wording). */
export const KXD_PORTAL_ATTRIBUTION_COPY = `Designed & Developed by ${KXD_PORTAL_ATTRIBUTION_COMPANY}`;

/** sessionStorage — one cinematic intro per authenticated portal session (tab). */
export const KXD_PORTAL_INTRO_SESSION_KEY = "kxd-ces-portal-brand-intro-v1";

/** Total overlay lifetime (ms) — within 1–1.5s product spec. */
export const KXD_PORTAL_INTRO_DURATION_MS = 1300;