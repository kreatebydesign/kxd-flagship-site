export { staffActorFromUser, describeStaffActor } from "./actor";
export {
  requireStaffAwarePage,
  requireStaffCapabilityApi,
  requireAdminOversightApi,
  denyUnlessStaffAssignedWork,
  denyUnlessStaffClientRequest,
  getStaffActorOrNull,
  staffCanUseFullNav,
} from "./guard";
export {
  denyUnlessOperatorBulkClientActions,
  denyUnlessOperatorClientAccess,
  isCurrentSessionDeniedClientData,
  requireOperatorClientPageAccess,
} from "./operator-client-access";
export {
  evaluateBulkClientActionAuthorization,
  type BulkActionClientBinding,
} from "./bulk-client-action-access";
export { restrictedStaffBlocksClientData } from "./client-scope";
export { redirectRestrictedStaffFromPayloadAdmin } from "./payload-admin-redirect";
export {
  loadStaffToday,
  loadStaffGuidedWork,
  loadStaffWrapUp,
  getAssignedWorkForStaff,
  staffHomePathForUser,
  staffLandingPathForUser,
} from "./load";
export { loadStaffOversight } from "./oversight";
export { loadStaffMyWork } from "./my-work";
export {
  loadStaffMyClients,
  loadStaffClientWorkspace,
  STAFF_MY_CLIENTS_PATH,
} from "./client-context/load";
export type {
  StaffMyClientsData,
  StaffMyClientListItem,
  StaffClientWorkspaceData,
} from "./client-context/load";
export {
  validateStaffClientNoteInput,
  staffMayCreateClientNote,
  staffMayReadClientNotesForClient,
} from "./client-notes/policy";
export {
  STAFF_HOME_PATH,
  STAFF_WELCOME_PATH,
  STAFF_OVERSIGHT_PATH,
  STAFF_FOUNDATION_PATH_SLUG,
  actorHasStaffCapability,
  assertStaffCapability,
  isRestrictedStaff,
  normalizeStaffRole,
  staffLandingPathForActor,
  staffRoleTitle,
} from "./permissions";
export {
  STAFF_GUIDANCE_PROMPTS,
  buildDeterministicStaffGuidance,
  listSafeAssistedActions,
  listRestrictedActions,
} from "./guidance";
export {
  STAFF_RESPONSIBILITY_LIBRARY,
  listStaffResponsibilities,
  materializeResponsibilitiesForUser,
  upsertStaffResponsibility,
} from "./responsibilities";
export {
  responsibilityDueOn,
  responsibilitySourceId,
} from "./responsibility-rules";
export { buildStaffWrapUp, saveStaffWrapUpNote, loadSavedWrapUpNote } from "./wrap-up";
export {
  createStaffHelpRequest,
  listHelpRequestsForStaff,
  listOpenHelpRequestsForOversight,
  respondToHelpRequest,
  HELP_DEDUPE_WINDOW_MS,
} from "./help-requests";
export type { StaffHelpRequestRecord, StaffHelpStatus as HelpRequestStatus } from "./help-requests";
export { buildStaffPlan } from "./plan";
export {
  sortActionableWork,
  classifyActionableBand,
  isWaitingOnMatt,
  isReturnedWork,
  requiresMattApproval,
} from "./prioritize";
export {
  CURRENT_STUDIO_APPROVER_NAME,
  approvalStateLabelForTopic,
  approvalRequiredCountLabel,
  buildEscalationIntelligenceResponse,
  resolveAssignedApproverName,
  assignedApproverLine,
} from "./approval-presentation";
export {
  buildStaffPreviewSession,
  encodeStaffPreviewSession,
  decodeStaffPreviewSession,
  getStaffPreviewSession,
  setStaffPreviewCookie,
  clearStaffPreviewCookie,
  STAFF_PREVIEW_COOKIE,
} from "./preview";
export type {
  StaffActor,
  StaffCapability,
  StaffPlanBucket,
  StaffPlanItem,
  StaffPlanState,
  StaffPrimaryAction,
  StaffMorningOverview,
  StaffWaitingOnMattItem,
  StaffWrapUpData,
  StaffGuidancePrompt,
  StaffTodayData,
  StaffGuidedWorkData,
  StaffOversightMember,
  StaffOversightData,
  StaffPreviewSession,
  StaffRoleId,
  StaffResponsibilityTemplate,
  StaffResponsibilityCadence,
  StaffHelpRequestView,
  StaffHelpStatus,
} from "./types";
export type { StaffGuidanceRequest, StaffGuidanceResponse } from "./guidance";
