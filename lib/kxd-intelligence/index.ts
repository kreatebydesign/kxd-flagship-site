/**
 * Phase 21B — KXD Intelligence Layer
 *
 * Permanent operational reasoning system.
 * Not a chatbot. Not ChatGPT. Not an assistant.
 *
 * Observe → Remember → Reason → Recommend → Teach → Warn → Learn
 *
 * Consumes: Business Brain, Observer, Pulse, Narrative, Activity,
 * Memory, and future Work / Client / Training / Finance sources.
 * Does not duplicate their logic.
 */

export type {
  ClientIntelligenceView,
  IntelligenceBundle,
  IntelligenceConfidence,
  IntelligenceDisposition,
  IntelligenceDomain,
  IntelligenceEvidenceItem,
  IntelligenceExplanation,
  IntelligenceInsight,
  IntelligenceQueryContext,
  IntelligenceRecommendation,
  IntelligenceSourceId,
  IntelligenceUrgency,
  IntelligenceWorkspaceId,
  LearningIntelligenceView,
  OperationalWarning,
  WorkIntelligenceView,
} from "./types";

export {
  INTELLIGENCE_SURFACE_LIMIT,
  buildExplanation,
  buildInsight,
  buildRecommendation,
  buildWarning,
  confidenceRank,
  urgencyRank,
} from "./contract";

export { loadIntelligenceSources, type IntelligenceSources } from "./sources";
export { reasonFromSources } from "./reason";
export { runIntelligencePipeline } from "./pipeline";

export { getExecutiveInsight, getExecutiveInsights } from "./executive";
export { getWorkspaceInsight } from "./workspace";
export { getClientInsight, getClientIntelligenceView } from "./client";
export { getWorkInsight, getWorkIntelligenceView } from "./work";
export { getLearningInsight, getLearningIntelligenceView } from "./learning";
export { getRecommendation, getRecommendations } from "./recommendation";
export { getOperationalWarning, getOperationalWarnings } from "./warning";

export {
  answerExplanationQuestion,
  explainInsight,
  explainRecommendation,
  explainWarning,
  type IntelligenceExplanationQuestion,
} from "./explanations";

export {
  INTELLIGENCE_WORKSPACE_ADAPTERS,
  WORKSPACE_INTELLIGENCE_ADAPTERS,
  contextForWorkspace,
  getWorkspaceAdapter,
  loadActivityCenterIntelligence,
  loadClientSuccessIntelligence,
  loadExecutiveWorkspaceIntelligence,
  loadMorningBriefIntelligence,
  loadOperationsExperienceIntelligence,
  loadWebsiteReviewIntelligence,
  loadWorkEngineIntelligence,
  mapInsightToBusinessStatus,
  type IntelligenceWorkspaceAdapterId,
  type WorkspaceIntelligenceAdapter,
} from "./adapters";

export {
  MENTOR_CAPABILITIES,
  assessEscalationNeed,
  buildMentorContext,
  explainOperationalConcept,
  getGuidanceProvider,
  getMentorCapability,
  isMentorCapabilityId,
  recommendLearningNextStep,
  requestOperationsGuidance,
  reviewLearningProgress,
  setGuidanceProvider,
  type GuidanceProvider,
  type MentorCapabilityId,
  type OperationsGuidanceRequest,
  type OperationsGuidanceResponse,
  type OperationsMentorContext,
} from "./operations-mentor";
