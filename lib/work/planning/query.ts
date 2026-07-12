/**
 * Phase 24A — Pure work view query: filter → view → sort → group.
 * Client-safe. No Payload. No AI.
 */

import { PRIORITY_RANK } from "../constants";
import type { WorkListItem } from "../types";
import {
  filterCompletedToday,
  filterOpenWork,
  filterOverdueWork,
  filterQueue,
  filterUpcomingWork,
  filterWorkByStatus,
  isDueToday,
  isPlannedForToday,
  isStartToday,
  isWorkOverdue,
  sortWorkByDueDateAsc,
  sortWorkByPriority,
  sortWorkByUpdatedDesc,
} from "../views";
import { dateKeyEquals, parseDateKey, toLocalDateKey } from "./dates";
import type {
  GetWorkViewInput,
  WorkSortId,
  WorkTodayGroup,
  WorkTodayGroupId,
  WorkViewContextHints,
  WorkViewFilters,
  WorkViewId,
  WorkViewResult,
} from "./types";
import {
  WORK_SORT_LABELS,
  WORK_VIEW_EMPTY,
  WORK_VIEW_IDS,
  WORK_VIEW_LABELS,
} from "./types";

const EMPTY_HINTS: WorkViewContextHints = {
  focusWorkIds: [],
  attentionWorkIds: [],
  waitingWorkIds: [],
};

export function parseWorkViewId(value: string | null | undefined): WorkViewId {
  if (value && WORK_VIEW_IDS.includes(value as WorkViewId)) {
    return value as WorkViewId;
  }
  return "today";
}

export function parseWorkSortId(value: string | null | undefined): WorkSortId {
  if (value && value in WORK_SORT_LABELS) return value as WorkSortId;
  return "recommended";
}

function elevatedSet(hints: WorkViewContextHints): Set<number> {
  return new Set([
    ...hints.focusWorkIds,
    ...hints.attentionWorkIds,
    ...hints.waitingWorkIds,
  ]);
}

export function isElevatedWork(
  item: WorkListItem,
  hints: WorkViewContextHints = EMPTY_HINTS,
): boolean {
  return elevatedSet(hints).has(item.id);
}

/** Membership in the Today execution set (before grouping). */
export function belongsInTodaySet(
  item: WorkListItem,
  hints: WorkViewContextHints = EMPTY_HINTS,
  now = new Date(),
): boolean {
  if (item.status === "archived") return false;
  if (item.status === "completed") {
    return filterCompletedToday([item]).length > 0;
  }
  if (!filterOpenWork([item]).length) return false;
  return (
    isDueToday(item, now) ||
    isStartToday(item, now) ||
    isPlannedForToday(item, now) ||
    isWorkOverdue(item, now) ||
    item.status === "in-progress" ||
    item.status === "review" ||
    item.status === "blocked" ||
    isElevatedWork(item, hints)
  );
}

export function applyWorkFilters(
  items: WorkListItem[],
  filters: WorkViewFilters = {},
  now = new Date(),
): WorkListItem[] {
  let next = items;

  if (filters.clientId != null) {
    next = next.filter((item) => item.clientId === filters.clientId);
  }
  if (filters.status) {
    next = next.filter((item) => item.status === filters.status);
  }
  if (filters.priority) {
    next = next.filter((item) => item.priority === filters.priority);
  }
  if (filters.assignedToId != null) {
    next = next.filter((item) => item.assignedToId === filters.assignedToId);
  }
  if (filters.tag) {
    const tag = filters.tag.toLowerCase();
    next = next.filter((item) =>
      item.tags.some((t) => t.toLowerCase() === tag),
    );
  }
  if (filters.dueRange && filters.dueRange !== "any") {
    next = next.filter((item) => matchesDueRange(item, filters.dueRange!, now));
  }

  return next;
}

function matchesDueRange(
  item: WorkListItem,
  range: NonNullable<WorkViewFilters["dueRange"]>,
  now: Date,
): boolean {
  if (range === "none") return !item.dueDate;
  if (range === "overdue") return isWorkOverdue(item, now);
  if (range === "today") return isDueToday(item, now);
  if (!item.dueDate) return false;
  const due = parseDateKey(item.dueDate);
  if (!due) return false;
  if (range === "week") {
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    end.setDate(end.getDate() + 7);
    return due.getTime() > now.getTime() && due.getTime() <= end.getTime() && !isDueToday(item, now);
  }
  if (range === "later") {
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    end.setDate(end.getDate() + 7);
    return due.getTime() > end.getTime();
  }
  return true;
}

export function selectWorkViewItems(
  pool: WorkListItem[],
  view: WorkViewId,
  hints: WorkViewContextHints = EMPTY_HINTS,
  now = new Date(),
): WorkListItem[] {
  const open = filterOpenWork(pool);

  switch (view) {
    case "today":
      return pool.filter((item) => belongsInTodaySet(item, hints, now));
    case "inbox":
      return filterQueue(open);
    case "upcoming":
      return filterUpcomingWork(open);
    case "overdue":
      return filterOverdueWork(open);
    case "waiting-on-client":
      return filterWorkByStatus(open, "waiting-on-client");
    case "waiting-on-kxd":
      return filterWorkByStatus(open, "waiting-on-kxd");
    case "blocked":
      return filterWorkByStatus(open, "blocked");
    case "review":
      return filterWorkByStatus(open, "review");
    case "completed":
      return sortWorkByUpdatedDesc(
        pool.filter((item) => item.status === "completed"),
      ).slice(0, 60);
    case "all":
      return pool.filter((item) => item.status !== "archived");
    default:
      return open;
  }
}

function waitingAgeMs(item: WorkListItem, now: Date): number {
  const waiting =
    item.status === "waiting-on-client" ||
    item.status === "waiting-on-kxd" ||
    item.status === "blocked";
  if (!waiting) return 0;
  return Math.max(0, now.getTime() - new Date(item.updatedAt).getTime());
}

export function sortWorkViewItems(
  items: WorkListItem[],
  sort: WorkSortId,
  hints: WorkViewContextHints = EMPTY_HINTS,
  now = new Date(),
): WorkListItem[] {
  const elevated = elevatedSet(hints);

  switch (sort) {
    case "due-date":
      return sortWorkByDueDateAsc(items);
    case "priority":
      return sortWorkByPriority(items);
    case "recently-updated":
      return sortWorkByUpdatedDesc(items);
    case "client":
      return [...items].sort((a, b) => {
        const ca = (a.clientName || "").localeCompare(b.clientName || "");
        if (ca !== 0) return ca;
        return (PRIORITY_RANK[a.priority] ?? 9) - (PRIORITY_RANK[b.priority] ?? 9);
      });
    case "oldest-waiting":
      return [...items].sort((a, b) => waitingAgeMs(b, now) - waitingAgeMs(a, now));
    case "recommended":
    default:
      return [...items].sort((a, b) => {
        const aOver = isWorkOverdue(a, now) ? 1 : 0;
        const bOver = isWorkOverdue(b, now) ? 1 : 0;
        if (aOver !== bOver) return bOver - aOver;

        const aEl = elevated.has(a.id) ? 1 : 0;
        const bEl = elevated.has(b.id) ? 1 : 0;
        if (aEl !== bEl) return bEl - aEl;

        const aBlocked = a.status === "blocked" ? 1 : 0;
        const bBlocked = b.status === "blocked" ? 1 : 0;
        if (aBlocked !== bBlocked) return bBlocked - aBlocked;

        const pa = PRIORITY_RANK[a.priority] ?? 9;
        const pb = PRIORITY_RANK[b.priority] ?? 9;
        if (pa !== pb) return pa - pb;

        const da = a.dueDate ? new Date(a.dueDate).getTime() : Number.POSITIVE_INFINITY;
        const db = b.dueDate ? new Date(b.dueDate).getTime() : Number.POSITIVE_INFINITY;
        if (da !== db) return da - db;

        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });
  }
}

function todayGroupId(
  item: WorkListItem,
  hints: WorkViewContextHints,
  now: Date,
): WorkTodayGroupId {
  if (item.status === "completed") return "completed-today";
  if (
    isWorkOverdue(item, now) ||
    item.status === "blocked" ||
    item.status === "review" ||
    isElevatedWork(item, hints)
  ) {
    return "needs-attention";
  }
  if (item.status === "in-progress") return "in-progress";
  return "planned";
}

const TODAY_GROUP_META: Array<{ id: WorkTodayGroupId; label: string }> = [
  { id: "needs-attention", label: "Needs attention" },
  { id: "in-progress", label: "In progress" },
  { id: "planned", label: "Planned" },
  { id: "completed-today", label: "Completed today" },
];

export function groupTodayWork(
  items: WorkListItem[],
  hints: WorkViewContextHints = EMPTY_HINTS,
  now = new Date(),
): WorkTodayGroup[] {
  const buckets: Record<WorkTodayGroupId, WorkListItem[]> = {
    "needs-attention": [],
    "in-progress": [],
    planned: [],
    "completed-today": [],
  };

  for (const item of items) {
    buckets[todayGroupId(item, hints, now)].push(item);
  }

  return TODAY_GROUP_META.map((meta) => ({
    ...meta,
    items: buckets[meta.id],
  })).filter((group) => group.items.length > 0);
}

export function countWorkViews(
  pool: WorkListItem[],
  hints: WorkViewContextHints = EMPTY_HINTS,
  now = new Date(),
): Record<WorkViewId, number> {
  const counts = {} as Record<WorkViewId, number>;
  for (const view of WORK_VIEW_IDS) {
    counts[view] = selectWorkViewItems(pool, view, hints, now).length;
  }
  return counts;
}

/**
 * Pure compose of a work view from an in-memory pool.
 */
export function composeWorkView(input: GetWorkViewInput & { pool: WorkListItem[] }): WorkViewResult {
  const now = input.now ?? new Date();
  const view = parseWorkViewId(input.view);
  const sort = parseWorkSortId(input.sort);
  const filters = input.filters ?? {};
  const hints = input.contextHints ?? EMPTY_HINTS;

  const filtered = applyWorkFilters(input.pool, filters, now);
  const selected = selectWorkViewItems(filtered, view, hints, now);
  const items = sortWorkViewItems(selected, sort, hints, now);
  const groups = view === "today" ? groupTodayWork(items, hints, now) : null;

  return {
    view,
    sort,
    filters,
    items,
    groups,
    emptyMessage: WORK_VIEW_EMPTY[view],
    counts: countWorkViews(applyWorkFilters(input.pool, filters, now), hints, now),
    generatedAt: now.toISOString(),
  };
}

export function isPlannedOn(item: WorkListItem, dateKey: string): boolean {
  return dateKeyEquals(item.plannedForDate, parseDateKey(dateKey) ?? new Date());
}

export function workViewHref(
  view: WorkViewId,
  filters: WorkViewFilters = {},
  sort: WorkSortId = "recommended",
): string {
  const params = new URLSearchParams();
  if (view !== "today") params.set("view", view);
  if (sort !== "recommended") params.set("sort", sort);
  if (filters.clientId != null) params.set("clientId", String(filters.clientId));
  if (filters.status) params.set("status", filters.status);
  if (filters.priority) params.set("priority", filters.priority);
  if (filters.assignedToId != null) {
    params.set("assignedTo", String(filters.assignedToId));
  }
  if (filters.dueRange && filters.dueRange !== "any") {
    params.set("due", filters.dueRange);
  }
  if (filters.tag) params.set("tag", filters.tag);
  const qs = params.toString();
  return qs ? `/admin/work?${qs}` : "/admin/work";
}

export { WORK_VIEW_LABELS, toLocalDateKey };
