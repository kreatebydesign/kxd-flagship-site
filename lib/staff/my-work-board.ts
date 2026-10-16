/**
 * Staff My Work — board column mapping (existing WorkStatus values only).
 */
import type { WorkListItem, WorkStatus } from "@/lib/work/types";

export type StaffMyWorkBoardColumnId =
  | "todo"
  | "in-progress"
  | "blocked"
  | "in-review";

export const STAFF_MY_WORK_BOARD_COLUMNS: {
  id: StaffMyWorkBoardColumnId;
  label: string;
}[] = [
  { id: "todo", label: "To Do" },
  { id: "in-progress", label: "In Progress" },
  { id: "blocked", label: "Blocked" },
  { id: "in-review", label: "In Review" },
];

const TODO: WorkStatus[] = ["new", "planned"];
const IN_PROGRESS: WorkStatus[] = [
  "in-progress",
  "waiting-on-client",
  "waiting-on-kxd",
];
const BLOCKED: WorkStatus[] = ["blocked"];
const IN_REVIEW: WorkStatus[] = ["review"];

export function staffMyWorkBoardColumn(
  status: WorkStatus,
): StaffMyWorkBoardColumnId | null {
  if (TODO.includes(status)) return "todo";
  if (IN_PROGRESS.includes(status)) return "in-progress";
  if (BLOCKED.includes(status)) return "blocked";
  if (IN_REVIEW.includes(status)) return "in-review";
  return null;
}

export function isStaffMyWorkOpenStatus(status: WorkStatus): boolean {
  return staffMyWorkBoardColumn(status) != null;
}

export function partitionStaffMyWorkBoard(
  items: WorkListItem[],
): Record<StaffMyWorkBoardColumnId, WorkListItem[]> {
  const buckets: Record<StaffMyWorkBoardColumnId, WorkListItem[]> = {
    todo: [],
    "in-progress": [],
    blocked: [],
    "in-review": [],
  };
  for (const item of items) {
    const col = staffMyWorkBoardColumn(item.status);
    if (col) buckets[col].push(item);
  }
  for (const col of STAFF_MY_WORK_BOARD_COLUMNS) {
    buckets[col.id].sort((a, b) => sortStaffMyWorkItems(a, b));
  }
  return buckets;
}

export function sortStaffMyWorkItems(a: WorkListItem, b: WorkListItem): number {
  const priorityRank = (p: WorkListItem["priority"]) => {
    switch (p) {
      case "critical":
        return 0;
      case "high":
        return 1;
      case "normal":
        return 2;
      default:
        return 3;
    }
  };
  const pr = priorityRank(a.priority) - priorityRank(b.priority);
  if (pr !== 0) return pr;
  if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
  if (a.dueDate) return -1;
  if (b.dueDate) return 1;
  return b.updatedAt.localeCompare(a.updatedAt);
}

export type StaffMyWorkGroupKey = string;

export function staffMyWorkGroupLabel(item: WorkListItem): {
  key: StaffMyWorkGroupKey;
  label: string;
  kind: "client" | "internal";
} {
  if (item.clientId != null && item.clientName && item.clientName !== "Internal") {
    return {
      key: `client:${item.clientId}`,
      label: item.clientName,
      kind: "client",
    };
  }
  const internal = item.internalProject?.trim();
  if (internal) {
    return {
      key: `internal:${internal.toLowerCase()}`,
      label: `Internal · ${internal}`,
      kind: "internal",
    };
  }
  return { key: "internal:studio", label: "Internal · KXD", kind: "internal" };
}

export function groupStaffMyWorkItems(
  items: WorkListItem[],
): { key: StaffMyWorkGroupKey; label: string; kind: "client" | "internal"; items: WorkListItem[] }[] {
  const map = new Map<
    StaffMyWorkGroupKey,
    { key: StaffMyWorkGroupKey; label: string; kind: "client" | "internal"; items: WorkListItem[] }
  >();
  for (const item of items) {
    const meta = staffMyWorkGroupLabel(item);
    const row = map.get(meta.key) ?? {
      key: meta.key,
      label: meta.label,
      kind: meta.kind,
      items: [],
    };
    row.items.push(item);
    map.set(meta.key, row);
  }
  const groups = [...map.values()];
  groups.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === "client" ? -1 : 1;
    return a.label.localeCompare(b.label);
  });
  for (const g of groups) {
    g.items.sort(sortStaffMyWorkItems);
  }
  return groups;
}
