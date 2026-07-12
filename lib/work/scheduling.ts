/**
 * Phase 26A — Schedule Work experience helpers (client-safe).
 */

import type { WorkListItem, WorkStatus } from "@/lib/work/types";

export const SCHEDULE_WORK_OPEN_EVENT = "kxd:schedule-work:open";
export const SCHEDULE_WORK_CLOSE_EVENT = "kxd:schedule-work:close";
export const SCHEDULE_WORK_PROPOSED_EVENT = "kxd:schedule-work:proposed";

export type ScheduleWorkOpenDetail = {
  workId: number;
};

export type ScheduleWorkProposedDetail = {
  workId: number;
  linkId: number;
  proposedStart: string;
  proposedEnd: string;
};

const INACTIVE_STATUSES: WorkStatus[] = ["completed", "archived"];

/**
 * Show Schedule Work when work is open and not already in a schedule flow.
 */
export function canShowScheduleWorkAction(work: WorkListItem): boolean {
  if (INACTIVE_STATUSES.includes(work.status)) return false;
  if (work.schedulingStatus === "scheduled") return false;
  if (work.schedulingStatus === "proposed") return false;
  if (work.schedulingStatus === "approved") return false;
  if (work.schedulingStatus === "pending_calendar_write") return false;
  return work.schedulingStatus === "none" || work.schedulingStatus === "conflict";
}

/** Duration minutes from Time Budget hours; default 60 when unset. */
export function resolveScheduleDurationMinutes(
  estimatedEffortHours: number | null | undefined,
): { minutes: number; fromEstimate: boolean } {
  if (
    estimatedEffortHours != null &&
    Number.isFinite(estimatedEffortHours) &&
    estimatedEffortHours > 0
  ) {
    return {
      minutes: Math.max(15, Math.round(estimatedEffortHours * 60)),
      fromEstimate: true,
    };
  }
  return { minutes: 60, fromEstimate: false };
}

export function openScheduleWork(workId: number): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<ScheduleWorkOpenDetail>(SCHEDULE_WORK_OPEN_EVENT, {
      detail: { workId },
    }),
  );
}

export function closeScheduleWork(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(SCHEDULE_WORK_CLOSE_EVENT));
}

export function emitScheduleWorkProposed(
  detail: ScheduleWorkProposedDetail,
): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<ScheduleWorkProposedDetail>(SCHEDULE_WORK_PROPOSED_EVENT, {
      detail,
    }),
  );
}

export const SCHEDULING_STATUS_LABELS: Record<
  WorkListItem["schedulingStatus"],
  string
> = {
  none: "Not scheduled",
  proposed: "Proposed",
  approved: "Approved",
  pending_calendar_write: "Pending calendar write",
  scheduled: "Scheduled",
  conflict: "Conflict",
  sync_error: "Sync error",
};

export function formatScheduleDay(iso: string, timeZone: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone,
      weekday: "long",
      month: "long",
      day: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function formatScheduleTimeRange(
  startIso: string,
  endIso: string,
  timeZone: string,
): string {
  try {
    const start = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(startIso));
    const end = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(endIso));
    return `${start} – ${end}`;
  } catch {
    return `${startIso} – ${endIso}`;
  }
}

export function formatConfidenceLabel(
  confidence: "low" | "medium" | "high",
): string {
  if (confidence === "high") return "High";
  if (confidence === "medium") return "Medium";
  return "Low";
}
