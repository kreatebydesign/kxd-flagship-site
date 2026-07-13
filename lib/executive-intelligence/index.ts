/**
 * Phase 28A — Executive Intelligence Engine
 *
 * Permanent platform service for deterministic executive reasoning.
 * Every executive surface should consume this engine — not own recommendation logic.
 */

export { composeExecutiveIntelligence, type ComposeExecutiveIntelligenceInput } from "./compose";
export {
  collectEvidence,
  collectPortfolioEvidence,
  collectScheduleEvidence,
  isScheduleMaterial,
  type CollectEvidenceInput,
  type ScheduleEvidenceInput,
} from "./evidence";
export { interpretEvidence } from "./interpret";
export { buildOperatingPicture } from "./decide";
export { selectPrimaryRecommendation, buildExplainabilityPath } from "./recommend";
export { buildNarrativeInput } from "./narrative";
export {
  EXECUTIVE_CONFIDENCE_WEIGHT,
  EXECUTIVE_URGENCY_RANK,
  PORTFOLIO_CANDIDATE_TIER,
  SCHEDULE_CANDIDATE_TIER,
  executiveRankScore,
} from "./constants";
export { mapRecommendationToTodayBrief, mapRecommendationToTodayPrimary } from "./adapters/executive-today";
export { mapRecommendationToMorningFirstAction } from "./adapters/morning-first-action";
export type {
  DecisionPathStep,
  EvidenceDomain,
  EvidenceItem,
  EvidenceKind,
  ExecutiveConfidence,
  ExecutiveIntelligenceSurface,
  ExecutiveReversibility,
  ExecutiveUrgency,
  Explainability,
  Interpretation,
  InterpretationKind,
  NarrativeInput,
  OperatingPicture,
  PrimaryRecommendation,
} from "./types";
