/**
 * Leadership Performance Progress Update — typed document model.
 * Operator-authored verified facts only. Distinct from the post-launch baseline shape.
 */

export type LeadershipProgressMovementKind =
  | "improved"
  | "declined"
  | "stable"
  | "new"
  | "context";

export type LeadershipProgressScorecardItem = {
  id: string;
  label: string;
  value: string;
  periodLabel: string;
  note?: string;
};

export type LeadershipProgressQueryRow = {
  query: string;
  previousDisplay: string;
  currentDisplay: string;
  movement: LeadershipProgressMovementKind;
  note?: string;
};

export type LeadershipProgressGbpDeviceRow = {
  channel: string;
  viewsDisplay: string;
  shareDisplay: string;
};

export type LeadershipProgressGbpSearchTerm = {
  term: string;
  appearancesDisplay: string;
};

export type LeadershipProgressReportDocument = {
  kind: "progress-update";
  id: string;
  clientSlug: string;
  clientName: string;
  reportDateLabel: string;
  reportDateIso: string;
  title: string;
  subtitle: string;
  periodLabel: string;
  /** Measurement cutoff — not publication/delivery date. */
  dataThroughLabel: string;
  supportingLine: string;
  heroImageSrc: string;
  heroImageAlt: string;
  logoSrc: string;
  logoAlt: string;
  accent: string;
  printDocumentTitle: string;

  /** Archive listing helpers */
  archiveTypeLabel: string;
  archivePeriodLabel: string;
  archiveSummary: string;

  executiveSummary: string[];

  /** Concise early proof of active production — business language only. */
  workHighlights: Array<{
    id: string;
    label: string;
    detail: string;
  }>;

  heroCallout: {
    eyebrow: string;
    query: string;
    previousDisplay: string;
    currentDisplay: string;
    body: string[];
    caveat: string;
  };

  scorecardIntro: string[];
  scorecard: LeadershipProgressScorecardItem[];

  organic: {
    methodology: string[];
    previousPeriodLabel: string;
    currentPeriodLabel: string;
    previous: {
      clicksDisplay: string;
      impressionsDisplay: string;
      ctrDisplay: string;
    };
    current: {
      clicksDisplay: string;
      impressionsDisplay: string;
      ctrDisplay: string;
    };
    volumeNote: string[];
    queries: LeadershipProgressQueryRow[];
    closing: string[];
  };

  localVisibility: {
    intro: string[];
    gbpPeriodLabel: string;
    metrics: {
      viewsDisplay: string;
      searchesDisplay: string;
      interactionsDisplay: string;
      websiteClicksDisplay: string;
      callsDisplay: string;
      ratingDisplay: string;
      reviewsDisplay: string;
    };
    searchTerms: LeadershipProgressGbpSearchTerm[];
    devices: LeadershipProgressGbpDeviceRow[];
    closing: string[];
  };

  googleAds: {
    performancePeriodLabel: string;
    spendDisplay: string;
    conversionsDisplay: string;
    cpaDisplay: string;
    dailyBudgetDisplay: string;
    conversionDistribution: string[];
    performanceNotes: string[];
    measurementNotes: string[];
    optimizationNotes: string[];
  };

  conversionOptimization: {
    intro: string[];
    availabilityLabel: string;
    availabilityValue: string;
    completed: string[];
    verification: string[];
  };

  workCompleted: string[];

  interpretation: {
    strong: string[];
    stillImproving: string[];
  };

  nextThirtyDays: string[];

  measurementCommitment: string[];

  footerNote: string;
};
