/**
 * Signal pipeline: Activity → suppress → score → filter → group → rank → limit.
 */

import type { ExecutiveActivityItem } from "@/lib/activity-engine";
import { EXECUTIVE_SIGNAL_RANK_FLOOR } from "./score";
import { groupScoredActivity, scoreItems } from "./group";
import { shouldSuppressActivity } from "./suppress";
import {
  EXECUTIVE_SIGNALS_EMPTY_MESSAGE,
  EXECUTIVE_SIGNALS_LIMIT,
  type ExecutiveSignal,
  type ExecutiveSignalsResult,
} from "./types";

/**
 * Pure transform — no I/O. Callers supply Activity Engine items.
 */
export function buildExecutiveSignals(
  activity: ExecutiveActivityItem[],
  limit: number = EXECUTIVE_SIGNALS_LIMIT,
): ExecutiveSignalsResult {
  const scannedCount = activity.length;
  let suppressedCount = 0;
  const kept: ExecutiveActivityItem[] = [];

  for (const item of activity) {
    if (shouldSuppressActivity(item)) {
      suppressedCount += 1;
      continue;
    }
    kept.push(item);
  }

  const scored = scoreItems(kept).filter(
    (row) =>
      row.score.visibility === "executive" &&
      row.score.requiresAttention &&
      row.score.rank >= EXECUTIVE_SIGNAL_RANK_FLOOR,
  );

  /* Group only candidates that already cleared the floor. */
  let signals = groupScoredActivity(scored);

  /* After grouping, drop residual low-value groups (e.g. many infra that slipped). */
  signals = signals.filter((s) => s.score.visibility === "executive" && s.score.rank >= EXECUTIVE_SIGNAL_RANK_FLOOR);

  signals.sort((a, b) => {
    if (b.score.rank !== a.score.rank) return b.score.rank - a.score.rank;
    return new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime();
  });

  const limited = signals.slice(0, Math.max(0, limit));

  return {
    signals: limited,
    suppressedCount,
    scannedCount,
    emptyMessage: EXECUTIVE_SIGNALS_EMPTY_MESSAGE,
    generatedAt: new Date().toISOString(),
  };
}

export function mapSignalToListItem(signal: ExecutiveSignal): {
  id: string;
  title: string;
  meta: string;
  href: string | null;
  emphasis: "normal" | "strong";
} {
  const parts: string[] = [];
  if (signal.clientName) parts.push(signal.clientName);
  if (signal.grouped && signal.sourceCount > 1) {
    parts.push(`${signal.sourceCount} events`);
  }
  if (signal.score.urgency === "critical" || signal.score.urgency === "high") {
    parts.push(signal.score.urgency === "critical" ? "Urgent" : "Needs attention");
  }

  return {
    id: signal.id,
    title: signal.title,
    meta: parts.join(" · ") || signal.domain,
    href: signal.href,
    emphasis:
      signal.score.importance === "critical" ||
      signal.score.urgency === "critical" ||
      signal.score.businessImpact >= 85
        ? "strong"
        : "normal",
  };
}
