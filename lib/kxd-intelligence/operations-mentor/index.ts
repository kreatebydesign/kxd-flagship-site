/**
 * Phase 21C — Operations Intelligence Mentor
 */

export {
  MENTOR_CAPABILITIES,
  getMentorCapability,
  isMentorCapabilityId,
  type MentorCapabilityId,
} from "./capabilities";

export type {
  ArtifactReviewKind,
  ArtifactReviewPlaceholder,
  ChecklistCorrection,
  GuidanceMode,
  GuidanceTaskComplexity,
  MentorUsageLogEntry,
  MentorUsageMeta,
  OperationsGuidanceRequest,
  OperationsGuidanceResponse,
  OperationsMentorContext,
} from "./types";

export {
  MENTOR_ANSWER_MAX_CHARS,
  MENTOR_STEP_MAX_CHARS,
  clip,
  detectUnsupportedTopic,
} from "./boundaries";

export {
  DeterministicGuidanceProvider,
  getGuidanceProvider,
  resetGuidanceProvider,
  setGuidanceProvider,
  shouldAttemptInterpretation,
  type GuidanceProvider,
} from "./provider";

export { buildMentorContext, reviewChecklist } from "./context";
export { listRecentMentorUsage } from "./usage";

export {
  assessEscalationNeed,
  explainOperationalConcept,
  recommendLearningNextStep,
  requestOperationsGuidance,
  reviewLearningProgress,
} from "./guidance";

export {
  buildDeterministicGuidance,
  mattStyleGuidance,
  recoverFromMistake,
  reviewBeforeSending,
  showExample,
  walkThroughLesson,
} from "./deterministic";
