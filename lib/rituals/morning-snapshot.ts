/**
 * Morning Brief — compact executive snapshot from already-loaded briefing context.
 * No additional database queries.
 */

import { OPEN_REQUEST_STATUSES } from "@/lib/intelligence/context";
import type { BriefingInputContext } from "@/lib/intelligence/briefings/types";
import { OPEN_WORK_STATUSES } from "@/lib/work/constants";

export interface MorningSnapshotMetric {
  id: string;
  label: string;
  value: number;
}

export interface MorningExecutiveSnapshot {
  title: string;
  metrics: MorningSnapshotMetric[];
}

function isOverdueIso(iso: string | null | undefined): boolean {
  if (!iso) return false;
  const ts = new Date(iso).getTime();
  if (Number.isNaN(ts)) return false;
  return ts < Date.now();
}

/**
 * Derive scan-friendly counts from live briefing context.
 */
export function buildMorningExecutiveSnapshot(
  input: BriefingInputContext,
): MorningExecutiveSnapshot {
  const activeReviews = input.reviewInbox.activeCount;

  const awaitingClientIds = new Set<number>();
  for (const item of input.communications.needsReply) {
    if (item.clientId != null) awaitingClientIds.add(item.clientId);
  }
  for (const item of input.reviewInbox.items) {
    if (item.status === "waiting-on-client" && item.clientId != null) {
      awaitingClientIds.add(item.clientId);
    }
  }

  const openRequests = input.intelligence.requests.filter((req) =>
    OPEN_REQUEST_STATUSES.has(String(req.status ?? "")),
  ).length;

  const openWorkStatuses = new Set(OPEN_WORK_STATUSES);
  const highPriorityWork = input.work.currentWork.filter(
    (item) =>
      openWorkStatuses.has(item.status) &&
      (item.priority === "high" || item.priority === "critical"),
  ).length;

  const overdueWork = input.work.currentWork.filter(
    (item) => openWorkStatuses.has(item.status) && isOverdueIso(item.dueDate),
  ).length;
  const overdueItems = overdueWork + input.communications.overdueFollowUpCount;

  return {
    title: "Executive Snapshot",
    metrics: [
      { id: "active-reviews", label: "Active Reviews", value: activeReviews },
      {
        id: "awaiting-response",
        label: "Clients Awaiting Response",
        value: awaitingClientIds.size,
      },
      { id: "open-requests", label: "Open Requests", value: openRequests },
      { id: "high-priority-work", label: "High Priority Work", value: highPriorityWork },
      { id: "overdue", label: "Overdue Items", value: overdueItems },
    ],
  };
}
