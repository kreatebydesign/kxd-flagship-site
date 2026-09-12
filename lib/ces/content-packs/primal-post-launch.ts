/**
 * Primal Motorsports — optional CONTENT pack for post-launch portal copy.
 *
 * CONTENT (retain): curated language, Leadership Report actions, panel notes,
 * recent progress milestones, website health labels.
 * Not STRUCTURAL: shared compose resolves the same fields for any client
 * with equivalent operating-state configuration.
 */

import type { ClientOperatingStateConfig } from "@/lib/ces/operating-state";

export const PRIMAL_WEBSITE_LAUNCH_DATE = "2026-09-09";
export const PRIMAL_POST_LAUNCH_BASELINE_DATE = "2026-09-11";

/**
 * Authored operating-state + content for Primal post-launch.
 * Used when CES profile.operatingState is empty (no Production writes required
 * for regression). Persisted profile config wins when present.
 */
export const PRIMAL_POST_LAUNCH_OPERATING_CONFIG: ClientOperatingStateConfig = {
  mode: "post-launch",
  phase: "Growth & Optimization",
  currentPriority: "Increase qualified traffic and lead performance",
  watching:
    "Organic search visibility · Google Ads efficiency · Qualified lead performance",
  recentWin: "New production website launched",
  productionVerified: true,
  baseline: {
    established: true,
    date: PRIMAL_POST_LAUNCH_BASELINE_DATE,
    label: "September 11, 2026 post-launch baseline established",
  },
  content: {
    recommendationHeadline: "Focus moves to measurable growth",
    recommendationRationale:
      "The production website is live and verified. Search visibility is connected, website lead capture is measurable, and paid acquisition has been reviewed. The focus now is qualified traffic, search visibility, and advertising efficiency, with September 11 as the documented baseline.",
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
    introduction:
      "Website live. Production verified. Measurement active. Focus: growth.",
    collaborationStatusLabel: "Website live · Production verified",
    collaborationExplanation:
      "Launch is complete. Website Review remains available for future notes — it is no longer blocking production.",
    outstandingKxdAction:
      "Monitoring search, Ads efficiency, and qualified lead performance",
    homePerformanceNote:
      "Search Console connected. GA4 measured but portal traffic not synced. Ads reviewed but portal Ads not connected. Form leads from inquiry records when period-ready.",
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
  },
};

/** Compatibility shape for scripts and any remaining CONTENT consumers. */
export const PRIMAL_POST_LAUNCH_OPERATING = {
  websiteStatus: "Live",
  productionStatus: "Verified",
  currentPhase: PRIMAL_POST_LAUNCH_OPERATING_CONFIG.phase!,
  currentPriority: PRIMAL_POST_LAUNCH_OPERATING_CONFIG.currentPriority!,
  watching: PRIMAL_POST_LAUNCH_OPERATING_CONFIG.watching!,
  recentWin: PRIMAL_POST_LAUNCH_OPERATING_CONFIG.recentWin!,
  recommendationHeadline:
    PRIMAL_POST_LAUNCH_OPERATING_CONFIG.content!.recommendationHeadline!,
  recommendationRationale:
    PRIMAL_POST_LAUNCH_OPERATING_CONFIG.content!.recommendationRationale!,
  recentProgress: PRIMAL_POST_LAUNCH_OPERATING_CONFIG.content!.recentProgress!,
  primaryActionLabel:
    PRIMAL_POST_LAUNCH_OPERATING_CONFIG.content!.primaryActionLabel!,
  primaryActionHref:
    PRIMAL_POST_LAUNCH_OPERATING_CONFIG.content!.primaryActionHref!,
  secondaryActionLabel:
    PRIMAL_POST_LAUNCH_OPERATING_CONFIG.content!.secondaryActionLabel!,
  secondaryActionHref:
    PRIMAL_POST_LAUNCH_OPERATING_CONFIG.content!.secondaryActionHref!,
  momentumLabel: PRIMAL_POST_LAUNCH_OPERATING_CONFIG.content!.momentumLabel!,
  momentumDetail: PRIMAL_POST_LAUNCH_OPERATING_CONFIG.content!.momentumDetail!,
  websitePanelNote:
    PRIMAL_POST_LAUNCH_OPERATING_CONFIG.content!.websitePanelNote!,
  adsPanelNote: PRIMAL_POST_LAUNCH_OPERATING_CONFIG.content!.adsPanelNote!,
  searchPanelFallback:
    PRIMAL_POST_LAUNCH_OPERATING_CONFIG.content!.searchPanelFallback!,
  homePerformanceNote:
    PRIMAL_POST_LAUNCH_OPERATING_CONFIG.content!.homePerformanceNote!,
  websiteHealth: PRIMAL_POST_LAUNCH_OPERATING_CONFIG.content!.websiteHealth!,
} as const;
