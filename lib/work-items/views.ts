import type { TaskListItem, TaskPriority, TaskStatus } from "@/lib/client-tasks/types";

const PRIORITY_RANK: Record<TaskPriority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export function filterWorkItemsDueToday(tasks: TaskListItem[]): TaskListItem[] {
  return tasks.filter((t) => {
    if (!t.dueDate || t.status === "completed" || t.status === "cancelled") return false;
    return t.daysUntilDue === 0;
  });
}

export function filterWorkItemsDueThisWeek(tasks: TaskListItem[]): TaskListItem[] {
  return tasks.filter((t) => {
    if (!t.dueDate || t.status === "completed" || t.status === "cancelled") return false;
    const days = t.daysUntilDue;
    return days != null && days >= 0 && days <= 7;
  });
}

export function filterWorkItemsOverdue(tasks: TaskListItem[]): TaskListItem[] {
  return tasks.filter((t) => {
    if (!t.dueDate || t.status === "completed" || t.status === "cancelled") return false;
    const days = t.daysUntilDue;
    return days != null && days < 0;
  });
}

export function filterWorkItemsByPriority(
  tasks: TaskListItem[],
  priorities: TaskPriority[],
): TaskListItem[] {
  const set = new Set(priorities);
  return tasks.filter((t) => set.has(t.priority));
}

export function filterWorkItemsAssignedTo(tasks: TaskListItem[], email: string): TaskListItem[] {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return [];
  return tasks.filter((t) => t.assignedTo?.toLowerCase() === normalized);
}

export function sortWorkItemsByPriority(tasks: TaskListItem[]): TaskListItem[] {
  return [...tasks].sort((a, b) => {
    const pa = PRIORITY_RANK[a.priority] ?? 9;
    const pb = PRIORITY_RANK[b.priority] ?? 9;
    if (pa !== pb) return pa - pb;
    const da = a.daysUntilDue ?? 999;
    const db = b.daysUntilDue ?? 999;
    return da - db;
  });
}

export function groupWorkItemsByStatus(
  tasks: TaskListItem[],
): Partial<Record<TaskStatus, TaskListItem[]>> {
  const groups: Partial<Record<TaskStatus, TaskListItem[]>> = {};
  for (const task of tasks) {
    const list = groups[task.status] ?? [];
    list.push(task);
    groups[task.status] = list;
  }
  return groups;
}
