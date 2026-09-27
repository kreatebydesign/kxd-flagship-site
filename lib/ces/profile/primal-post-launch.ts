/**
 * Primal Motorsports — operating state after the September leadership baseline.
 *
 * Used when Clients.commercialRelationshipLabel / Website Review records
 * still reflect earlier project state. Complements Executive Memory; does not invent metrics.
 */

import { PRIMAL_CLIENT_SLUG } from "./primal";

export const PRIMAL_WEBSITE_LAUNCH_DATE = "2026-09-09";
export const PRIMAL_POST_LAUNCH_BASELINE_DATE = "2026-09-11";
export const PRIMAL_LEADERSHIP_UPDATE_DATE = "2026-09-26";

/** Client-facing operating labels for Primal after the September baseline. */
export const PRIMAL_POST_LAUNCH_OPERATING = {
  websiteStatus: "Live",
  productionStatus: "Verified",
  /** Maps to EP "Current priority" via partnership overview.currentPhase */
  currentPhase: "Growth & Optimization",
  /** Maps to EP "Biggest opportunity" via overview.currentFocus */
  currentPriority: "Protect Atlanta racing-school visibility and improve qualified acquisition",
  /** Maps to EP "Watching" via overview.nextMilestone */
  watching:
    "Atlanta / racing-school organic positions · Ads query quality · Qualified lead performance",
  /** Maps to EP "Recent win" when timeline activity is empty */
  recentWin: "Atlanta racing-school visibility moved to average position 3.1",
  recommendationHeadline: "Atlanta racing-school visibility is the headline movement",
  recommendationRationale:
    "Since the previous September leadership review, matched Search Console periods show “racing school atlanta” moving from average position 21.4 to 3.1. Paid Search conversion measurement is validated, search-term cleanup is active, and the paid Racing School landing page now reflects current MotorsportReg availability. Current focus: protect high-intent rankings, improve qualified CPA, and grow non-branded racing-school demand.",
  /**
   * Executive Home “Recent progress” — curated milestones only.
   * Never raw Website Review revision titles.
   */
  recentProgress: [
    {
      id: "primal-atlanta-visibility",
      label: "Atlanta racing-school visibility advanced",
      detail: "Matched GSC periods: average position 21.4 → 3.1",
      at: `${PRIMAL_LEADERSHIP_UPDATE_DATE}T12:00:00.000Z`,
    },
    {
      id: "primal-landing-schedule",
      label: "Paid Racing School availability corrected",
      detail: "Live MotorsportReg schedule · October 21–22, 2026",
      at: `${PRIMAL_LEADERSHIP_UPDATE_DATE}T12:00:00.000Z`,
    },
    {
      id: "primal-ads-control",
      label: "Search campaign control tightened",
      detail: "Converting queries protected · irrelevant traffic removed selectively",
      at: `${PRIMAL_LEADERSHIP_UPDATE_DATE}T12:00:00.000Z`,
    },
    {
      id: "primal-measurement-baseline",
      label: "September leadership baseline retained",
      detail: "September 11 baseline remains the immutable prior record",
      at: `${PRIMAL_POST_LAUNCH_BASELINE_DATE}T12:00:00.000Z`,
    },
  ],
  primaryActionLabel: "Open Leadership Performance Update",
  /** Default leadership-report route resolves to the latest published report. */
  primaryActionHref: "/portal/partnership/leadership-report",
  secondaryActionLabel: "Open executive briefing",
  secondaryActionHref: "/portal/partnership",
  momentumLabel: "Measured progress since last review",
  momentumDetail:
    "September 26, 2026 leadership update is current. September 11 remains the archived prior baseline. Monthly analytics windows are labeled separately from matched Search Console periods.",
  websitePanelNote:
    "Current organic story is in the Leadership Performance Update (matched Sep 9–26 vs Aug 22–Sep 8 windows). Live portal traffic figures appear after Website Analytics sync is verified.",
  adsPanelNote:
    "Latest verified Search review: 5 conversions · $2,401.20 spend · approximately $480 CPA · $90/day budget. Full detail is in the Leadership Performance Update.",
  searchPanelFallback:
    "Search foundation is active. Matched-period ranking movement is documented in the Leadership Performance Update; live Search Console figures appear for the selected monthly window when facts are synced.",
  /**
   * Connection-state line for Performance disclosure — not the main scan strip.
   * Attribution / double-counting detail stays under About these figures.
   */
  homePerformanceNote:
    "Leadership update through Sep 26 is current. Search Console connected. GA4 measured but portal traffic may not be synced for the selected monthly window. Ads reviewed; portal Ads connection remains separate. Form leads from inquiry records when period-ready.",
  websiteHealth: {
    serviceValue: "Active",
    serviceDetail: "Production website live and managed with KXD",
    speedValue: "Verified",
    speedDetail:
      "Technical verification completed with the September 2026 production period. Continuous monitoring continues — no separate PageSpeed score is published here.",
    searchFoundationValue: "Implemented",
    searchFoundationDetail:
      "Search foundation verified (metadata, sitemap, robots, structured data, redirects). Ranking movement is tracked in the Leadership Performance Update.",
    activityValueWhenConfigured: "Connected",
    activityValueWhenPending: "Measurement active",
    activityDetailWhenPending:
      "GA4 is receiving production activity. Live portal sync remains separate until Website Analytics is verified.",
    releaseValue: "September 2026 production period",
    releaseDetail: `Baseline ${PRIMAL_POST_LAUNCH_BASELINE_DATE} · leadership update ${PRIMAL_LEADERSHIP_UPDATE_DATE}`,
  },
} as const;

export function isPrimalPostLaunchClient(
  clientSlug: string | null | undefined,
): boolean {
  if (!clientSlug) return false;
  const slug = clientSlug.trim().toLowerCase();
  return slug === PRIMAL_CLIENT_SLUG || slug === "primal";
}
