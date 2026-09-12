/**
 * Leadership Performance Report — typed document model.
 * Verified operator-authored facts only. Never invent live metrics.
 */

export type LeadershipReportPeriodKind =
  | "historical"
  | "recent-baseline"
  | "post-launch"
  | "ads-reporting";

export type LeadershipScoreStatus =
  | "verified"
  | "passed"
  | "active"
  | "healthy"
  | "active-converting"
  | "complete";

export type LeadershipQueryPosition = {
  query: string;
  averagePosition: number;
  positionDisplay: string;
};

export type LeadershipStatusItem = {
  id: string;
  label: string;
  status: LeadershipScoreStatus;
  statusLabel: string;
};

export type LeadershipRemediationItem = {
  id: string;
  found: string;
  fixed: string;
};

export type LeadershipKeywordExample = {
  id: string;
  matchType: string;
  term: string;
  spendDisplay: string;
  conversionsDisplay: string;
  cpaDisplay: string;
};

export type LeadershipPlanPhase = {
  id: string;
  horizon: string;
  title: string;
  items: string[];
};

export type LeadershipReportDocument = {
  id: string;
  clientSlug: string;
  clientName: string;
  reportDateLabel: string;
  reportDateIso: string;
  title: string;
  subtitle: string;
  periodLabel: string;
  supportingLine: string;
  heroImageSrc: string;
  heroImageAlt: string;
  logoSrc: string;
  logoAlt: string;
  accent: string;
  executiveSummary: string[];
  statusItems: LeadershipStatusItem[];
  historicalBaselineNote: string[];
  searchEquityIntro: string[];
  historicalQueries: LeadershipQueryPosition[];
  searchEquityClose: string[];
  organicBaseline: {
    periodKind: LeadershipReportPeriodKind;
    periodLabel: string;
    clicks: number;
    clicksDisplay: string;
    impressions: number;
    impressionsDisplay: string;
    ctrDisplay: string;
    averagePositionDisplay: string;
    note: string;
    currentQueries: LeadershipQueryPosition[];
    visibilityNote: string;
  };
  searchOpportunity: {
    title: string;
    query: string;
    recentPositionNote: string;
    historicalContext: string;
    framing: string[];
    supportingVisibility: string[];
  };
  googleAds: {
    periodLabel: string;
    periodKind: LeadershipReportPeriodKind;
    spendDisplay: string;
    clicksDisplay: string;
    impressionsDisplay: string;
    primaryConversionsDisplay: string;
    primaryBreakdown: string[];
    primaryClarifier: string;
  };
  bottomFunnel: {
    title: string;
    august: { conversionsDisplay: string; spendDisplay: string; cpaDisplay: string };
    september: { conversionsDisplay: string; spendDisplay: string; cpaDisplay: string };
    cpaChangeDisplay: string;
    cpaCaveat: string;
    septemberSearchCtrDisplay: string;
    septemberImpressionShareDisplay: string;
    notes: string[];
  };
  adsAudit: {
    intro: string[];
    examples: LeadershipKeywordExample[];
    close: string[];
  };
  upperFunnel: {
    budgetDisplay: string;
    auditedSpendDisplay: string;
    conversionsDisplay: string;
    septemberSpendDisplay: string;
    septemberConversionsDisplay: string;
    notes: string[];
  };
  measurement: {
    ga4PropertyId: string;
    snapshotLabel: string;
    activeUsersDisplay: string;
    newUsersDisplay: string;
    eventsDisplay: string;
    keyEventsDisplay: string;
    generateLeadNote: string;
    formStartNote: string;
    postLaunchLeadNote: string;
    clarifiers: string[];
  };
  remediations: LeadershipRemediationItem[];
  remediationsClose: string;
  platformCompleted: {
    intro: string;
    items: string[];
  };
  nextWork: {
    seo: string[];
    ads: string[];
    conversion: string[];
  };
  plan: LeadershipPlanPhase[];
  futureDirection: string[];
  measurementCommitment: string[];
  footerNote: string;
};
