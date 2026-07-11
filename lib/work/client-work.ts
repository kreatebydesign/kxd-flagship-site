import {
  filterOpenWork,
  filterUpcomingWork,
  filterWorkByStatus,
  sortWorkByPriority,
  sortWorkByUpdatedDesc,
} from "./views";
import type { ClientWorkData, WorkListItem, WorkStatus } from "./types";

const ACTIVE_STATUSES: WorkStatus[] = [
  "new",
  "planned",
  "in-progress",
  "blocked",
  "review",
];

/**
 * Group a client's work for Client Success — single-pass, no extra queries.
 */
export function groupClientWork(clientId: number, items: WorkListItem[]): ClientWorkData {
  const open = filterOpenWork(items);
  const waitingOnClient = sortWorkByPriority(filterWorkByStatus(items, "waiting-on-client"));
  const waitingOnKxd = sortWorkByPriority(filterWorkByStatus(items, "waiting-on-kxd"));
  const upcoming = filterUpcomingWork(open).slice(0, 16);
  const completed = sortWorkByUpdatedDesc(
    items.filter((item) => item.status === "completed"),
  ).slice(0, 16);
  const active = sortWorkByPriority(
    open.filter((item) => ACTIVE_STATUSES.includes(item.status)),
  );

  return {
    clientId,
    active,
    waitingOnClient,
    waitingOnKxd,
    upcoming,
    completed,
    openCount: open.length,
    generatedAt: new Date().toISOString(),
  };
}

export function emptyClientWork(clientId: number): ClientWorkData {
  return {
    clientId,
    active: [],
    waitingOnClient: [],
    waitingOnKxd: [],
    upcoming: [],
    completed: [],
    openCount: 0,
    generatedAt: new Date().toISOString(),
  };
}
