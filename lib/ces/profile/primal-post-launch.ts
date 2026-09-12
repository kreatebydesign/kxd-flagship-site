/**
 * Primal Motorsports — post-launch operating state (operator-authored).
 *
 * Used when Clients.commercialRelationshipLabel / Website Review records
 * still reflect pre-launch. Complements Executive Memory; does not invent metrics.
 */

import { PRIMAL_CLIENT_SLUG } from "./primal";

export const PRIMAL_WEBSITE_LAUNCH_DATE = "2026-09-09";
export const PRIMAL_POST_LAUNCH_BASELINE_DATE = "2026-09-11";

/** Client-facing operating labels for Primal after production launch. */
export const PRIMAL_POST_LAUNCH_OPERATING = {
  websiteStatus: "Live",
  productionStatus: "Verified",
  /** Maps to EP "Current priority" via partnership overview.currentPhase */
  currentPhase: "Growth & Optimization",
  /** Maps to EP "Biggest opportunity" via overview.currentFocus */
  currentPriority: "Increase qualified traffic and lead performance",
  /** Maps to EP "Watching" via overview.nextMilestone */
  watching: "Organic search visibility · Google Ads efficiency · Qualified lead performance",
  /** Maps to EP "Recent win" when timeline activity is empty */
  recentWin: "New production website launched",
  recommendationHeadline: "Focus moves to measurable growth",
  recommendationRationale:
    "The production website is live and verified. Search, Ads, and lead measurement are in place. The next work is qualified traffic, search visibility, and advertising efficiency — with September 11 as the documented baseline.",
  primaryActionLabel: "Open Leadership Report",
  primaryActionHref: "/portal/partnership/leadership-report",
  secondaryActionLabel: "Open executive briefing",
  secondaryActionHref: "/portal/partnership",
  momentumLabel: "Baseline established",
  momentumDetail:
    "September 11, 2026 is the documented post-launch baseline. The first full post-launch period is being measured — not yet treated as a finished trend.",
  websitePanelNote:
    "Website is live and verified. GA4 property 549908814 is receiving production activity. Live Website panel sync stays off until website-analytics entitlement and provider sync are verified. Detailed baseline: Leadership Report.",
  adsPanelNote:
    "Google Ads performance has been reviewed for August 12 – September 10, 2026 and is producing tracked primary conversions. Live Ads panel sync stays off until google-ads entitlement and provider sync are verified. Detailed baseline: Leadership Report.",
  searchPanelFallback:
    "Search foundation is active. Live Search Console figures appear here when ReportingFacts exist for the selected monthly window. September 11 verified baseline: Leadership Report.",
} as const;

export function isPrimalPostLaunchClient(
  clientSlug: string | null | undefined,
): boolean {
  if (!clientSlug) return false;
  const slug = clientSlug.trim().toLowerCase();
  return slug === PRIMAL_CLIENT_SLUG || slug === "primal";
}
