/**
 * Phase 7 — Today | Batch D — presentation contracts.
 *
 * Caps and empty language for the founder home. No new intelligence —
 * compose existing truth with less cognitive load.
 *
 * Confidence rule: if there is a choice between showing more information
 * and creating more confidence, choose confidence.
 */

import type { ExecutiveTodayBrief } from "./brief/types";

export const TODAY_PRIORITIES_LIMIT = 5;
export const TODAY_SCHEDULE_LIMIT = 5;
export const TODAY_EXCEPTIONS_LIMIT = 4;
export const TODAY_SIGNALS_LIMIT = 6;
export const TODAY_EVIDENCE_LIMIT = 2;

export const TODAY_EMPTY = {
  priorities: "Clear desk. Nothing needs you yet.",
  schedule: "No timed commitments. The day is open.",
  signals: "Quiet. Nothing that changes today’s decisions.",
} as const;

export const TODAY_QUIET_EXITS = [
  { label: "Work", href: "/admin/work" },
  { label: "Clients", href: "/admin/operations/clients" },
  { label: "Review Inbox", href: "/admin/operations/review-inbox" },
  { label: "Focus", href: "/admin/operations/focus" },
] as const;

/** Prefer live day-flow; never dump a long past calendar trail. */
export function selectTodaySchedule(
  dayFlow: ExecutiveTodayBrief["dayFlow"],
  limit = TODAY_SCHEDULE_LIMIT,
): ExecutiveTodayBrief["dayFlow"] {
  const live = dayFlow.filter((item) => item.state !== "past");
  if (live.length > 0) return live.slice(0, limit);
  return dayFlow.slice(0, limit);
}
