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

export function filterWorkByStatus(items: WorkListItem[], status: WorkStatus): WorkListItem[] {
  return items.filter((item) => item.status === status);
}

export function filterOpenWork(items: WorkListItem[]): WorkListItem[] {
  return items.filter((item) => OPEN_WORK_STATUSES.includes(item.status));
}

export function filterCompletedToday(items: WorkListItem[]): WorkListItem[] {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return items.filter((item) => {
    if (item.status !== "completed") return false;
    const at = item.completedAt ?? item.updatedAt;
    const completed = new Date(at);
    return completed >= start;
  });
}

export function filterQueue(items: WorkListItem[]): WorkListItem[] {
  return sortWorkByPriority(items.filter((item) => item.status === "new" || item.status === "planned"));
}

export function groupWorkByStatus(items: WorkListItem[]): Record<WorkStatus, WorkListItem[]> {
  const groups: Record<WorkStatus, WorkListItem[]> = {
    new: [],
    planned: [],
    "in-progress": [],
    "waiting-on-client": [],
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
