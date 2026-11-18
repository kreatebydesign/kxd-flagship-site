/**
 * Batch 3C — Today presentation helpers (no new data owners).
 */

import type { TodayWaitingItem } from "./recomposition";
import type {
  ExecutiveTodayActivityItem,
  TodayCommercialKind,
} from "./types";

const URGENT_COMMERCIAL: TodayCommercialKind[] = [
  "overdue",
  "overdue-response",
  "respond-today",
  "due-today",
];

export function isUrgentCommercial(kind: TodayCommercialKind): boolean {
  return URGENT_COMMERCIAL.includes(kind);
}

/**
 * Founder-actionable waiting items stay in Needs your attention (full rows).
 * Blocked items also appear in Team as execution context — not a second intelligence path.
 */
export function partitionWaitingForAttention(
  items: TodayWaitingItem[],
): { attention: TodayWaitingItem[]; team: TodayWaitingItem[] } {
  const team = items.filter((item) => item.id.startsWith("blocked-"));
  return { attention: items, team };
}

export function teamContextMeta(meta: string): string {
  return meta.includes("Blocked") ? meta : `Blocked · ${meta}`;
}

export function selectNotableClientActivity(
  activity: ExecutiveTodayActivityItem[],
  limit = 3,
): ExecutiveTodayActivityItem[] {
  const notable = activity.filter((a) => a.emphasis === "notable");
  const pool = notable.length > 0 ? notable : activity;
  return pool.slice(0, limit);
}