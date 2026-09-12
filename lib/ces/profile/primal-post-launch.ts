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
    "The production website is live and verified. Search Console is connected for the monthly window. GA4 measurement exists, but portal Website Analytics is not synced yet. Ads performance has been reviewed, but portal Ads reporting is not connected yet. Confirmed website form leads appear from inquiry records when period-ready. Next focus: qualified traffic, search visibility, and advertising efficiency — with September 11 as the documented baseline.",
  /**
   * Executive Home “Recent progress” — curated milestones only.
   * Never raw Website Review revision titles.
   */
  recentProgress: [
    {
      id: "primal-production-launch",
      label: "Production website launched",
      detail: "New production site live",
      at: `${PRIMAL_WEBSITE_LAUNCH_DATE}T12:00:00.000Z`,
    },
    {
      id: "primal-post-launch-verification",
      label: "Post-launch verification completed",
      detail: "Production verification and baseline documented",
      at: `${PRIMAL_POST_LAUNCH_BASELINE_DATE}T12:00:00.000Z`,
    },
    {
      id: "primal-search-foundation",
      label: "Search foundation implemented",
      detail: "Metadata, sitemap, robots, structured data, redirects",
      at: `${PRIMAL_POST_LAUNCH_BASELINE_DATE}T12:00:00.000Z`,
    },
    {
      id: "primal-measurement-baseline",
      label: "Measurement baseline established",
      detail: "September 11 documented post-launch baseline",
      at: `${PRIMAL_POST_LAUNCH_BASELINE_DATE}T12:00:00.000Z`,
    },
  ],
  primaryActionLabel: "Open Leadership Report",
  primaryActionHref: "/portal/partnership/leadership-report",
  secondaryActionLabel: "Open executive briefing",
  secondaryActionHref: "/portal/partnership",
  momentumLabel: "Baseline established",
  momentumDetail:
    "September 11, 2026 is the documented post-launch baseline. The first full post-launch period is being measured — not yet treated as a finished trend.",
  websitePanelNote:
    "Production traffic is being measured. Live portal traffic figures appear after Website Analytics sync is verified — reviewed baseline is in the Leadership Report.",
  adsPanelNote:
    "Paid performance has been reviewed. Live Ads figures appear after Google Ads sync is verified — reviewed baseline is in the Leadership Report.",
  searchPanelFallback:
    "Search foundation is active. Live Search Console figures appear for the selected monthly window when facts are synced.",
  /**
   * Connection-state line for Performance disclosure — not the main scan strip.
   * Attribution / double-counting detail stays under About these figures.
   */
  homePerformanceNote:
    "Search Console connected. GA4 measured but portal traffic not synced. Ads reviewed but portal Ads not connected. Form leads from inquiry records when period-ready.",
  websiteHealth: {
    serviceValue: "Active",
    serviceDetail: "Production website live and managed with KXD",
    speedValue: "Verified at launch",
    speedDetail:
      "Technical verification completed with the September 2026 production launch. Continuous monitoring continues — no separate PageSpeed score is published here.",
    searchFoundationValue: "Implemented",
    searchFoundationDetail:
      "Search foundation verified at launch (metadata, sitemap, robots, structured data, redirects).",
    activityValueWhenConfigured: "Connected",
    activityValueWhenPending: "Measurement active",
    activityDetailWhenPending:
      "GA4 is receiving production activity. Live portal sync remains separate until Website Analytics is verified.",
    releaseValue: "September 2026 production launch",
    releaseDetail: `Launched ${PRIMAL_WEBSITE_LAUNCH_DATE} · post-launch baseline ${PRIMAL_POST_LAUNCH_BASELINE_DATE}`,
  },
} as const;

export function isPrimalPostLaunchClient(
  clientSlug: string | null | undefined,
): boolean {
  if (!clientSlug) return false;
  const slug = clientSlug.trim().toLowerCase();
  return slug === PRIMAL_CLIENT_SLUG || slug === "primal";
}
