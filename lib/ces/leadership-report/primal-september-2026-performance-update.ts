/**
 * Primal Motorsports — Digital Performance & Growth Update
 * September 2026 · Leadership Performance Review
 *
 * Manually verified facts for leadership review since the September 11 baseline.
 * Do not replace with live ReportingFacts silently.
 * Do not overwrite the archived prior leadership baseline report.
 */

import type { LeadershipProgressReportDocument } from "./progress-types";

export const PRIMAL_LEADERSHIP_PROGRESS_UPDATE_ID =
  "primal-september-2026-performance-update";

export const PRIMAL_LEADERSHIP_PROGRESS_UPDATE: LeadershipProgressReportDocument = {
  kind: "progress-update",
  id: PRIMAL_LEADERSHIP_PROGRESS_UPDATE_ID,
  clientSlug: "primal-motorsports",
  clientName: "Primal Motorsports",
  reportDateLabel: "September 26, 2026",
  reportDateIso: "2026-09-26",
  title: "Digital Performance & Growth Update",
  subtitle: "PRIMAL MOTORSPORTS",
  periodLabel: "September 2026 · Leadership Performance Review",
  dataThroughLabel: "Data through September 26, 2026",
  supportingLine:
    "Measured progress since the previous September leadership review — with high-intent racing-school visibility, paid acquisition control, and conversion optimization as the primary signals.",
  heroImageSrc: "/migrated-assets/projects/primal-motorsports-hero.jpg",
  heroImageAlt: "Radical race cars on track — Primal Motorsports",
  logoSrc: "/migrated-assets/logos/primal.svg",
  logoAlt: "Primal Motorsports",
  accent: "#A83424",
  printDocumentTitle:
    "Primal Motorsports | Digital Performance & Growth Update · September 2026",

  archiveTypeLabel: "Leadership Performance Review",
  archivePeriodLabel: "September 2026 · Leadership Performance Review",
  archiveSummary:
    "Atlanta racing-school visibility moved from average position 21.4 to 3.1 in matched Search Console periods, with paid acquisition and conversion measurement actively optimized.",

  executiveSummary: [
    "Atlanta racing-school visibility has moved materially since the previous leadership review. In matched Search Console periods, “racing school atlanta” improved from an average position of 21.4 to 3.1.",
    "Verified high-intent racing-school queries also strengthened in the same windows, including performance driving school and racing schools near me. High-intent query positioning is currently the strongest organic signal; broader organic traffic growth remains an active objective.",
    "Across the matched 18-day windows, aggregate organic clicks moved 218 → 152 and impressions 4,231 → 2,589, while CTR improved 5.15% → 5.87%. That CTR lift is a positive engagement signal — not a claim that overall organic volume grew.",
    "Paid Search continues to convert with verified measurement. Current campaign budget: $90/day, with converting broad-match traffic protected and irrelevant traffic removed selectively. Conversion efficiency still has room for improvement.",
    "Conversion optimization work completed since the last review includes correcting stale Racing School availability on the paid landing page and connecting that page to the live MotorsportReg schedule source.",
  ],

  workHighlights: [
    {
      id: "search",
      label: "Search visibility",
      detail:
        "Continued Atlanta/local racing-school search optimization and query monitoring.",
    },
    {
      id: "paid",
      label: "Paid acquisition",
      detail:
        "Search-term review, irrelevant traffic cleanup, and conversion measurement validation.",
    },
    {
      id: "conversion",
      label: "Conversion experience",
      detail:
        "Corrected stale Racing School availability and connected the paid landing experience to the live MotorsportReg schedule.",
    },
  ],

  heroCallout: {
    eyebrow: "Primary SEO movement",
    query: "racing school atlanta",
    previousDisplay: "21.4",
    currentDisplay: "3.1",
    body: [
      "The previous leadership report identified “racing school atlanta” as a priority opportunity, with recent visibility around position 17 in that baseline review.",
      "Fresh matched-period Search Console analysis now shows average position 21.4 in the previous comparison window and 3.1 in the current window.",
    ],
    caveat:
      "Average position is a Search Console signal across the matched periods. It does not guarantee a specific result for every personalized Google search — rankings vary by location, device, personalization, and search context.",
  },

  scorecardIntro: [
    "Progress scorecard since the September leadership review. Different rows use different measurement windows — read each period label before comparing figures.",
  ],
  scorecard: [
    {
      id: "atlanta",
      label: "Atlanta racing-school visibility",
      value: "21.4 → 3.1",
      periodLabel: "Matched GSC · Aug 22–Sep 8 vs Sep 9–26, 2026",
      note: "Query: racing school atlanta",
    },
    {
      id: "near-me",
      label: "Racing schools near me",
      value: "3.5 → 2.4",
      periodLabel: "Matched GSC · Aug 22–Sep 8 vs Sep 9–26, 2026",
    },
    {
      id: "performance",
      label: "Performance driving school",
      value: "5.0 → 3.4",
      periodLabel: "Matched GSC · Aug 22–Sep 8 vs Sep 9–26, 2026",
    },
    {
      id: "ctr",
      label: "Organic CTR",
      value: "5.15% → 5.87%",
      periodLabel: "Matched GSC aggregate · Aug 22–Sep 8 vs Sep 9–26, 2026",
      note: "Aggregate clicks/impressions declined in the same windows.",
    },
    {
      id: "ads-conv",
      label: "Current Search conversions",
      value: "5",
      periodLabel: "Latest verified 30-day Google Ads Search review",
      note: "Not a since-last-review growth comparison.",
    },
    {
      id: "gbp-clicks",
      label: "GBP website clicks",
      value: "777",
      periodLabel: "Google Business Profile · APR–SEP 2026",
      note: "Six-month footprint — not growth since the last review.",
    },
  ],

  organic: {
    methodology: [
      "Organic movement below uses matched 18-day Search Console comparison windows so previous and current periods are the same length.",
      "Previous comparison period: August 22 – September 8, 2026.",
      "Current comparison period: September 9 – September 26, 2026.",
      "Do not treat aggregate clicks or impressions as growth. The primary story is high-value query positioning.",
    ],
    previousPeriodLabel: "August 22 – September 8, 2026",
    currentPeriodLabel: "September 9 – September 26, 2026",
    previous: {
      clicksDisplay: "218",
      impressionsDisplay: "4,231",
      ctrDisplay: "5.15%",
    },
    current: {
      clicksDisplay: "152",
      impressionsDisplay: "2,589",
      ctrDisplay: "5.87%",
    },
    volumeNote: [
      "Overall organic volume remains in an early measurement and stabilization phase: clicks 218 → 152 and impressions 4,231 → 2,589 across the matched windows.",
      "CTR improved from 5.15% to 5.87%. That is a positive engagement signal, not a claim that aggregate traffic grew.",
      "High-value racing-school query positioning is the strongest current organic signal. Broader organic growth remains an active objective.",
    ],
    queries: [
      {
        query: "racing school atlanta",
        previousDisplay: "21.4",
        currentDisplay: "3.1",
        movement: "improved",
        note: "Dominant callout for this review.",
      },
      {
        query: "performance driving school",
        previousDisplay: "5.0",
        currentDisplay: "3.4",
        movement: "improved",
      },
      {
        query: "racing schools near me",
        previousDisplay: "3.5",
        currentDisplay: "2.4",
        movement: "improved",
      },
      {
        query: "racing school near me",
        previousDisplay: "1.91",
        currentDisplay: "3.57",
        movement: "context",
        note: "Still strong first-page visibility; not framed as an improvement.",
      },
      {
        query: "racing school",
        previousDisplay: "5.21",
        currentDisplay: "9.08",
        movement: "declined",
        note: "Broad query declined during the comparison period.",
      },
    ],
    closing: [
      "Following the major website, search and measurement upgrades, Primal’s strongest organic signal is concentration into high-intent racing-school queries — especially Atlanta.",
      "Protecting those positions and recovering broader “racing school” demand are both next-period priorities.",
    ],
  },

  localVisibility: {
    intro: [
      "Local Google visibility remains a core demand channel for Racing School discovery.",
      "The Google Business Profile figures below are a six-month footprint for April–September 2026. They are not a since-last-review comparison and must not be read as growth since the last review.",
    ],
    gbpPeriodLabel: "Google Business Profile · APR–SEP 2026",
    metrics: {
      viewsDisplay: "7,401",
      searchesDisplay: "1,211",
      interactionsDisplay: "1,156",
      websiteClicksDisplay: "777",
      callsDisplay: "52",
      ratingDisplay: "4.9",
      reviewsDisplay: "87",
    },
    searchTerms: [
      { term: "primal", appearancesDisplay: "914" },
      { term: "racing school", appearancesDisplay: "70" },
      { term: "primal motorsports", appearancesDisplay: "56" },
      { term: "race track", appearancesDisplay: "49" },
      { term: "primal racing", appearancesDisplay: "46" },
    ],
    devices: [
      {
        channel: "Google Search mobile",
        viewsDisplay: "3,977",
        shareDisplay: "54%",
      },
      {
        channel: "Google Search desktop",
        viewsDisplay: "1,813",
        shareDisplay: "24%",
      },
      {
        channel: "Google Maps mobile",
        viewsDisplay: "1,373",
        shareDisplay: "19%",
      },
      {
        channel: "Google Maps desktop",
        viewsDisplay: "238",
        shareDisplay: "3%",
      },
    ],
    closing: [
      "“racing school” is the #2 search term shown in GBP performance for this Apr–Sep window, behind branded “primal” demand.",
      "Public profile strength remains high at 4.9 rating across 87 Google reviews.",
    ],
  },

  googleAds: {
    performancePeriodLabel: "Latest verified 30-day Google Ads Search review",
    spendDisplay: "$2,401.20",
    conversionsDisplay: "5",
    cpaDisplay: "approximately $480",
    dailyBudgetDisplay: "$90/day",
    conversionDistribution: [
      "Broad “racing school” generated 4 of 5 conversions.",
      "“race car lessons” generated the other conversion.",
    ],
    performanceNotes: [
      "These figures are the latest verified Search review. They are not presented as an improvement over the previous leadership report because the reporting periods differ.",
      "Current campaign budget: $90/day, managed from measured intent rather than guesswork.",
      "Conversion efficiency still has room for improvement.",
    ],
    measurementNotes: [
      "Conversion measurement has been validated.",
      "Actual converting keyword and query behavior is now understood.",
      "Search-term review is active.",
    ],
    optimizationNotes: [
      "Converting broad-match traffic is being protected rather than blindly disabled.",
      "Irrelevant search traffic is being removed selectively.",
      "Budget allocation is being managed based on measured intent.",
      "Landing-page availability and offer alignment were corrected so paid traffic meets current open registration dates.",
    ],
  },

  conversionOptimization: {
    intro: [
      "The paid Racing School landing page had been displaying an expired September 10–11 availability window — a conversion-critical issue that was identified and corrected.",
    ],
    availabilityLabel: "Current verified availability",
    availabilityValue: "October 21–22, 2026",
    completed: [
      "Stale September dates were removed from production.",
      "The landing page now pulls school availability from the shared MotorsportReg event source.",
      "Preferred-date options, form presence, and CTA behavior were verified after the update.",
    ],
    verification: [
      "Lead measurement remained intact and was verified after the update.",
    ],
  },

  workCompleted: [
    "Search Console monitoring and matched-period organic query analysis",
    "Atlanta racing-school relevance work and ranking movement review",
    "Google Ads search-term cleanup and converting-query protection",
    "Conversion tracking validation and GA4 measurement review",
    "Paid Racing School landing-page conversion optimization",
    "Live MotorsportReg schedule integration for paid Racing School availability",
    "Google Business Profile / local visibility review (Apr–Sep footprint)",
    "Continued indexing and ranking monitoring",
  ],

  interpretation: {
    strong: [
      "Atlanta racing-school visibility in matched Search Console periods",
      "Verified high-intent racing-school organic rankings",
      "Local Google footprint and review strength (Apr–Sep)",
      "Verified paid Search conversions with clearer query control",
      "Measurement confidence and conversion-path control",
    ],
    stillImproving: [
      "Overall organic volume across matched windows",
      "Broad “racing school” average position",
      "Paid CPA efficiency",
      "Continued qualified lead volume",
      "Conversion efficiency as traffic quality is refined",
    ],
  },

  nextThirtyDays: [
    "Protect Atlanta and high-intent racing-school organic positions",
    "Recover broader “racing school” visibility",
    "Continue Google Ads search-term cleanup and negative-keyword discipline",
    "Improve qualified CPA while protecting converting demand",
    "Monitor landing-page conversion behavior and connect lead quality to source/program where measurable",
    "Continue local Search/Maps optimization and expand qualified non-branded racing-school demand",
  ],

  measurementCommitment: [
    "KXD will continue reporting consistently around organic visibility, qualified website leads, calls, paid acquisition efficiency, lead source and program demand where measurable, and conversion performance.",
    "Measurement windows stay explicit so incomplete or incompatible periods are never presented as percentage growth. The September 11 baseline remains on file as the prior leadership record.",
  ],

  footerNote:
    "Prepared by Kreate by Design for Primal Motorsports leadership. Questions welcome at matt@kreatebydesign.com.",
};
