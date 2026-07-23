/**
 * Public website analytics — Google tag + connected GA4 destination.
 *
 * Browser installation uses the canonical Google tag ID only.
 * Do not dual-config the connected GA4 measurement ID (avoids duplicate page_view).
 * Do not emit manual page_view / App Router listeners — initial hit comes from gtag('config');
 * SPA route changes use GA4 Enhanced Measurement (browser history events).
 * Server-side reporting (Data API) remains separate under lib/reporting + live-integrations.
 */

/** Canonical Google tag for kreatebydesign.com (public identifier, not a secret). */
export const KXD_GOOGLE_TAG_ID = "GT-TQTSJHVJ" as const;

/**
 * Connected GA4 destination for the Google tag above.
 * Documented for operators — do not pass to gtag('config') alongside the Google tag.
 */
export const KXD_GA4_MEASUREMENT_ID = "G-1L1BXNJB4T" as const;

/** Hostnames allowed to load/send public website analytics. */
export const PUBLIC_ANALYTICS_HOSTS = [
  "kreatebydesign.com",
  "www.kreatebydesign.com",
] as const;

export type PublicAnalyticsHost = (typeof PUBLIC_ANALYTICS_HOSTS)[number];

export const ANALYTICS_CONFIG = {
  /** Browser Google tag ID (GT-…). Env override optional; defaults to canonical. */
  googleTagId: process.env.NEXT_PUBLIC_GOOGLE_TAG_ID?.trim() || KXD_GOOGLE_TAG_ID,
  /** Connected GA4 measurement ID (G-…) — destination only, not a second browser config. */
  ga4MeasurementId:
    process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID?.trim() || KXD_GA4_MEASUREMENT_ID,
  /**
   * @deprecated Browser GTM is not installed on the public site (duplicate-tag risk).
   * Kept for env documentation / legacy detection only.
   */
  gtmId: process.env.NEXT_PUBLIC_GTM_ID?.trim() || "",
  googleSiteVerification: process.env.GOOGLE_SITE_VERIFICATION || "",
} as const;

export function getPublicGoogleTagId(): string {
  return ANALYTICS_CONFIG.googleTagId;
}

export function isPublicProductionAnalyticsHost(hostname: string): boolean {
  const host = hostname.split(":")[0]?.trim().toLowerCase() ?? "";
  return (PUBLIC_ANALYTICS_HOSTS as readonly string[]).includes(host);
}

/** Resolve hostname from a Next.js request headers store. */
export function resolveRequestHostname(headerStore: Headers): string {
  const forwarded = headerStore.get("x-forwarded-host");
  const raw = (forwarded ?? headerStore.get("host") ?? "").split(",")[0]?.trim() ?? "";
  return raw.split(":")[0]?.toLowerCase() ?? "";
}

export function isAnalyticsEnabled(): boolean {
  return Boolean(getPublicGoogleTagId());
}

export const ANALYTICS_EVENTS = {
  inquirySubmit: "inquiry_submit",
  discoveryCallRequest: "discovery_call_request",
  platformApplication: "platform_application",
  projectView: "project_view",
  caseStudyView: "case_study_view",
  serviceView: "service_view",
  pricingView: "pricing_view",
  contactClick: "contact_click",
} as const;
