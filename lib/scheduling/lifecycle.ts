/**
 * Phase 25B / 26B.1 — Explicit lifecycle transitions for schedule links.
 * Invalid transitions throw — no arbitrary status mutation.
 *
 * Lifecycle (pre–Google write):
 * draft → proposed → approval_required → approved → pending_calendar_write → scheduled
 *
 * `scheduled` requires a confirmed Google Calendar event (Phase 26C+).
 * Approval alone must never imply scheduled.
 */

import type {
  ScheduleApprovalStatus,
  ScheduleLinkStatus,
  ScheduleSyncStatus,
} from "./types";

export class SchedulingTransitionError extends Error {
  constructor(
    public readonly from: ScheduleLinkStatus,
    public readonly to: ScheduleLinkStatus,
    message?: string,
  ) {
    super(
      message ??
        `Invalid scheduling transition: ${from} → ${to}.`,
    );
    this.name = "SchedulingTransitionError";
  }
}

/** Allowed status edges. */
export const SCHEDULE_STATUS_TRANSITIONS: Record<
  ScheduleLinkStatus,
  readonly ScheduleLinkStatus[]
> = {
  draft: ["proposed", "canceled", "superseded"],
  proposed: ["approval_required", "approved", "canceled", "superseded"],
  approval_required: ["approved", "rejected", "canceled", "superseded"],
  approved: ["pending_calendar_write", "canceled", "superseded"],
  pending_calendar_write: [
    "scheduled",
    "canceled",
    "superseded",
    "sync_error",
  ],
  rejected: ["proposed", "canceled", "superseded"],
  scheduled: [
    "reschedule_required",
    "canceled",
    "completed",
    "sync_error",
  ],
  reschedule_required: [
    "proposed",
    "approval_required",
    "canceled",
    "superseded",
  ],
  canceled: [],
  completed: [],
  superseded: [],
  sync_error: [
    "pending_calendar_write",
    "scheduled",
    "reschedule_required",
    "canceled",
    "superseded",
  ],
};

export function canTransitionScheduleStatus(
  from: ScheduleLinkStatus,
  to: ScheduleLinkStatus,
): boolean {
  if (from === to) return true;
  return SCHEDULE_STATUS_TRANSITIONS[from].includes(to);
}

export function assertScheduleStatusTransition(
  from: ScheduleLinkStatus,
  to: ScheduleLinkStatus,
): void {
  if (!canTransitionScheduleStatus(from, to)) {
    throw new SchedulingTransitionError(from, to);
  }
}

export function nextApprovalStatusForLifecycle(
  status: ScheduleLinkStatus,
  opts?: { autoApproved?: boolean },
): ScheduleApprovalStatus {
  switch (status) {
    case "draft":
    case "proposed":
    case "canceled":
    case "completed":
    case "superseded":
      return "none";
    case "approval_required":
      return "pending";
    case "approved":
    case "pending_calendar_write":
    case "scheduled":
    case "reschedule_required":
    case "sync_error":
      return opts?.autoApproved ? "auto_approved" : "approved";
    case "rejected":
      return "rejected";
    default:
      return "none";
  }
}

/**
 * After approval: sync awaits a future Google Calendar write.
 * Does not mean the event exists.
 */
export function syncStatusAfterApproval(): ScheduleSyncStatus {
  return "pending_write";
}

/** @deprecated Use syncStatusAfterApproval — approval ≠ scheduled. */
export function syncStatusAfterLocalSchedule(): ScheduleSyncStatus {
  return syncStatusAfterApproval();
}

export function isTerminalScheduleStatus(status: ScheduleLinkStatus): boolean {
  return (
    status === "canceled" ||
    status === "completed" ||
    status === "superseded"
  );
}

/**
 * Active / blocking statuses for the one-proposal-per-Work invariant.
 * Includes draft and pending_calendar_write; excludes superseded.
 */
export function isActiveScheduleStatus(status: ScheduleLinkStatus): boolean {
  return (
    status === "draft" ||
    status === "proposed" ||
    status === "approval_required" ||
    status === "approved" ||
    status === "pending_calendar_write" ||
    status === "reschedule_required" ||
    status === "scheduled" ||
    status === "sync_error"
  );
}

/**
 * Reserved for Phase 26C+: confirm local schedule only after Google event linkage.
 * Callers must supply a confirmed external event id — this does not call Google.
 */
export function canConfirmScheduledFromPendingWrite(input: {
  status: ScheduleLinkStatus;
  googleEventId: string | null | undefined;
}): boolean {
  return (
    input.status === "pending_calendar_write" &&
    typeof input.googleEventId === "string" &&
    input.googleEventId.trim().length > 0
  );
}
