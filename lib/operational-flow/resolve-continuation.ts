/**
 * Deterministic continuation — next motion after a transition.
 * Facts only. No recommendations prose. No AI.
 */

import type { WorkListItem } from "@/lib/work/types";
import {
  filterOpenWork,
  filterOverdueWork,
  filterTodayWork,
  filterWorkByStatus,
  sortWorkByPriority,
} from "@/lib/work/views";
import type { OperationalContinuation, OperationalTransitionKind } from "./types";

function toContinuation(
  item: WorkListItem | null | undefined,
  reason: string,
): OperationalContinuation | null {
  if (!item) return null;
  return {
    workId: item.id,
    title: item.title,
    href: item.adminHref,
    clientId: item.clientId,
    clientName: item.clientName,
    reason,
  };
}

/**
 * Prefer: in-progress → overdue → today → waiting-on-kxd → open priority.
 * Excludes the work item that just completed/archived when provided.
 */
export function resolveContinuation(input: {
  pool: WorkListItem[];
  kind: OperationalTransitionKind;
  excludeWorkId?: number | null;
}): OperationalContinuation | null {
  const open = filterOpenWork(input.pool).filter(
    (item) => item.id !== input.excludeWorkId,
  );

  const inProgress = sortWorkByPriority(
    filterWorkByStatus(open, "in-progress"),
  );
  if (inProgress[0]) {
    return toContinuation(inProgress[0], "Continue in-progress work.");
  }

  const overdue = filterOverdueWork(open);
  if (overdue[0]) {
    return toContinuation(overdue[0], "Address overdue work next.");
  }

  const today = filterTodayWork(open);
  if (today[0]) {
    return toContinuation(today[0], "Continue today's plan.");
  }

  const waitingKxd = sortWorkByPriority(
    filterWorkByStatus(open, "waiting-on-kxd"),
  );
  if (waitingKxd[0]) {
    return toContinuation(waitingKxd[0], "Studio-owned waiting work.");
  }

  const blocked = sortWorkByPriority(filterWorkByStatus(open, "blocked"));
  if (
    (input.kind === "work.unblocked" || input.kind === "work.completed") &&
    blocked[0]
  ) {
    return toContinuation(blocked[0], "Blocked work still needs attention.");
  }

  const nextOpen = sortWorkByPriority(open)[0];
  if (nextOpen) {
    return toContinuation(nextOpen, "Next open work by priority.");
  }

  return {
    workId: null,
    title: null,
    href: "/admin/work?view=today",
    clientId: null,
    clientName: null,
    reason: "No open work — day can shift to planning.",
  };
}
