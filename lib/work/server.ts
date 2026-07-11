export { getWorkWorkspace, getClientWorkWorkspace, getClientWork, countOpenWorkForClient } from "./engine";
export { createWork, spawnWorkFromSource, updateWorkStatus, getWorkById } from "./runner";
export { publishWorkTimelineEvent } from "./timeline";
export { seedManualWorkForClient } from "./seed";
export {
  createWorkItem,
  updateWorkItem,
  completeWorkItem,
  archiveWorkItem,
  getWorkItem,
  transitionWorkItem,
  getWorkEngineWorkspace,
  getTodayWork,
  getUpcomingWork,
  getBlockedWork,
  getWaitingOnClient,
  getWaitingOnKXD,
  getOverdueWork,
  setWorkStatus,
} from "./services";

/** Phase 14C — canonical integration contract for all subsystems */
export {
  spawnWork,
  updateWork,
  completeWork,
  archiveWork,
  startWork,
  linkRelationship,
  unlinkRelationship,
  publishWorkEvent,
  assignWorkNumber,
  getWorkSourceAdapter,
  listWorkSourceAdapters,
  formatWorkNumber,
  parseWorkNumber,
} from "./integration";

export {
  spawnWorkFromWebsiteReview,
  findWorkForWebsiteReview,
} from "./bridges/website-review";
export type {
  SpawnWorkFromWebsiteReviewInput,
  SpawnWorkFromWebsiteReviewResult,
} from "./bridges/website-review";
