/**
 * Phase 25B — Explicit lifecycle transitions for schedule links.
 * Invalid transitions throw — no arbitrary status mutation.
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
  draft: ["proposed", "canceled"],
  proposed: ["approval_required", "approved", "canceled"],
  approval_required: ["approved", "rejected", "canceled"],
  approved: ["scheduled", "canceled"],
  rejected: ["proposed", "canceled"],
  scheduled: [
    "reschedule_required",
    "canceled",
    "completed",
    "sync_error",
  ],
  reschedule_required: ["proposed", "approval_required", "canceled"],
  canceled: [],
  completed: [],
  sync_error: ["scheduled", "reschedule_required", "canceled"],
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
      return "none";
    case "approval_required":
      return "pending";
    case "approved":
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
 * Phase 25B: after approval we enter `scheduled` with pending_write.
 * Google write happens in a later phase — sync stays pending.
 */
export function syncStatusAfterLocalSchedule(): ScheduleSyncStatus {
  return "pending_write";
}

export function isTerminalScheduleStatus(status: ScheduleLinkStatus): boolean {
  return status === "canceled" || status === "completed";
}

export function isActiveScheduleStatus(status: ScheduleLinkStatus): boolean {
  return (
    status === "proposed" ||
    status === "approval_required" ||
    status === "approved" ||
    status === "scheduled" ||
    status === "reschedule_required" ||
    status === "sync_error"
  );
}
