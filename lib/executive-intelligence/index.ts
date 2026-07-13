/**
 * Phase 28A/28B — Executive Intelligence Engine
 *
 * Permanent platform service for deterministic executive reasoning.
 * Every executive surface should consume this engine — not own recommendation logic.
 *
 * RULE: No new founder-level recommendation logic may be introduced outside this domain.
 */

export { composeExecutiveIntelligence, type ComposeExecutiveIntelligenceInput } from "./compose";
export {
  collectEvidence,
  collectPortfolioEvidence,
  collectScheduleEvidence,
  collectSignalEvidence,
  isScheduleMaterial,
  type CollectEvidenceInput,
  type ScheduleEvidenceInput,
  type SignalEvidenceSource,
} from "./evidence";
export { interpretEvidence } from "./interpret";
export { buildOperatingPicture } from "./decide";
export {
  selectPrimaryRecommendation,
  buildExplainabilityPath,
  buildUserFacingExplainability,
} from "./recommend";
export { buildNarrativeInput } from "./narrative";
export { assessConfidence, evidenceCompleteness } from "./confidence";
export { recommendationFingerprint, shouldReplaceRecommendation } from "./fingerprint";
export {
  EXECUTIVE_CONFIDENCE_WEIGHT,
  EXECUTIVE_URGENCY_RANK,
  LEGACY_URGENCY_RANK_INVERTED,
  PORTFOLIO_CANDIDATE_TIER,
  SCHEDULE_CANDIDATE_TIER,
  executiveRankScore,
} from "./constants";
export { mapRecommendationToTodayBrief, mapRecommendationToTodayPrimary } from "./adapters/executive-today";
export { mapRecommendationToMorningFirstAction } from "./adapters/morning-first-action";
export { mapRecommendationToFocusDecision } from "./adapters/focus";
export { mapRecommendationToContextPriority } from "./adapters/executive-context";
export type {
  DecisionClass,
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
  OutrankedCandidateSummary,
  PrimaryRecommendation,
  RecommendationActionType,
  UserFacingExplainability,
} from "./types";
export { DECISION_CLASS_LABEL } from "./types";
