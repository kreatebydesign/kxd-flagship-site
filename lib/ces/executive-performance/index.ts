/**
 * Phase 31A — Executive Performance Workspace (Shared Core).
 */

export type {
  ExperiencePresentation,
  ExecutiveAccount,
  ExecutiveCollaboration,
  ExecutiveEvolutionItem,
  ExecutiveEvolutionMaturity,
  ExecutiveHeroOverlay,
  ExecutiveImpactItem,
  ExecutivePanelMetric,
  ExecutivePartnershipItem,
  ExecutivePerformanceBriefing,
  ExecutivePerformancePanel,
  ExecutivePerformanceSectionId,
  ExecutiveProgressBeat,
  ExecutiveReportingProvenance,
  ExecutiveSummaryFacts,
  ExecutiveWorkspaceZoneId,
  PerformanceConnectionState,
} from "./types";

export {
  getExecutivePresentation,
  getExecutiveZoneOrder,
  isExecutivePerformanceAvailable,
  executivePresentationToCssVars,
  listExecutivePresentationSlugs,
} from "./presentation";

export {
  getExecutivePartnershipValue,
  splitPartnershipPriority,
} from "./partnership-value";

export {
  evolutionMaturityLabel,
  getExecutiveEvolution,
} from "./evolution";

export {
  executivePanelNarrative,
  executivePanelTitle,
} from "./panel-presentation";

export {
  buildExecutivePanelMetrics,
  formatExecutiveMetricValue,
} from "./panel-metrics";
