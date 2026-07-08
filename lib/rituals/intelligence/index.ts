/**
 * Phase 18A — Executive Ritual Intelligence Integration
 * Adapters between Phase 17 stack and ritual presentation.
 */

export type {
  RitualIntelligenceBundle,
  MorningBriefIntelligence,
  FocusIntelligence,
  FocusAwarenessItem,
  WeeklyReviewIntelligence,
  ReviewPatternItem,
  RitualNarrativeBlock,
} from "./types";

export { loadRitualIntelligence } from "./load";
export { buildMorningBriefIntelligence } from "./morning";
export { buildFocusIntelligence } from "./focus";
export { buildWeeklyReviewIntelligence } from "./review";
