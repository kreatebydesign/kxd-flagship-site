/**
 * Batch 3D — Work view navigation helpers (presentation only).
 */

import type { WorkViewId } from "./types";
import { WORK_VIEW_IDS, WORK_VIEW_LABELS } from "./types";

/** Mobile-first primary tabs (all map to existing view ids). */
export const WORK_VIEW_PRIMARY_IDS: WorkViewId[] = [
  "today",
  "overdue",
  "waiting-on-client",
  "all",
];

/** Less frequent views — mobile overflow menu only. */
export const WORK_VIEW_OVERFLOW_IDS: WorkViewId[] = WORK_VIEW_IDS.filter(
  (id) => !WORK_VIEW_PRIMARY_IDS.includes(id),
);

export const WORK_VIEW_COMPACT_LABELS: Partial<Record<WorkViewId, string>> = {
  "waiting-on-client": "Waiting on client",
  all: "All",
  inbox: "Inbox",
  upcoming: "Upcoming",
  "waiting-on-kxd": "Waiting on KXD",
  blocked: "Blocked",
  review: "Review",
  completed: "Completed",
};

export function workViewNavLabel(id: WorkViewId, compact = false): string {
  if (compact && WORK_VIEW_COMPACT_LABELS[id]) {
    return WORK_VIEW_COMPACT_LABELS[id]!;
  }
  return WORK_VIEW_LABELS[id];
}

export function workViewNavCount(
  id: WorkViewId,
  counts: Record<WorkViewId, number>,
): number {
  return counts[id] ?? 0;
}