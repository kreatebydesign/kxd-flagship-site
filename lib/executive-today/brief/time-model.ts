/**
 * Phase 27B — Deterministic executive day time model (America/Los_Angeles).
 * No browser locale for critical math. Reuses availability zoned helpers.
 */

import { KXD_BUSINESS_TIMEZONE } from "@/lib/platform/timezone";
import {
  minutesBetween,
  toIso,
  zonedParts,
  zonedWallTimeToUtcMs,
} from "@/lib/scheduling/availability/time";
import type { ExecutiveDayBounds } from "./types";

export interface TimeInterval {
  startMs: number;
  endMs: number;
}

export function buildExecutiveDayBounds(input: {
  nowIso: string;
  timeZone?: string;
  workStartHour?: number;
  workEndHour?: number;
}): ExecutiveDayBounds {
  const timeZone = input.timeZone || KXD_BUSINESS_TIMEZONE;
  const workStartHour = input.workStartHour ?? 9;
  const workEndHour = input.workEndHour ?? 17;
  const nowMs = Date.parse(input.nowIso);
  const parts = zonedParts(nowMs, timeZone);
  const dayStartMs = zonedWallTimeToUtcMs(
    parts.year,
    parts.month,
    parts.day,
    0,
    0,
    timeZone,
  );
  const dayEndMs = zonedWallTimeToUtcMs(
    parts.year,
    parts.month,
    parts.day,
    23,
    59,
    timeZone,
  );
  // Include through end of minute 59 → add 59 seconds conceptually via next day - 1ms
  const nextDay = zonedWallTimeToUtcMs(
    parts.year,
    parts.month,
    parts.day + 1 > 28
      ? parts.day
      : parts.day,
    0,
    0,
    timeZone,
  );
  // Safer end-of-day: start of next calendar day in zone
  const dayEndExclusive = (() => {
    // Advance one day via UTC date arithmetic on wall parts
    const d = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + 1));
    return zonedWallTimeToUtcMs(
      d.getUTCFullYear(),
      d.getUTCMonth() + 1,
      d.getUTCDate(),
      0,
      0,
      timeZone,
    );
  })();
  void nextDay;
  void dayEndMs;

  const workStartMs = zonedWallTimeToUtcMs(
    parts.year,
    parts.month,
    parts.day,
    workStartHour,
    0,
    timeZone,
  );
  const workEndMs = zonedWallTimeToUtcMs(
    parts.year,
    parts.month,
    parts.day,
    workEndHour,
    0,
    timeZone,
  );

  const dateKey = `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;

  return {
    timeZone,
    dayStartIso: toIso(dayStartMs),
    dayEndIso: toIso(dayEndExclusive - 1),
    workStartIso: toIso(workStartMs),
    workEndIso: toIso(workEndMs),
    nowIso: toIso(nowMs),
    dateKey,
  };
}

export function intervalFromIso(
  startIso: string | null | undefined,
  endIso: string | null | undefined,
): TimeInterval | null {
  if (!startIso || !endIso) return null;
  const startMs = Date.parse(startIso);
  const endMs = Date.parse(endIso);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
    return null;
  }
  return { startMs, endMs };
}

/** Normalize all-day date-only values into the executive day window. */
export function normalizeObservedInterval(
  start: string | null,
  end: string | null,
  bounds: ExecutiveDayBounds,
  allDay: boolean,
): TimeInterval | null {
  if (allDay) {
    return {
      startMs: Date.parse(bounds.dayStartIso),
      endMs: Date.parse(bounds.dayEndIso) + 1,
    };
  }
  // date-only ISO (YYYY-MM-DD) without time
  if (start && /^\d{4}-\d{2}-\d{2}$/.test(start)) {
    return {
      startMs: Date.parse(bounds.dayStartIso),
      endMs: Date.parse(bounds.dayEndIso) + 1,
    };
  }
  return intervalFromIso(start, end);
}

export function overlaps(a: TimeInterval, b: TimeInterval): boolean {
  return a.startMs < b.endMs && b.startMs < a.endMs;
}

export function gapMinutes(aEndMs: number, bStartMs: number): number {
  return Math.max(0, Math.round((bStartMs - aEndMs) / 60_000));
}

/**
 * Subtract busy intervals from a window; return open gaps sorted by start.
 */
export function subtractBusy(
  window: TimeInterval,
  busy: TimeInterval[],
): TimeInterval[] {
  const clipped = busy
    .map((b) => ({
      startMs: Math.max(b.startMs, window.startMs),
      endMs: Math.min(b.endMs, window.endMs),
    }))
    .filter((b) => b.endMs > b.startMs)
    .sort((a, b) => a.startMs - b.startMs);

  const gaps: TimeInterval[] = [];
  let cursor = window.startMs;
  for (const b of clipped) {
    if (b.startMs > cursor) {
      gaps.push({ startMs: cursor, endMs: b.startMs });
    }
    cursor = Math.max(cursor, b.endMs);
  }
  if (cursor < window.endMs) {
    gaps.push({ startMs: cursor, endMs: window.endMs });
  }
  return gaps;
}

export function largestGap(gaps: TimeInterval[]): TimeInterval | null {
  if (gaps.length === 0) return null;
  return gaps.reduce((best, g) =>
    minutesBetween(g.startMs, g.endMs) > minutesBetween(best.startMs, best.endMs)
      ? g
      : best,
  );
}

export function totalMinutes(intervals: TimeInterval[]): number {
  return intervals.reduce(
    (sum, i) => sum + minutesBetween(i.startMs, i.endMs),
    0,
  );
}

export function formatClock(
  iso: string,
  timeZone: string,
): string {
  try {
    return new Date(iso).toLocaleTimeString("en-US", {
      timeZone,
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export { minutesBetween, toIso };
