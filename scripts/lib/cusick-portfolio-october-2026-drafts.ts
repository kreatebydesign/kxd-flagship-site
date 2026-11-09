/**
 * October 2026 performance narrative drafts from production reporting_facts (read 2026-11-09).
 * Draft for founder review only. Not published. Not written to monthly_reports.
 */

export type PerformanceDraft = {
  clientId: number;
  clientName: string;
  reportingWindow: { start: "2026-10-01"; end: "2026-10-31" };
  status: "draft-for-founder-review";
  evidenceSource: "reporting_facts ingested 2026-11-01";
  metricsAvailable: string[];
  metricsMissing: string[];
  plainEnglish: string;
  versusSeptember: string | null;
  limitations: string[];
  recommendations: string[];
};

const sepOct = (clientId: number, key: string, sep: number | null, oct: number | null) => ({
  clientId,
  key,
  september: sep,
  october: oct,
});

function pctChange(sep: number, oct: number): string {
  if (sep === 0) return oct === 0 ? "unchanged at zero" : "up from zero in September";
  const pct = ((oct - sep) / sep) * 100;
  const dir = pct > 0 ? "up" : pct < 0 ? "down" : "flat";
  return `${dir} about ${Math.abs(pct).toFixed(0)}% versus September`;
}

export const OCTOBER_2026_PERFORMANCE_DRAFTS: PerformanceDraft[] = [
  {
    clientId: 5,
    clientName: "Cusick Morgan Motorsports",
    reportingWindow: { start: "2026-10-01", end: "2026-10-31" },
    status: "draft-for-founder-review",
    evidenceSource: "reporting_facts ingested 2026-11-01",
    metricsAvailable: [
      "sessions",
      "visitors",
      "pageviews",
      "search clicks",
      "search impressions",
      "search CTR",
      "average search position",
    ],
    metricsMissing: [],
    plainEnglish:
      "In October, about 262 visits to the website and 62 clicks from Google Search. Search visibility stayed active with about 1,850 impressions. Tracked conversions in analytics were zero for the month.",
    versusSeptember:
      `Website visits ${pctChange(303, 262)}. Search clicks ${pctChange(97, 62)}. Search impressions were about flat. Average search position moved slightly (about 8.4 in October vs 8.4 in September).`,
    limitations: [
      "Figures are from synced Google analytics and Search Console, not a live Google dashboard.",
      "Small sites can swing month to month; one month is not a trend.",
      "Analytics conversions are not the same as confirmed customer inquiries or sales.",
    ],
    recommendations: [
      "Continue Search Console monitoring already recorded as in-progress work.",
      "Review which pages earn the most search clicks before making content changes.",
      "Founder review before publishing an October client report in the portal.",
    ],
  },
  {
    clientId: 9,
    clientName: "On Track Performance",
    reportingWindow: { start: "2026-10-01", end: "2026-10-31" },
    status: "draft-for-founder-review",
    evidenceSource: "reporting_facts ingested 2026-11-01",
    metricsAvailable: ["search clicks", "search impressions", "search CTR", "average search position"],
    metricsMissing: ["GA4 sessions", "pageviews", "visitors (no October facts in reporting_facts)"],
    plainEnglish:
      "October search data shows about 41 clicks from Google and about 2,755 search impressions for the live On Track Performance site. Website visit counts were not available in the synced October facts.",
    versusSeptember:
      `Search clicks ${pctChange(52, 41)}. Impressions ${pctChange(3223, 2755)}.`,
    limitations: [
      "October reporting_facts include Search Console only for this client; GA4 website visit metrics were not present for comparison.",
      "The replacement website remains staged, not launched; this data reflects the current live site.",
    ],
    recommendations: [
      "Keep indexing follow-through on the live site (in-progress deliverable).",
      "Schedule a separate review of the staged replacement site when Don is ready.",
      "Founder review before publishing an October client report.",
    ],
  },
  {
    clientId: 10,
    clientName: "2475 Townsgate",
    reportingWindow: { start: "2026-10-01", end: "2026-10-31" },
    status: "draft-for-founder-review",
    evidenceSource: "reporting_facts ingested 2026-11-01",
    metricsAvailable: [
      "sessions",
      "visitors",
      "pageviews",
      "search clicks",
      "search impressions",
      "search CTR",
      "average search position",
    ],
    metricsMissing: [],
    plainEnglish:
      "October was the first full month with Google Analytics verified on the live Townsgate site (installed 2026-09-28). About 40 visits, 70 page views, and 17 search clicks. Tracked conversions were zero.",
    versusSeptember:
      `Website visits ${pctChange(5, 40)} after GA4 went live (September had only a handful of tracked visits). Search clicks ${pctChange(11, 17)}.`,
    limitations: [
      "September website visit numbers were pre-GA4 and are not comparable to October.",
      "Search and visit volumes are still modest for a multi-tenant property site.",
    ],
    recommendations: [
      "Continue post-install monitoring (in-progress deliverable #32).",
      "Use October as a baseline month going forward; avoid overstating growth from the install transition.",
      "Founder review before publishing an October client report.",
    ],
  },
  {
    clientId: 14,
    clientName: "OTP Carts",
    reportingWindow: { start: "2026-10-01", end: "2026-10-31" },
    status: "draft-for-founder-review",
    evidenceSource: "reporting_facts ingested 2026-11-01",
    metricsAvailable: [
      "sessions",
      "visitors",
      "pageviews",
      "search clicks",
      "search impressions",
      "generate_lead event count",
    ],
    metricsMissing: [],
    plainEnglish:
      "In October the live OTP Carts site had about 87 visits and 257 page views. Google Search sent about 9 clicks. Analytics recorded one website lead event for the month. That is an analytics signal, not a confirmed sale.",
    versusSeptember:
      `Website visits ${pctChange(70, 87)}. Search clicks ${pctChange(5, 9)}. Average search position improved from about 14.8 to about 10.0 in Search Console aggregates.`,
    limitations: [
      "The lead event is from analytics tagging, not a validated CRM or sale record.",
      "Social account setup in October (work #49–50) is separate from these website metrics.",
      "Westlake Google Business Profile verification is still waiting on the client.",
    ],
    recommendations: [
      "Complete Westlake profile verification so local search work can finish.",
      "Continue the planned November social sales push (work #56) after founder approval.",
      "Founder review before publishing an October client report.",
    ],
  },
];
