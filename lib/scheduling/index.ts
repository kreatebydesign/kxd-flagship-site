/**
 * Phase 25B–25C — Executive Scheduling domain
 *
 * Work determines what. Calendar (via provider interfaces) determines when.
 * Google Calendar reads live in lib/google/calendar — Scheduling never calls Google directly.
 */

export { schedulingActorFromUser } from "./actor";

export type {
  CreateScheduleProposalInput,
  ScheduleApprovalStatus,
  ScheduleLinkStatus,
  ScheduleSyncStatus,
  SchedulingActor,
  SchedulingAuditAction,
  SchedulingCapability,
  SchedulingConfidence,
  SchedulingMode,
  SchedulingPermissionLevel,
  SchedulingPolicyDecision,
  SchedulingPolicyEvidence,
  SchedulingPolicyInput,
  SchedulingSlotInput,
  SchedulingSource,
  SchedulingWorkContext,
  UpdateScheduleProposalInput,
  WorkScheduleLinkRecord,
  WorkSchedulingStatus,
} from "./types";

export { SCHEDULE_LINK_COLLECTION } from "./types";

export {
  SCHEDULE_STATUS_TRANSITIONS,
  SchedulingTransitionError,
  assertScheduleStatusTransition,
  canConfirmScheduledFromPendingWrite,
  canTransitionScheduleStatus,
  isActiveScheduleStatus,
  isTerminalScheduleStatus,
  nextApprovalStatusForLifecycle,
  syncStatusAfterApproval,
  syncStatusAfterLocalSchedule,
} from "./lifecycle";

export {
  ACTIVE_SCHEDULE_PROPOSAL_STATUSES,
  INACTIVE_SCHEDULE_PROPOSAL_STATUSES,
  INTEGRITY_SUPERSEDE_REASON,
  ActiveProposalConflictError,
  ConcurrentProposalMutationError,
  activeProposalConflictMessage,
  activeProposalPrecedence,
  assertSingleActiveProposal,
  isActiveScheduleProposal,
  sameProposedWindow,
  selectAuthoritativeActiveProposal,
  workProjectionStatusForLink,
} from "./active-proposal";

export {
  ALL_SCHEDULING_CAPABILITIES,
  SUGGEST_ONLY_CAPABILITIES,
  actorHasCapability,
  assertCapability,
  isFounderActor,
  resolveSchedulingCapabilities,
} from "./permissions";

export {
  SCHEDULING_WORKING_HOURS,
  UNUSUAL_DURATION_MINUTES,
  evaluateSchedulingPolicy,
} from "./policy";

export type {
  ExecutiveContextSchedulingSummary,
  SchedulingIntelligenceEvidence,
  SchedulingOperationalKind,
  SchedulingSignalEvidence,
} from "./boundaries";

export type {
  CalendarAvailabilityProvider,
  CalendarEventWriter,
  CalendarMetadataProvider,
} from "./calendar-providers";

export {
  getCalendarAvailabilityProvider,
  getCalendarEventWriter,
  getCalendarMetadataProvider,
  getSchedulingCalendarContext,
} from "./calendar-context";
export type { SchedulingCalendarContext } from "./calendar-context";

export {
  findSchedulingCandidates,
  generateCandidateSlots,
  getAvailabilitySummary,
  getNextAvailableWorkWindow,
  normalizeBusyBlocks,
  validateProposedSlot,
  validateProposedSlotAvailability,
} from "./availability";

export type {
  AvailabilitySummary,
  CandidateSlot,
  FindCandidatesResult,
  SlotValidationResult,
} from "./availability";

export {
  applyWorkScheduleProjection,
  clearWorkScheduleProjection,
  approveScheduleProposal,
  assertSingleActiveProposalForWork,
  cancelScheduleProposal,
  confirmScheduleAfterGoogleEvent,
  createScheduleProposal,
  evaluateSchedulingPolicyForInput,
  findActiveProposalForWork,
  findActiveProposalsForWork,
  markScheduleCompleted,
  rejectScheduleProposal,
  repairActiveProposalsForWork,
  requestScheduleApproval,
  supersedeScheduleProposal,
  updateScheduleProposal,
  writeApprovedScheduleToCalendar,
} from "./services";

export {
  getSchedulingProposalDetail,
  listSchedulingProposals,
} from "./proposals-list";

export {
  SCHEDULING_WORKSPACE_GROUPS,
  SCHEDULING_WORKSPACE_GROUP_LABELS,
  buildWorkspaceCapabilities,
  canActorAdjustProposal,
  canActorCancelProposal,
  confidenceLabel,
  dedupeActiveProposalsPerWork,
  groupProposals,
  humanScheduleLinkStatus,
  workspaceGroupForStatus,
} from "./workspace";
export type {
  SchedulingProposalAuditEntry,
  SchedulingProposalCard,
  SchedulingProposalDetail,
  SchedulingWorkspaceCapabilities,
  SchedulingWorkspaceGroupId,
} from "./workspace";
