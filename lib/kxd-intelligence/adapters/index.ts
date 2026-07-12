export {
  INTELLIGENCE_WORKSPACE_ADAPTERS,
  WORKSPACE_INTELLIGENCE_ADAPTERS,
  contextForWorkspace,
  getWorkspaceAdapter,
  type IntelligenceWorkspaceAdapterId,
  type WorkspaceIntelligenceAdapter,
} from "./registry";

export { loadMorningBriefIntelligence } from "./morning-brief";
export { loadClientSuccessIntelligence } from "./client-success";
export { loadWorkEngineIntelligence } from "./work-engine";
export { loadOperationsExperienceIntelligence } from "./training";
export { loadWebsiteReviewIntelligence } from "./website-review";
export {
  loadExecutiveWorkspaceIntelligence,
  mapInsightToBusinessStatus,
} from "./executive-workspace";
export { loadActivityCenterIntelligence } from "./activity-center";
