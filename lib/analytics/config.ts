/**
 * Analytics architecture — GA4, GTM, Search Console.
 * Components render only when environment variables are set.
 */

export const ANALYTICS_CONFIG = {
  ga4Id: process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID || "",
  gtmId: process.env.NEXT_PUBLIC_GTM_ID || "",
  googleSiteVerification: process.env.GOOGLE_SITE_VERIFICATION || "",
} as const;

export function isAnalyticsEnabled(): boolean {
  return Boolean(ANALYTICS_CONFIG.ga4Id || ANALYTICS_CONFIG.gtmId);
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
