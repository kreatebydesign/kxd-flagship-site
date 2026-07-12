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
  canTransitionScheduleStatus,
  isActiveScheduleStatus,
  isTerminalScheduleStatus,
  nextApprovalStatusForLifecycle,
  syncStatusAfterLocalSchedule,
} from "./lifecycle";

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
  CalendarMetadataProvider,
} from "./calendar-providers";

export {
  getCalendarAvailabilityProvider,
  getCalendarMetadataProvider,
  getSchedulingCalendarContext,
} from "./calendar-context";
export type { SchedulingCalendarContext } from "./calendar-context";

export {
  applyWorkScheduleProjection,
  clearWorkScheduleProjection,
  approveScheduleProposal,
  cancelScheduleProposal,
  createScheduleProposal,
  evaluateSchedulingPolicyForInput,
  markScheduleCompleted,
  rejectScheduleProposal,
  requestScheduleApproval,
  updateScheduleProposal,
} from "./services";
