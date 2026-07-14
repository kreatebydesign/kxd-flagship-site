/**
 * Phase 33A / 33A.1 — Pacific scheduling helpers (America/Los_Angeles only).
 * Default: daily at configured hour (05:00 Pacific). Handles PDT/PST via IANA zone.
 */

import {
  DEFAULT_REPORTING_SYNC_HOUR_PACIFIC,
  REPORTING_SCHEDULE_TIMEZONE,
} from "./constants";

function clampHour(hour: number | null | undefined): number {
  if (hour == null || !Number.isFinite(hour)) return DEFAULT_REPORTING_SYNC_HOUR_PACIFIC;
  const n = Math.floor(hour);
  if (n < 0) return 0;
  if (n > 23) return 23;
  return n;
}

/** Parts of `date` in America/Los_Angeles. */
export function pacificDateParts(date: Date): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
} {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: REPORTING_SCHEDULE_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const parts = Object.fromEntries(
    fmt.formatToParts(date).map((p) => [p.type, p.value]),
  ) as Record<string, string>;
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
  };
}

/**
 * Resolve an instant for Y-M-D hour:00:00 in Pacific.
 * Uses iterative correction against Intl offset (DST-safe).
 */
export function zonedPacificTimeToUtc(input: {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute?: number;
}): Date {
  const minute = input.minute ?? 0;
  const targetKey = `${input.year}-${String(input.month).padStart(2, "0")}-${String(input.day).padStart(2, "0")}T${String(input.hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;

  let guess = Date.UTC(input.year, input.month - 1, input.day, input.hour + 8, minute, 0);

  for (let i = 0; i < 6; i += 1) {
    const parts = pacificDateParts(new Date(guess));
    const actualKey = `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}T${String(parts.hour).padStart(2, "0")}:${String(parts.minute).padStart(2, "0")}`;
    if (actualKey === targetKey) return new Date(guess);

    const actualAsUtc = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      0,
    );
    const desiredAsUtc = Date.UTC(
      input.year,
      input.month - 1,
      input.day,
      input.hour,
      minute,
      0,
    );
    guess += desiredAsUtc - actualAsUtc;
  }

  return new Date(guess);
}

function addPacificCalendarDays(
  year: number,
  month: number,
  day: number,
  days: number,
): { year: number; month: number; day: number } {
  const anchor = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  anchor.setUTCDate(anchor.getUTCDate() + days);
  const parts = pacificDateParts(anchor);
  return { year: parts.year, month: parts.month, day: parts.day };
}

/**
 * Next daily sync at `syncHourPacific` in Pacific, strictly after `from`
 * when `from` is at/after today's slot.
 */
export function nextDailyPacificSyncAt(
  from: Date,
  syncHourPacific: number | null | undefined = DEFAULT_REPORTING_SYNC_HOUR_PACIFIC,
): Date {
  const hour = clampHour(syncHourPacific);
  const parts = pacificDateParts(from);
  const todaySlot = zonedPacificTimeToUtc({
    year: parts.year,
    month: parts.month,
    day: parts.day,
    hour,
    minute: 0,
  });
  if (from.getTime() < todaySlot.getTime()) return todaySlot;

  const next = addPacificCalendarDays(parts.year, parts.month, parts.day, 1);
  return zonedPacificTimeToUtc({
    year: next.year,
    month: next.month,
    day: next.day,
    hour,
    minute: 0,
  });
}

/**
 * Latest Pacific sync-hour slot at or before `from`.
 */
export function lastPacificSyncSlotAt(
  from: Date,
  syncHourPacific: number | null | undefined = DEFAULT_REPORTING_SYNC_HOUR_PACIFIC,
): Date {
  const hour = clampHour(syncHourPacific);
  const parts = pacificDateParts(from);
  const todaySlot = zonedPacificTimeToUtc({
    year: parts.year,
    month: parts.month,
    day: parts.day,
    hour,
    minute: 0,
  });
  if (from.getTime() >= todaySlot.getTime()) return todaySlot;

  const prev = addPacificCalendarDays(parts.year, parts.month, parts.day, -1);
  return zonedPacificTimeToUtc({
    year: prev.year,
    month: prev.month,
    day: prev.day,
    hour,
    minute: 0,
  });
}

export function isReportingSyncDue(input: {
  now: Date;
  nextScheduledSyncAt: string | null | undefined;
  force?: boolean;
}): boolean {
  if (input.force) return true;
  if (!input.nextScheduledSyncAt) return true;
  const next = Date.parse(input.nextScheduledSyncAt);
  if (!Number.isFinite(next)) return true;
  return next <= input.now.getTime();
}

/**
 * True when this scheduled window was already completed (idempotency).
 * Force bypasses window completion.
 */
export function isScheduledWindowComplete(input: {
  lastCompletedWindowId: string | null | undefined;
  windowId: string;
  force?: boolean;
}): boolean {
  if (input.force) return false;
  if (!input.lastCompletedWindowId) return false;
  return input.lastCompletedWindowId === input.windowId;
}

export { clampHour as clampReportingSyncHourPacific };
