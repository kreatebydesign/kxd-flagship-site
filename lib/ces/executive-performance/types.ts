/**
 * Phase 31A — Shared Core Executive Performance presentation tokens.
 * Configured per client — never hardcoded inside UI components.
 * Presentation only — never grants reporting entitlements.
 */

export type ExecutiveHeroOverlay = "graphite" | "soft" | "deep" | "none";

export type ExecutivePerformanceSectionId =
  | "hero"
  | "recommendation"
  | "performance"
  | "partnership"
  | "impact"
  | "progress"
  | "website-review"
  | "evolution"
  | "billing";

/**
 * Presentation theme for the Executive Performance Workspace.
 * Future clients = configuration entry. No engineering rewrite.
 * Brand/imagery/copy only — capabilities come from Client Experience Profiles.
 */
export type ExperiencePresentation = {
  /** Enable the Executive Performance Workspace on portal home. */
  enabled: boolean;
  heroImageSrc: string;
  heroImageAlt: string;
  heroOverlay: ExecutiveHeroOverlay;
  logoSrc: string | null;
  logoAlt: string;
  workspaceEyebrow: string;
  workspaceTitle: string;
  introduction: string;
  sectionOrder?: ExecutivePerformanceSectionId[];
};

export type PerformanceConnectionState = "connected" | "awaiting-signal" | "not-connected";

export type ExecutivePerformancePanel = {
  id: string;
  title: string;
  domainLabel: string;
  state: PerformanceConnectionState;
  summary: string;
  detail: string | null;
  evidenceLabels: string[];
};

export type ExecutivePartnershipItem = {
  id: string;
  label: string;
  detail: string;
  complete: boolean;
};

export type ExecutiveImpactItem = {
  id: string;
  label: string;
  detail: string;
  hasEvidence: boolean;
};

export type ExecutiveEvolutionItem = {
  id: string;
  label: string;
  detail: string;
};

export type ExecutivePerformanceBriefing = {
  clientId: number;
  clientName: string;
  clientSlug: string | null;
  presentation: ExperiencePresentation;
  greeting: string;
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
  partnership: ExecutivePartnershipItem[];
  impact: ExecutiveImpactItem[];
  evolution: ExecutiveEvolutionItem[];
  currentFocus: string;
  /** Recent improvements from partnership activity — empty when none. */
  recentImprovements: Array<{
    id: string;
    label: string;
    detail: string | null;
    at: string | null;
  }>;
  momentumLabel: string | null;
  composedAt: string;
};
