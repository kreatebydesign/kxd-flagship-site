export { EXECUTIVE_OPS_COORDINATOR_TRACK } from "./growth-track";
export {
  KXD_INTELLIGENCE_CAPABILITIES,
  defaultIntelligencePromptsForLesson,
  requestKxdIntelligenceAssist,
} from "./intelligence";
export type {
  KxdIntelligenceAssistRequest,
  KxdIntelligenceCapabilityId,
  KxdIntelligenceContext,
} from "./intelligence";

export type {
  OperationalPracticeKind,
  OperationalPracticeSpec,
  OperationsGrowthTrack,
  TrainingChecklistItem,
  TrainingDashboardData,
  TrainingImage,
  TrainingIntelligencePrompt,
  TrainingLessonContent,
  TrainingLessonDefinition,
  TrainingLessonProgress,
  TrainingLessonStatus,
  TrainingLessonView,
  TrainingOperationsFrame,
  TrainingPathDefinition,
  TrainingPathStatus,
  TrainingPathView,
  TrainingPermissions,
  TrainingPracticeWorkSpec,
  TrainingProgressStatus,
  TrainingResource,
  TrainingStep,
  TrainingWalkthroughStep,
  TrainingWorkStage,
} from "./types";

export { TRAINING_CATALOG, getCatalogLesson, getCatalogPath, listCatalogLessonsFlat } from "./catalog";
export {
  TRAINING_HOME,
  TRAINING_LESSONS_COLLECTION,
  TRAINING_PATHS_COLLECTION,
  TRAINING_PROGRESS_COLLECTION,
  trainingLessonHref,
  trainingPathHref,
} from "./constants";
export {
  getTrainingPermissions,
  learnerKeyFromUser,
  learnerLabelFromUser,
} from "./permissions";
export {
  TRAINING_WORK_STAGE_ORDER,
  buildPracticeWorkSpecFromLesson,
  getNextTrainingWorkStage,
  prepareSupervisedPracticeFromLesson,
} from "./work-bridge";
export { seedTrainingCatalog, ensureTrainingSeeded } from "./seed";
export {
  completeTrainingLesson,
  getTrainingDashboard,
  getTrainingLesson,
  getTrainingPath,
  updateTrainingChecklist,
} from "./services";
