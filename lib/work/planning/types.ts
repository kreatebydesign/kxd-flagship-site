/**
 * Phase 24A — Work Planning types.
 * Daily execution plan is independent of due dates.
 */

import type { WorkListItem, WorkPriority, WorkStatus } from "../types";

export type WorkViewId =
  | "today"
  | "inbox"
  | "upcoming"
  | "overdue"
  | "waiting-on-client"
  | "waiting-on-kxd"
  | "blocked"
  | "review"
  | "completed"
  | "all";

export type WorkSortId =
  | "recommended"
  | "due-date"
  | "priority"
  | "recently-updated"
  | "client"
  | "oldest-waiting";

export type WorkDueRange = "any" | "overdue" | "today" | "week" | "later" | "none";

export interface WorkViewFilters {
  clientId?: number | null;
  status?: WorkStatus | null;
  priority?: WorkPriority | null;
  assignedToId?: number | null;
  dueRange?: WorkDueRange | null;
  tag?: string | null;
}

export interface WorkViewContextHints {
  /** Work ids elevated by Executive Focus. */
  focusWorkIds: number[];
  /** Work ids from Executive Attention (work-kind). */
  attentionWorkIds: number[];
  /** Waiting / blocked ids from Executive Waiting. */
  waitingWorkIds: number[];
}

export type WorkTodayGroupId =
  | "needs-attention"
  | "in-progress"
  | "planned"
  | "completed-today";

export interface WorkTodayGroup {
  id: WorkTodayGroupId;
  label: string;
  items: WorkListItem[];
}

export interface WorkViewResult {
  view: WorkViewId;
  sort: WorkSortId;
  filters: WorkViewFilters;
  items: WorkListItem[];
  /** Today view only — calm groups; omit empty. */
  groups: WorkTodayGroup[] | null;
  emptyMessage: string;
  counts: Record<WorkViewId, number>;
  generatedAt: string;
}

export interface WorkFilterOption {
  value: string;
  label: string;
}

export interface WorkFilterOptions {
  clients: WorkFilterOption[];
  statuses: WorkFilterOption[];
  priorities: WorkFilterOption[];
  assignees: WorkFilterOption[];
  tags: WorkFilterOption[];
  dueRanges: WorkFilterOption[];
  sorts: WorkFilterOption[];
  views: WorkFilterOption[];
}

export interface GetWorkViewInput {
  view?: WorkViewId | string | null;
  sort?: WorkSortId | string | null;
  filters?: WorkViewFilters;
  /** Preloaded pool — avoids duplicate Payload reads. */
  pool?: WorkListItem[];
  contextHints?: WorkViewContextHints;
  now?: Date;
}

export const WORK_VIEW_IDS: WorkViewId[] = [
  "today",
  "inbox",
  "upcoming",
  "overdue",
  "waiting-on-client",
  "waiting-on-kxd",
  "blocked",
  "review",
  "completed",
  "all",
];

export const WORK_VIEW_LABELS: Record<WorkViewId, string> = {
  today: "Today",
  inbox: "Inbox",
  upcoming: "Upcoming",
  overdue: "Overdue",
  "waiting-on-client": "Waiting on Client",
  "waiting-on-kxd": "Waiting on KXD",
  blocked: "Blocked",
  review: "Review",
  completed: "Completed",
  all: "All Work",
};

export const WORK_VIEW_EMPTY: Record<WorkViewId, string> = {
  today: "Nothing needs attention today.",
  inbox: "The inbox is clear.",
  upcoming: "Nothing is coming due soon.",
  overdue: "No overdue work.",
  "waiting-on-client": "No work is waiting on a client.",
  "waiting-on-kxd": "Nothing is waiting on KXD.",
  blocked: "Nothing is blocked.",
  review: "No work is in review.",
  completed: "No completed work in the recent window.",
  all: "No work items yet.",
};

export const WORK_SORT_LABELS: Record<WorkSortId, string> = {
  recommended: "Recommended",
  "due-date": "Due date",
  priority: "Priority",
  "recently-updated": "Recently updated",
  client: "Client",
  "oldest-waiting": "Oldest waiting",
};

export const WORK_DUE_RANGE_LABELS: Record<WorkDueRange, string> = {
  any: "Any due date",
  overdue: "Overdue",
  today: "Due today",
  week: "Due this week",
  later: "Due later",
  none: "No due date",
};
