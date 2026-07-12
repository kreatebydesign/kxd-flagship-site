/**
 * Suppression — keep in Activity history, out of executive signals.
 */

import type { ExecutiveActivityItem } from "@/lib/activity-engine";

const SUPPRESS_EVENT_PATTERNS: RegExp[] = [
  /infrastructure\.?init/i,
  /infrastructure\.initialized/i,
  /registry\.?(update|sync|refresh)/i,
  /sync(\.|$)/i,
  /cache\.?(refresh|warm|invalidate)/i,
  /diagnostic/i,
  /developer/i,
  /migration/i,
  /backfill/i,
  /seed/i,
  /heartbeat/i,
  /system\./i,
  /metadata/i,
  /background/i,
  /^work\.updated$/i,
  /\.updated$/i,
];

const SUPPRESS_TITLE_PATTERNS: RegExp[] = [
  /infrastructure initialized/i,
  /registry update/i,
  /cache refresh/i,
  /synchronization/i,
  /sync complete/i,
  /migration notice/i,
  /diagnostic/i,
];

const SUPPRESS_MODULE_PATTERNS: RegExp[] = [
  /^platform$/i,
  /^system$/i,
  /devtools/i,
];

/**
 * True when the event should not become an executive signal.
 */
export function shouldSuppressActivity(item: ExecutiveActivityItem): boolean {
  const type = item.eventType || "";
  const title = item.title || "";
  const module = item.sourceModule || "";

  if (SUPPRESS_EVENT_PATTERNS.some((p) => p.test(type))) {
    /* Allow high/critical updates that match .updated only when client-bound and elevated. */
    if (/\.updated$/i.test(type) || /^work\.updated$/i.test(type)) {
      if (
        (item.importance === "high" || item.importance === "critical") &&
        (item.clientId != null || item.reviewId != null || item.workId != null)
      ) {
        return false;
      }
    }
    return true;
  }

  if (SUPPRESS_TITLE_PATTERNS.some((p) => p.test(title))) return true;

  if (SUPPRESS_MODULE_PATTERNS.some((p) => p.test(module))) {
    if (item.importance === "low" || item.importance === "normal") return true;
  }

  if (
    item.importance === "low" &&
    item.clientId == null &&
    item.workId == null &&
    item.reviewId == null
  ) {
    return true;
  }

  return false;
}
