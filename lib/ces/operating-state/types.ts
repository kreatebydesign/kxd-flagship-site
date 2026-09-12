/**
 * Shared Client Operating State — business/operating intent for the portal.
 *
 * Configuration = operator-authored intent.
 * Connected systems / ReportingFacts = data truth.
 * Never store derived connection truth here.
 */

/** Operator-authored configuration persisted on CES profile (or supplied by a content pack). */
export type ClientOperatingStateConfig = {
  /** e.g. "Growth & Optimization" */
  phase?: string | null;
  /** Biggest opportunity / current priority */
  currentPriority?: string | null;
  /** Monitored outcomes shown as "Watching" */
  watching?: string | null;
  /** Fallback "Recent win" when timeline activity is empty */
  recentWin?: string | null;
  /**
   * Post-launch mode: website reviews are not launch blockers;
   * growth recommendation language wins when no client action is waiting.
   */
  mode?: "standard" | "post-launch" | null;
  /** Operator confirmation that production is verified (complements deploymentStatus). */
  productionVerified?: boolean | null;
  baseline?: {
    established?: boolean | null;
    date?: string | null;
    label?: string | null;
  } | null;
  /**
   * Optional authored copy — never treated as live ReportingFacts.
   * Suitable for client content packs.
   */
  content?: ClientOperatingContent | null;
};

export type ClientOperatingRecentProgressItem = {
  id: string;
  label: string;
  detail?: string | null;
  at?: string | null;
};

export type ClientOperatingWebsiteHealthContent = {
  serviceValue: string;
  serviceDetail: string;
  speedValue: string;
  speedDetail: string;
  searchFoundationValue: string;
  searchFoundationDetail: string;
  activityValueWhenConfigured: string;
  activityValueWhenPending: string;
  activityDetailWhenPending: string;
  releaseValue: string;
  releaseDetail: string;
};

/** Authored presentation copy — optional, never invents metrics. */
export type ClientOperatingContent = {
  recommendationHeadline?: string | null;
  recommendationRationale?: string | null;
  primaryActionLabel?: string | null;
  primaryActionHref?: string | null;
  secondaryActionLabel?: string | null;
  secondaryActionHref?: string | null;
  momentumLabel?: string | null;
  momentumDetail?: string | null;
  websitePanelNote?: string | null;
  adsPanelNote?: string | null;
  searchPanelFallback?: string | null;
  introduction?: string | null;
  collaborationStatusLabel?: string | null;
  collaborationExplanation?: string | null;
  outstandingKxdAction?: string | null;
  /** Connection-state note for Performance disclosure — not live facts. */
  homePerformanceNote?: string | null;
  /** Curated recent progress milestones — never raw Website Review titles. */
  recentProgress?: ClientOperatingRecentProgressItem[] | null;
  /** Website Status / health presentation labels for post-launch clients. */
  websiteHealth?: ClientOperatingWebsiteHealthContent | null;
};

/** Infrastructure signals used to derive website/production presentation. */
export type OperatingInfrastructureSignals = {
  deploymentStatus?: string | null;
  productionUrl?: string | null;
  ga4PropertyId?: string | null;
  searchConsoleSiteUrl?: string | null;
  googleAdsCustomerId?: string | null;
};

/** Entitlement + fact evidence for capability presentation (FALLBACK LAW). */
export type OperatingCapabilityEvidence = {
  seoEntitled: boolean;
  websiteAnalyticsEntitled: boolean;
  googleAdsEntitled: boolean;
  /** Persisted ReportingFacts exist for the capability domain in the selected period. */
  searchFactsPresent: boolean;
  websiteFactsPresent: boolean;
  adsFactsPresent: boolean;
};

/**
 * FALLBACK LAW presentation vocabulary.
 * Never convert authored status into fake live data.
 * Never treat entitlement as proof that data exists.
 */
export type CapabilityEvidenceState =
  | "connected"
  | "active"
  | "implemented"
  | "verified"
  | "reviewed"
  | "awaiting-signal"
  | "unavailable"
  | "not-connected";

export type ResolvedWebsiteOperatingPresentation = {
  websiteStatusLabel: string;
  productionStatusLabel: string;
  websiteStageLine: string;
  isLive: boolean;
  isProductionVerified: boolean;
};

export type ResolvedCapabilityPresentation = {
  state: CapabilityEvidenceState;
  summary: string;
  detail: string | null;
};

export type ResolvedClientOperatingState = {
  /** True when any operating config or content pack supplied post-launch intent. */
  postLaunchMode: boolean;
  phase: string | null;
  currentPriority: string | null;
  watching: string | null;
  recentWin: string | null;
  baselineEstablished: boolean;
  baselineDate: string | null;
  baselineLabel: string | null;
  website: ResolvedWebsiteOperatingPresentation;
  content: ClientOperatingContent;
  capabilities: {
    website: ResolvedCapabilityPresentation;
    search: ResolvedCapabilityPresentation;
    ads: ResolvedCapabilityPresentation;
    momentum: ResolvedCapabilityPresentation;
  };
};
