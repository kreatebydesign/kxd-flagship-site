/**
 * Phase 17B — Business Brain Foundation
 *
 * Consumes observations. Produces structured business understanding.
 * Does not execute, mutate, automate, or render UI.
 *
 * Architecture:
 *   Observer → Observation Registry → Observation History → Business Brain → Future Pulse
 */

export type {
  BusinessBrainResult,
  BusinessBrainInput,
  BusinessBrainSummary,
  BusinessSignal,
  BusinessPattern,
  ExecutiveAttentionItem,
  BusinessSignalSeverity,
  BusinessPatternTrend,
} from "./types";

export {
  BUSINESS_SIGNAL_TAXONOMY,
  TAXONOMY_LABELS,
  taxonomyLabel,
  type BusinessSignalTaxonomy,
} from "./taxonomy";

export { buildBusinessSignals } from "./signals";
export { buildBusinessPatterns } from "./patterns";
export { buildExecutiveAttention, dominantThemes } from "./attention";
export { buildBusinessBrainSummary } from "./summary";

export {
  runBusinessBrain,
  buildBusinessBrain,
  getLatestBusinessBrainResult,
} from "./run";
