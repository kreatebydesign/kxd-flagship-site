/**
 * Phase 25B — Executive Scheduling domain
 *
 * Work determines what. Calendar (later) determines when.
 * This package is the durable proposal / approval / policy foundation.
 * No Google Calendar integration in this phase.
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
