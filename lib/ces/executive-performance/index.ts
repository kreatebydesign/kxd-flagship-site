/**
 * Phase 31A — Executive Performance Workspace (Shared Core).
 */

export type {
  ExperiencePresentation,
  ExecutiveEvolutionItem,
  ExecutiveHeroOverlay,
  ExecutiveImpactItem,
  ExecutivePartnershipItem,
  ExecutivePerformanceBriefing,
  ExecutivePerformancePanel,
  ExecutivePerformanceSectionId,
  PerformanceConnectionState,
} from "./types";

export {
  getExecutivePresentation,
  isExecutivePerformanceAvailable,
} from "./presentation";

export { getExecutivePartnershipValue } from "./partnership-value";
export { getExecutiveEvolution } from "./evolution";

/** Server compose — import from compose.ts in RSC / loaders only. */
