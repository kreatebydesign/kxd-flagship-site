/**
 * Phase 31A / 31A.2 / visual refinement — Shared Core Executive Performance
 * presentation tokens. Presentation only — never grants reporting entitlements.
 */

export type ExecutiveHeroOverlay = "graphite" | "soft" | "deep" | "none";

/** Workspace zones — Shared Core layout; presentation may reorder. */
export type ExecutiveWorkspaceZoneId =
  | "summary"
  | "performance"
  | "progress"
  | "collaboration"
  | "growth"
  | "account";

/**
 * Presentation theme for the Executive Performance Workspace.
 * Future clients = configuration entry. No component fork.
 */
export type ExperiencePresentation = {
  enabled: boolean;
  /**
   * Executive Client Briefing (/portal/partnership).
   * Requires authored Executive Memory. Defaults false when omitted.
   */
  briefingEnabled?: boolean;
  /**
   * Editorial hero photograph (not a webpage screenshot).
   * Empty string → graphite editorial fallback (no fabricated image).
   */
  heroImageSrc: string;
  heroImageAlt: string;
  heroOverlay: ExecutiveHeroOverlay;
  /** CSS background-position for intentional crop (e.g. "center 42%"). */
  heroFocus?: string;
  logoSrc: string | null;
  logoAlt: string;
  workspaceEyebrow: string;
  workspaceTitle: string;
  introduction: string;
  /**
   * Action accent — CTAs, completed beats, partnership emphasis.
   * Applied as --kxd-ces-exec-action.
   */
  actionAccent?: string;
  /**
   * Intelligence accent — reporting, provenance, strategic emphasis.
   * Applied as --kxd-ces-exec-intelligence. Quiet; never paints the whole UI.
   */
  intelligenceAccent?: string;
  /** Optional zone order — defaults to Shared Core sequence. */
  zoneOrder?: ExecutiveWorkspaceZoneId[];
};

export type PerformanceConnectionState = "connected" | "awaiting-signal" | "not-connected";

/** Pre-formatted ReportingFact values for connected panels — never invented. */
export type ExecutivePanelMetric = {
  key: string;
  label: string;
  value: string;
  trend?: "up" | "down" | "flat" | "unknown" | null;
};

export type ExecutivePerformancePanel = {
  id: string;
  title: string;
  domainLabel: string;
  state: PerformanceConnectionState;
  /** Concise line — empty string when state alone is enough. */
  summary: string;
  detail: string | null;
  evidenceLabels: string[];
  /** Present only when ReportingFacts exist for this panel. */
  metrics?: ExecutivePanelMetric[];
};

export type ExecutivePartnershipItem = {
  id: string;
  label: string;
  detail: string;
  complete: boolean;
  /** Highlighted in primary progress strip; others may fold into disclosure. */
  priority?: boolean;
};

export type ExecutiveImpactItem = {
  id: string;
  label: string;
  detail: string;
  hasEvidence: boolean;
};

export type ExecutiveEvolutionMaturity = "available-now" | "next" | "future";

export type ExecutiveEvolutionItem = {
  id: string;
  label: string;
  detail: string;
  maturity: ExecutiveEvolutionMaturity;
};

export type ExecutiveSummaryFacts = {
  currentPhase: string;
  currentFocus: string;
  nextMilestone: string;
  lastMajorMilestone: string;
  /**
   * Presentation vocabulary for meta cells.
   * Defaults evolve toward live intelligence labels without layout changes.
   */
  labels: {
    phase: string;
    focus: string;
    next: string;
    recent: string;
  };
};

export type ExecutiveCollaboration = {
  statusLabel: string;
  explanation: string;
  primaryAction: { label: string; href: string } | null;
  secondaryAction: { label: string; href: string } | null;
  recentActivity: Array<{ id: string; label: string; at: string | null }>;
};

export type ExecutiveAccount = {
  engagementStatus: string;
  billingAvailability: string;
  note: string;
};

export type ExecutiveProgressBeat = {
  id: string;
  label: string;
  complete: boolean;
};

/**
 * Provenance for the Performance zone — period + source only.
 * Never invents metrics; empty providers when no ReportingFacts exist.
 */
export type ExecutiveReportingProvenance = {
  /** Requested reporting window label (e.g. "July 2026"). */
  periodLabel: string;
  /** Human provider names present in loaded facts (e.g. "Search Console"). */
  providerLabels: string[];
  factCount: number;
  /** Honest status when entitled but empty, or when no capabilities. */
  statusNote: string | null;
};

export type ExecutivePerformanceBriefing = {
  clientId: number;
  clientName: string;
  clientSlug: string | null;
  presentation: ExperiencePresentation;
  greeting: string;
  summary: ExecutiveSummaryFacts;
  recommendation: {
    headline: string;
    rationale: string;
    evidenceLabels: string[];
  };
  primaryAction: {
    label: string;
    href: string;
  } | null;
  performancePanels: ExecutivePerformancePanel[];
  /** Reporting window + provider source (facts-backed). */
  reportingProvenance: ExecutiveReportingProvenance;
  /** Primary progress items (5–7). */
  partnershipPrimary: ExecutivePartnershipItem[];
  /** Secondary history — progressive disclosure. */
  partnershipSecondary: ExecutivePartnershipItem[];
  /** Compact journey beats. */
  progressBeats: ExecutiveProgressBeat[];
  /** Evidence-backed working signals (optional, compact). */
  workingSignals: ExecutiveImpactItem[];
  recentImprovements: Array<{
    id: string;
    label: string;
    detail: string | null;
    at: string | null;
  }>;
  collaboration: ExecutiveCollaboration;
  evolution: ExecutiveEvolutionItem[];
  account: ExecutiveAccount;
  momentumLabel: string | null;
  composedAt: string;
};

/** @deprecated Prefer zoneOrder — kept for type export stability during 31A.2. */
export type ExecutivePerformanceSectionId = ExecutiveWorkspaceZoneId;
