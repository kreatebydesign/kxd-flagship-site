/**
 * Primal Motorsports — Digital Performance & Growth Report
 * Post-Launch Baseline · September 11, 2026
 *
 * Manually verified facts for leadership review.
 * Do not replace with live ReportingFacts silently.
 */

import type { LeadershipReportDocument } from "./types";

export const PRIMAL_LEADERSHIP_REPORT_ID = "primal-september-2026-post-launch";

export const PRIMAL_LEADERSHIP_REPORT: LeadershipReportDocument = {
  id: PRIMAL_LEADERSHIP_REPORT_ID,
  clientSlug: "primal-motorsports",
  clientName: "Primal Motorsports",
  reportDateLabel: "September 11, 2026",
  reportDateIso: "2026-09-11",
  title: "Digital Performance & Growth Report",
  subtitle: "PRIMAL MOTORSPORTS",
  periodLabel: "Post-Launch Baseline · September 2026",
  supportingLine:
    "The new Primal platform is live. This report documents where things stand now, what was verified after launch, what the data is telling us, and what we're working on next.",
  heroImageSrc: "/migrated-assets/projects/primal-motorsports-hero.jpg",
  heroImageAlt: "Radical race cars on track — Primal Motorsports",
  logoSrc: "/migrated-assets/logos/primal.svg",
  logoAlt: "Primal Motorsports",
  accent: "#A83424",

  executiveSummary: [
    "The new Primal Motorsports website launched on September 9 and has completed its post-launch technical review.",
    "The site is live and working across Primal's primary commercial paths, including Racing Schools, Driving Programs, Racing, Radical inventory, Service, Parts, and Contact.",
    "Google Search Console is active. GA4 is receiving production traffic. Lead tracking is working. Google Ads is recording website leads and calls.",
    "Following production launch, KXD completed a full technical verification pass and closed several production optimization items across search, lead handling, page performance, and commercial routes.",
    "With the production platform now live and verified, the focus moves to measurable growth.",
    "The next phase is improving qualified traffic, search visibility, advertising efficiency, and lead volume — with September 11 serving as the documented baseline.",
  ],

  statusItems: [
    { id: "website", label: "Production Website", status: "verified", statusLabel: "Verified" },
    {
      id: "qa",
      label: "Post-Launch Technical QA",
      status: "passed",
      statusLabel: "Passed",
    },
    {
      id: "gsc",
      label: "Google Search Console",
      status: "active",
      statusLabel: "Active",
    },
    {
      id: "sitemap",
      label: "Production Sitemap",
      status: "healthy",
      statusLabel: "Healthy",
    },
    { id: "ga4", label: "GA4", status: "active", statusLabel: "Active" },
    {
      id: "leads",
      label: "Lead Tracking",
      status: "active",
      statusLabel: "Active",
    },
    {
      id: "ads",
      label: "Google Ads",
      status: "active-converting",
      statusLabel: "Active + Converting",
    },
    {
      id: "routes",
      label: "Commercial Routes / Forms",
      status: "verified",
      statusLabel: "Verified",
    },
    {
      id: "remediation",
      label: "Post-Launch Verification",
      status: "complete",
      statusLabel: "Complete",
    },
  ],

  historicalBaselineNote: [
    "KXD was not provided a complete historical reporting package covering analytics, conversions, lead quality, and revenue attribution when the project began.",
    "As part of the current audit, KXD recovered the available historical Google Search Console data from Primal's previous primalracing.com property.",
    "That information gives useful context around historical organic search visibility, but it is not a complete old-versus-new business-performance baseline.",
  ],

  searchEquityIntro: [
    "Primal entered the transition with established organic search equity around its brand, Radical vehicles, and racing-school demand.",
    "The work through the rebuild was to preserve that value while rebuilding the website around Primal's current business — and creating stronger control over content, conversion paths, and measurement.",
  ],

  historicalQueries: [
    { query: "Primal Racing School", averagePosition: 1.35, positionDisplay: "1.35" },
    { query: "Primal Racing", averagePosition: 1.76, positionDisplay: "1.76" },
    { query: "Radical SR1 for Sale", averagePosition: 4.17, positionDisplay: "4.17" },
    { query: "Radical RXC for Sale", averagePosition: 5.2, positionDisplay: "5.20" },
    { query: "Radical SR3 XXR Price", averagePosition: 3.0, positionDisplay: "3.00" },
    { query: "Radical Racing School", averagePosition: 4.62, positionDisplay: "4.62" },
    { query: "Racing School Atlanta", averagePosition: 6.09, positionDisplay: "6.09" },
  ],

  searchEquityClose: [
    "These historical positions show the search authority worth protecting through the platform transition.",
  ],

  organicBaseline: {
    periodKind: "recent-baseline",
    periodLabel: "Recent 3-month / cross-launch Search Console baseline",
    clicks: 1219,
    clicksDisplay: "1,219",
    impressions: 22500,
    impressionsDisplay: "22,500",
    ctrDisplay: "5.4%",
    averagePositionDisplay: "9.2",
    note: "These figures cover a recent Search Console window that includes time before and after the September 9 launch. They are not generated entirely by the new website.",
    currentQueries: [
      { query: "Primal Motorsports", averagePosition: 1.3, positionDisplay: "1.3" },
      { query: "Primal Racing School", averagePosition: 2.0, positionDisplay: "2.0" },
      { query: "Racing School Near Me", averagePosition: 4.3, positionDisplay: "4.3" },
      { query: "Racing Schools Near Me", averagePosition: 4.5, positionDisplay: "4.5" },
      { query: "Racing School", averagePosition: 5.3, positionDisplay: "5.3" },
      { query: "Radical SR1 for Sale", averagePosition: 5.4, positionDisplay: "5.4" },
      { query: "Radical SR3 for Sale", averagePosition: 6.6, positionDisplay: "6.6" },
      { query: "Radical for Sale", averagePosition: 7.8, positionDisplay: "7.8" },
    ],
    visibilityNote:
      "Primal continues to appear prominently for branded searches, racing-school searches, and Radical purchase-intent searches. This is not a claim that every ranking improved because of the new site.",
  },

  searchOpportunity: {
    title: "Priority search opportunity",
    query: "racing school atlanta",
    recentPositionNote: "Current recent baseline: approximately position 17",
    historicalContext:
      "Historical primalracing.com data showed stronger visibility for this query.",
    framing: [
      "Strengthening Atlanta-area racing-school relevance is part of the next SEO phase.",
      "This is a priority opportunity — not a claim that KXD lost the ranking.",
    ],
    supportingVisibility: [
      "racing school",
      "racing school near me",
      "racing schools near me",
      "Radical purchase-intent terms",
    ],
  },

  googleAds: {
    periodLabel: "August 12 – September 10, 2026",
    periodKind: "ads-reporting",
    spendDisplay: "$2,613.13",
    clicksDisplay: "630",
    impressionsDisplay: "25,840",
    primaryConversionsDisplay: "6",
    primaryBreakdown: [
      "5 website lead submissions",
      "1 direct call from an ad",
    ],
    primaryClarifier:
      "These were verified as Primary conversion actions. Secondary diagnostic events are not included in the lead count.",
  },

  bottomFunnel: {
    title: "Bottom Funnel · Racing School",
    august: {
      conversionsDisplay: "2",
      spendDisplay: "$1,319.78",
      cpaDisplay: "$659.89",
    },
    september: {
      conversionsDisplay: "3",
      spendDisplay: "$864.29",
      cpaDisplay: "$288.10",
    },
    cpaChangeDisplay: "approximately 56% lower cost per conversion",
    cpaCaveat:
      "September is still a small sample. We are treating this as encouraging movement, not a finished trend.",
    septemberSearchCtrDisplay: "10.04%",
    septemberImpressionShareDisplay: "24.03%",
    notes: [
      "Primal is capturing only part of the available eligible search demand.",
      "The goal is not simply to spend more. The goal is to improve efficiency and lead quality first, then expand where the numbers justify it.",
    ],
  },

  adsAudit: {
    intro: [
      "Broad match is not automatically the problem. Some broad keywords are producing conversions.",
      "At the same time, several keywords and search terms are spending meaningful budget without converting.",
      "KXD is tightening the campaign based on actual conversion data — not by blindly disabling broad match.",
    ],
    examples: [
      {
        id: "broad-racing-school",
        matchType: "Broad",
        term: "racing school",
        spendDisplay: "$557.88",
        conversionsDisplay: "2",
        cpaDisplay: "$278.94",
      },
      {
        id: "broad-race-car-lessons",
        matchType: "Broad",
        term: "race car lessons",
        spendDisplay: "$265.71",
        conversionsDisplay: "1.5",
        cpaDisplay: "$177.14",
      },
      {
        id: "phrase-professional",
        matchType: "Phrase",
        term: "professional racing school",
        spendDisplay: "$100.26",
        conversionsDisplay: "1",
        cpaDisplay: "$100.26",
      },
      {
        id: "exact-atlanta",
        matchType: "Exact",
        term: "race car driving experience atlanta",
        spendDisplay: "$327.10",
        conversionsDisplay: "0",
        cpaDisplay: "—",
      },
    ],
    close: [
      "These examples explain the cleanup work underway: protect what converts, tighten what spends without results.",
    ],
  },

  upperFunnel: {
    budgetDisplay: "$20/day",
    auditedSpendDisplay: "$429.05",
    conversionsDisplay: "1",
    septemberSpendDisplay: "$223.62",
    septemberConversionsDisplay: "0",
    notes: [
      "Budget allocation is under review.",
      "Dollars need to earn their place. KXD is evaluating whether more of this budget belongs in higher-intent Search.",
    ],
  },

  measurement: {
    ga4PropertyId: "549908814",
    snapshotLabel: "Recent 7-day snapshot reviewed",
    activeUsersDisplay: "71",
    newUsersDisplay: "52",
    eventsDisplay: "616",
    keyEventsDisplay: "2",
    generateLeadNote: "generate_lead is configured as a Key Event",
    formStartNote: "form_start is firing",
    postLaunchLeadNote:
      "At least one generate_lead event was recorded after the September 9 launch",
    clarifiers: [
      "Not every GA4 event is a qualified lead.",
      "GA4 proves the measurement chain is working. Lead quality will continue to be evaluated against actual inquiries.",
    ],
  },

  remediationsIntro:
    "Following production launch, KXD completed a full technical verification pass across search, lead handling, page performance, and commercial routes.",

  remediations: [
    {
      id: "redirects",
      completed:
        "Historical Primal URLs were permanently redirected into their correct current Racing School and Radical destinations.",
    },
    {
      id: "titles",
      completed:
        "Search page titles were standardized and verified across production.",
    },
    {
      id: "local-business",
      completed:
        "Primal's public phone and postal information were completed within LocalBusiness structured data.",
    },
    {
      id: "paid-landing",
      completed:
        "The paid Racing School landing page was separated from organic indexing while preserving Google Ads functionality.",
    },
    {
      id: "lead-persist",
      completed:
        "Service and Parts lead handling was strengthened so accepted inquiries persist even if an email notification fails.",
    },
    {
      id: "image",
      completed:
        "A major SR3 image asset was reduced from approximately 4.49 MB to approximately 444 KB while preserving its original 4000×2370 dimensions.",
    },
  ],

  remediationsClose: "Final post-launch production status: VERIFIED",

  platformCompleted: {
    intro:
      "Primal now has a production platform it can operate and grow from — not just a redesigned homepage.",
    items: [
      "New production website",
      "Racing Schools, Driving Programs, Performance School, Advanced Racing School",
      "Competition / SCCA pathway, Track Days, SCCA Racing, Radical Cup, Bring Yours",
      "Radical SR1, SR3, and SR10 / RXC where applicable, plus inventory",
      "Service, Parts, and Contact / inquiry paths",
      "Lead tracking, GA4, Google Ads tracking, Search Console, and sitemap",
      "Mobile navigation and technical SEO infrastructure",
    ],
  },

  nextWork: {
    seo: [
      "Strengthen Atlanta racing-school visibility",
      "Protect existing page-one racing-school visibility",
      "Grow non-branded search demand",
      "Continue Radical purchase-intent visibility",
      "Monitor post-launch indexing and rankings",
    ],
    ads: [
      "Tighten weak search terms",
      "Protect converting broad-match traffic",
      "Review the $327 non-converting Atlanta exact keyword",
      "Review Upper Funnel allocation",
      "Improve landing-page / search-intent alignment",
      "Improve qualified cost per lead before scaling spend",
    ],
    conversion: [
      "Monitor actual lead quality",
      "Identify which programs generate the strongest inquiries",
      "Improve paths based on behavior and data rather than subjective redesign",
    ],
  },

  plan: [
    {
      id: "30",
      horizon: "30 days",
      title: "Stabilize + Optimize",
      items: [
        "Monitor post-launch organic rankings and indexing",
        "Complete Ads search-term cleanup",
        "Improve Atlanta racing-school relevance",
        "Establish qualified lead reporting",
        "Measure landing-page performance",
        "Compare September baseline to the first full post-launch month",
      ],
    },
    {
      id: "60",
      horizon: "60 days",
      title: "Build on What Converts",
      items: [
        "Expand search visibility around proven queries",
        "Shift Ads budget toward better-performing demand",
        "Improve pages where search intent and conversion behavior show opportunity",
        "Track lead quality by program and source",
        "Measure organic non-brand movement",
      ],
    },
    {
      id: "90",
      horizon: "90 days",
      title: "Make the Growth Decisions",
      items: [
        "Compare organic visibility against baseline",
        "Compare Ads cost per lead and lead quality against baseline",
        "Identify strongest programs and channels",
        "Determine where additional budget is justified",
        "Present leadership with the next growth priorities based on three months of clean measurement",
      ],
    },
  ],

  futureDirection: [
    "The current website and measurement foundation also give Primal a base for future operational and customer features, including the planned Driver Portal direction.",
    "That work is not claimed as delivered here. It is the natural next platform conversation once performance measurement is stable.",
  ],

  measurementCommitment: [
    "September 11, 2026 is the documented post-launch baseline.",
    "From this point forward, KXD will measure the same core areas consistently: organic search visibility, qualified website leads, calls, Google Ads cost per lead, lead source, program demand, and conversion performance.",
    "That gives Primal a consistent 30 / 60 / 90-day comparison instead of disconnected snapshots.",
  ],

  footerNote:
    "Prepared by Kreate by Design for Primal Motorsports leadership. Questions welcome at matt@kreatebydesign.com.",
};
