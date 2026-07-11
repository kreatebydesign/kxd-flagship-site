/**
 * Phase 20C — Client operational history from Work Engine events.
 *
 * Work lifecycle events already flow into executive-timeline via
 * `publishWorkActivityHook` → `publishWorkEvent` with:
 *   internalOnly: !clientVisible
 *
 * Supported events (architecture contract):
 *   work.created | work.started | work.waiting | work.blocked |
 *   work.review | work.completed | work.archived | work.status-changed
 *
 * Portal boundary:
 *   - Never surface Work Engine items or internal timeline events on
 *     client-facing portal routes unless clientVisible === true.
 *   - Admin Client Success and Work Engine are internal-only surfaces.
 *
 * Runtime publishers live in `./integration/events` (server / Payload hooks).
 * This module is the client-safe contract surface only.
 */

/** Event types that constitute client operational history from Work. */
export const CLIENT_WORK_HISTORY_EVENTS = [
  "work.created",
  "work.status-changed",
  "work.started",
  "work.waiting",
  "work.blocked",
  "work.review",
  "work.completed",
  "work.archived",
] as const;

export type ClientWorkHistoryEvent = (typeof CLIENT_WORK_HISTORY_EVENTS)[number];

/**
 * Portal safety — work contributes to client-facing surfaces only when
 * explicitly marked clientVisible. Default is internal.
 */
export function isWorkVisibleToPortal(clientVisible: boolean): boolean {
  return clientVisible === true;
}
