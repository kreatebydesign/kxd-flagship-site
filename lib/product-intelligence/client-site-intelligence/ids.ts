/**
 * Stable Product Intelligence IDs for Client Site Intelligence V1.
 */

export const CSI_RECORDED_AT = "2026-08-07T18:30:00.000Z";
export const CSI_V1A_RECORDED_AT = "2026-08-07T19:45:00.000Z";
export const CSI_REVIEW_AT = "2027-02-07T00:00:00.000Z";

/**
 * OTP Carts website production commit for Website Lead Attribution Phase 1.
 * External to this repository — recorded as a Human Decision locator, not a local git object.
 */
export const OTP_CARTS_LEAD_ATTRIBUTION_SHA =
  "88da435f647e5d24be7a5f49ff739f2dcb552a2d";

export const OTP_CARTS_PRODUCTION_URL = "https://www.otpcarts.com";

export const CSI_IDS = {
  decisionV1: "decision:client-site-intelligence-v1",
  evidencePreBuild: "evidence:client-site-intelligence-pre-build-gate",
  evidenceOtpLeadAttribution: "evidence:otp-carts-website-lead-attribution-phase-1",
  evidenceOtpSeoBatch1: "evidence:otp-carts-seo-foundation-batch-1-production",
  evidenceOtpGscSiteConfig: "evidence:otp-carts-gsc-site-url-config-in-kxd-os",
  evidenceOtpLaunchReadiness: "evidence:otp-carts-launch-readiness-gate",
  evidenceActivityEngine: "evidence:activity-engine-canonical-relationship-memory",
  evidenceCsiV1a: "evidence:client-site-intelligence-csi-v1-a-ingest",
  inventoryCapability: "capability:client-site-intelligence",
  inventoryModule: "module:lib/client-site-intelligence",
  architecture: "architecture:client-site-event-ingest",
  roadmapV1: "roadmap:client-site-intelligence-v1",
  roadmapOtpSeo: "roadmap:otp-carts-seo-organic-growth",
  debtTimelineUnification: "debt:client-visible-activity-timeline-unification",
  killWebsiteLeadCrm: "kill:website-lead-crm",
  killAutoCommission: "kill:auto-commission-on-website-lead-submit",
  killPortalNoiseFeed: "kill:client-portal-commit-deploy-noise-feed",
  evolution: "evolution:client-site-intelligence-v1-decision",
  evolutionCsiV1a: "evolution:client-site-intelligence-csi-v1-a-ingest",
} as const;
