/**
 * Phase 25B / 26B.1 — Executive Scheduling domain types.
 * Durable proposals / links — not a calendar event mirror.
 */

export const SCHEDULE_LINK_COLLECTION = "work-schedule-links" as const;

export type ScheduleLinkStatus =
  | "draft"
  | "proposed"
  | "approval_required"
  | "approved"
  | "pending_calendar_write"
  | "rejected"
  | "scheduled"
  | "reschedule_required"
  | "canceled"
  | "completed"
  | "superseded"
  | "sync_error";

export type ScheduleApprovalStatus =
  | "none"
  | "pending"
  | "approved"
  | "rejected"
  | "auto_approved";

export type ScheduleSyncStatus =
  | "none"
  | "pending_write"
  | "synced"
  | "stale"
  | "deleted_remotely"
  | "error";

export type SchedulingMode = "suggest" | "direct" | "restricted";

export type SchedulingPermissionLevel = 1 | 2 | 3;

export type SchedulingConfidence = "low" | "medium" | "high";

export type SchedulingSource = "operator" | "policy" | "system";

/** Work denormalized projection — not source of truth. */
export type WorkSchedulingStatus =
  | "none"
  | "proposed"
  | "approved"
  | "pending_calendar_write"
  | "scheduled"
  | "conflict"
  | "sync_error";

export type SchedulingCapability =
  | "scheduling.suggest"
  | "scheduling.write-internal"
  | "scheduling.approve"
  | "scheduling.write-restricted"
  | "scheduling.manage-connection";

export type SchedulingPolicyDecision =
  | "allow-suggest"
  | "allow-direct"
  | "require-approval"
  | "block";

export interface SchedulingActor {
  userId: number | null;
  email: string | null;
  role: "admin" | "editor" | string | null;
  displayName?: string | null;
}

export interface SchedulingWorkContext {
  workId: number;
  title: string;
  priority: string;
  category: string;
  clientId: number | null;
  estimatedEffortHours: number | null;
  tags: string[];
  metadata?: Record<string, unknown> | null;
}

export interface SchedulingSlotInput {
  proposedStart: string;
  proposedEnd: string;
  timezone: string;
  durationMinutes: number;
}

export interface SchedulingPolicyInput {
  actor: SchedulingActor;
  work: SchedulingWorkContext;
  slot: SchedulingSlotInput;
  /** Operator intent: suggest-only vs attempt direct schedule. */
  intent: "suggest" | "direct";
  /** Declared external attendees — forces Level 3. */
  externalAttendees?: boolean;
  /** Operator-declared displacement of protected time. */
  displacesProtectedTime?: boolean;
  /** Unusual / high-impact change flag. */
  highImpactChange?: boolean;
}

export interface SchedulingPolicyEvidence {
  decision: SchedulingPolicyDecision;
  permissionLevel: SchedulingPermissionLevel;
  approvalRequired: boolean;
  schedulingMode: SchedulingMode;
  reasons: string[];
  blockingReasons: string[];
  warnings: string[];
  confidence: SchedulingConfidence;
  /**
   * Explicit: policy-valid ≠ calendar-available.
   * Phase 25B never claims availability.
   */
  policyValid: boolean;
  calendarAvailabilityAssessed: false;
  calendarAvailabilityNote: string;
}

export interface WorkScheduleLinkRecord {
  id: number;
  workId: number;
  calendarOwnerId: number | null;
  requestedById: number | null;
  approvedById: number | null;
  status: ScheduleLinkStatus;
  approvalStatus: ScheduleApprovalStatus;
  syncStatus: ScheduleSyncStatus;
  schedulingMode: SchedulingMode;
  permissionLevel: SchedulingPermissionLevel;
  proposedStart: string;
  proposedEnd: string;
  timezone: string;
  durationMinutes: number;
  schedulingReason: string | null;
  evidenceSummary: string | null;
  confidence: SchedulingConfidence;
  source: SchedulingSource;
  restrictionReason: string | null;
  rejectionReason: string | null;
  canceledReason: string | null;
  supersededReason: string | null;
  replacedById: number | null;
  googleCalendarId: string | null;
  googleEventId: string | null;
  googleEventEtag: string | null;
  googleEventUpdatedAt: string | null;
  googleEventHtmlLink: string | null;
  /** When the Google event was successfully written (Phase 26C). */
  calendarWriteAt: string | null;
  /** Last successful calendar sync/write timestamp. */
  lastSyncAt: string | null;
  policySnapshot: SchedulingPolicyEvidence | Record<string, unknown> | null;
  conflictSnapshot: Record<string, unknown> | null;
  displacedItemSnapshot: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateScheduleProposalInput {
  workId: number;
  proposedStart: string;
  proposedEnd: string;
  timezone?: string;
  durationMinutes?: number;
  schedulingReason?: string;
  intent?: "suggest" | "direct";
  externalAttendees?: boolean;
  displacesProtectedTime?: boolean;
  highImpactChange?: boolean;
  actor: SchedulingActor;
  calendarOwnerId?: number | null;
}

export interface UpdateScheduleProposalInput {
  linkId: number;
  proposedStart?: string;
  proposedEnd?: string;
  timezone?: string;
  durationMinutes?: number;
  schedulingReason?: string;
  actor: SchedulingActor;
}

export type SchedulingAuditAction =
  | "proposal_created"
  | "proposal_updated"
  | "proposal_superseded"
  | "proposal_reused"
  | "approval_requested"
  | "approved"
  | "pending_calendar_write"
  | "calendar_write_started"
  | "calendar_created"
  | "calendar_create_failed"
  | "calendar_linked"
  | "rejected"
  | "canceled"
  | "completed"
  | "projection_applied"
  | "projection_cleared"
  | "projection_healed"
  | "integrity_repair"
  | "policy_blocked"
  | "override_used";
