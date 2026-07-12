import { OPEN_WORK_STATUSES, PRIORITY_RANK } from "./constants";
import type { WorkListItem, WorkStatus } from "./types";

export function sortWorkByPriority(items: WorkListItem[]): WorkListItem[] {
  return [...items].sort((a, b) => {
    const pa = PRIORITY_RANK[a.priority] ?? 9;
    const pb = PRIORITY_RANK[b.priority] ?? 9;
    if (pa !== pb) return pa - pb;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
}

export function sortWorkByUpdatedDesc(items: WorkListItem[]): WorkListItem[] {
  return [...items].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

export function sortWorkByDueDateAsc(items: WorkListItem[]): WorkListItem[] {
  return [...items].sort((a, b) => {
    const da = a.dueDate ? new Date(a.dueDate).getTime() : Number.POSITIVE_INFINITY;
    const db = b.dueDate ? new Date(b.dueDate).getTime() : Number.POSITIVE_INFINITY;
    if (da !== db) return da - db;
    return (PRIORITY_RANK[a.priority] ?? 9) - (PRIORITY_RANK[b.priority] ?? 9);
  });
}

export function filterWorkByStatus(items: WorkListItem[], status: WorkStatus): WorkListItem[] {
  return items.filter((item) => item.status === status);
}

export function filterOpenWork(items: WorkListItem[]): WorkListItem[] {
  return items.filter((item) => OPEN_WORK_STATUSES.includes(item.status));
}

function startOfLocalDay(date = new Date()): Date {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start;
}

function endOfLocalDay(date = new Date()): Date {
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return end;
}

export function isWorkOverdue(item: WorkListItem, now = new Date()): boolean {
  if (!item.dueDate) return false;
  if (!OPEN_WORK_STATUSES.includes(item.status)) return false;
  const due = new Date(item.dueDate).getTime();
  if (Number.isNaN(due)) return false;
  return due < startOfLocalDay(now).getTime();
}

export function isDueToday(item: WorkListItem, now = new Date()): boolean {
  if (!item.dueDate) return false;
  const due = new Date(item.dueDate);
  if (Number.isNaN(due.getTime())) return false;
  return due >= startOfLocalDay(now) && due <= endOfLocalDay(now);
}

export function isStartToday(item: WorkListItem, now = new Date()): boolean {
  if (!item.startDate) return false;
  const start = new Date(item.startDate);
  if (Number.isNaN(start.getTime())) return false;
  return start >= startOfLocalDay(now) && start <= endOfLocalDay(now);
}

export function filterCompletedToday(items: WorkListItem[]): WorkListItem[] {
  const start = startOfLocalDay();
  return items.filter((item) => {
    if (item.status !== "completed") return false;
    const at = item.completedAt ?? item.updatedAt;
    const completed = new Date(at);
    return completed >= start;
  });
}

export function filterQueue(items: WorkListItem[]): WorkListItem[] {
  return sortWorkByPriority(
    items.filter((item) => item.status === "new" || item.status === "planned"),
  );
}

export function isPlannedForDate(item: WorkListItem, day: Date = new Date()): boolean {
  if (!item.plannedForDate) return false;
  const planned = new Date(item.plannedForDate);
  if (Number.isNaN(planned.getTime())) return false;
  return planned >= startOfLocalDay(day) && planned <= endOfLocalDay(day);
}

export function isPlannedForToday(item: WorkListItem, now = new Date()): boolean {
  return isPlannedForDate(item, now);
}

/** Due today, starting today, planned for today, or actively in progress / review / blocked. */
export function filterTodayWork(items: WorkListItem[]): WorkListItem[] {
  const open = filterOpenWork(items);
  return sortWorkByPriority(
    open.filter(
      (item) =>
        isDueToday(item) ||
        isStartToday(item) ||
        isPlannedForToday(item) ||
        item.status === "in-progress" ||
        item.status === "review" ||
        item.status === "blocked",
    ),
  );
}

export function filterUpcomingWork(items: WorkListItem[], days = 14): WorkListItem[] {
  const start = endOfLocalDay();
  const end = new Date(start);
  end.setDate(end.getDate() + days);

  return sortWorkByDueDateAsc(
    filterOpenWork(items).filter((item) => {
      if (!item.dueDate) return false;
      if (isWorkOverdue(item)) return false;
      if (isDueToday(item)) return false;
      const due = new Date(item.dueDate).getTime();
      return due > start.getTime() && due <= end.getTime();
    }),
  );
}

export function filterOverdueWork(items: WorkListItem[]): WorkListItem[] {
  return sortWorkByDueDateAsc(filterOpenWork(items).filter((item) => isWorkOverdue(item)));
}

export function groupWorkByStatus(items: WorkListItem[]): Record<WorkStatus, WorkListItem[]> {
  const groups: Record<WorkStatus, WorkListItem[]> = {
    new: [],
    planned: [],
    "in-progress": [],
    "waiting-on-client": [],
    "waiting-on-kxd": [],
    blocked: [],
    review: [],
    completed: [],
    archived: [],
  };

  for (const item of items) {
    groups[item.status].push(item);
  }

  return groups;
}
