import { minutesBetween, toDateKeyInTimezone } from "@/lib/staff-time/dates";
import { STAFF_PAYROLL_DEFAULTS } from "./constants";

export const STAFF_PAYROLL_WORKWEEK_TIMEZONE = STAFF_PAYROLL_DEFAULTS.timezone;

const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

function weekdayIndexInTimezone(date: Date, timeZone: string): number {
  const label = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
  }).format(date);
  const index = WEEKDAY_SHORT.indexOf(label as (typeof WEEKDAY_SHORT)[number]);
  return index >= 0 ? index : 0;
}

/** Reference instant on a civil date in the given timezone (stable for payroll math). */
export function dateKeyToReferenceInstant(dateKey: string, timeZone: string): Date {
  const [year, month, day] = dateKey.split("-").map(Number);
  const probe = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  for (let hour = -18; hour <= 18; hour++) {
    const candidate = new Date(probe.getTime() + hour * 3600_000);
    if (toDateKeyInTimezone(candidate, timeZone) === dateKey) {
      return candidate;
    }
  }
  return probe;
}

export function addDateKeysInTimezone(
  dateKey: string,
  deltaDays: number,
  timeZone: string,
): string {
  if (deltaDays === 0) return dateKey;
  let current = dateKey;
  const step = deltaDays > 0 ? 1 : -1;
  for (let i = 0; i < Math.abs(deltaDays); i++) {
    let probe = dateKeyToReferenceInstant(current, timeZone);
    probe = new Date(probe.getTime() + step * 20 * 3600_000);
    while (toDateKeyInTimezone(probe, timeZone) === current) {
      probe = new Date(probe.getTime() + step * 3600_000);
    }
    current = toDateKeyInTimezone(probe, timeZone);
  }
  return current;
}

/** Monday-start workweek key (YYYY-MM-DD Monday) in the payroll timezone. */
export function mondayWorkweekStartKey(
  dateKey: string,
  timeZone: string = STAFF_PAYROLL_WORKWEEK_TIMEZONE,
): string {
  const ref = dateKeyToReferenceInstant(dateKey, timeZone);
  const dow = weekdayIndexInTimezone(ref, timeZone);
  const daysFromMonday = dow === 0 ? 6 : dow - 1;
  return addDateKeysInTimezone(dateKey, -daysFromMonday, timeZone);
}

export function dateKeysBetween(
  start: string,
  end: string,
  timeZone: string = STAFF_PAYROLL_WORKWEEK_TIMEZONE,
): string[] {
  const keys: string[] = [];
  let cursor = start;
  while (cursor <= end) {
    keys.push(cursor);
    cursor = addDateKeysInTimezone(cursor, 1, timeZone);
  }
  return keys;
}

/** Workweek Monday keys overlapping a pay period (plus adjacent weeks for boundary shifts). */
export function workweekStartsTouchingPeriod(
  periodStart: string,
  periodEnd: string,
  timeZone: string = STAFF_PAYROLL_WORKWEEK_TIMEZONE,
): string[] {
  const keys = new Set<string>();
  for (const day of dateKeysBetween(periodStart, periodEnd, timeZone)) {
    keys.add(mondayWorkweekStartKey(day, timeZone));
  }
  keys.add(addDateKeysInTimezone(periodStart, -7, timeZone));
  keys.add(mondayWorkweekStartKey(addDateKeysInTimezone(periodStart, -7, timeZone), timeZone));
  keys.add(addDateKeysInTimezone(periodEnd, 7, timeZone));
  keys.add(mondayWorkweekStartKey(addDateKeysInTimezone(periodEnd, 7, timeZone), timeZone));
  return [...keys].sort();
}

/** End of workweek (Sunday civil date) for a Monday-start key. */
export function workweekEndKey(
  mondayStart: string,
  timeZone: string = STAFF_PAYROLL_WORKWEEK_TIMEZONE,
): string {
  return addDateKeysInTimezone(mondayStart, 6, timeZone);
}

function startOfCivilDayInstant(dateKey: string, timeZone: string): Date {
  let probe = dateKeyToReferenceInstant(dateKey, timeZone);
  probe = new Date(probe.getTime() - 20 * 3600_000);
  while (toDateKeyInTimezone(probe, timeZone) !== dateKey) {
    probe = new Date(probe.getTime() + 3600_000);
  }
  while (toDateKeyInTimezone(new Date(probe.getTime() - 60_000), timeZone) === dateKey) {
    probe = new Date(probe.getTime() - 60_000);
  }
  return probe;
}

/** Instant when the next Monday-start workweek begins (exclusive end of the current workweek). */
function workweekEndExclusiveInstant(mondayStart: string, timeZone: string): Date {
  const nextMondayKey = addDateKeysInTimezone(mondayStart, 7, timeZone);
  return startOfCivilDayInstant(nextMondayKey, timeZone);
}

/**
 * Split shift minutes across Monday–Sunday workweeks in the payroll timezone.
 */
export function allocateShiftMinutesByWorkweek(
  startedAt: string,
  endedAt: string,
  timeZone: string = STAFF_PAYROLL_WORKWEEK_TIMEZONE,
): Map<string, number> {
  const start = new Date(startedAt);
  const end = new Date(endedAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
    return new Map();
  }

  const allocations = new Map<string, number>();
  let cursor = start;
  while (cursor < end) {
    const dateKey = toDateKeyInTimezone(cursor, timeZone);
    const weekStart = mondayWorkweekStartKey(dateKey, timeZone);
    const weekEndExclusive = workweekEndExclusiveInstant(weekStart, timeZone);
    const sliceEndExclusive = end < weekEndExclusive ? end : weekEndExclusive;
    const minutes = minutesBetween(cursor, sliceEndExclusive);
    if (minutes > 0) {
      allocations.set(weekStart, (allocations.get(weekStart) ?? 0) + minutes);
    }
    if (sliceEndExclusive.getTime() >= end.getTime()) {
      break;
    }
    cursor = sliceEndExclusive;
  }
  return allocations;
}

export interface WorkweekOvertimeWarning {
  workweekStart: string;
  workweekEnd: string;
  totalMinutes: number;
  weeklyLimitMinutes: number;
  exceedsLimit: boolean;
}

export function evaluateWorkweekOvertimeWarnings(input: {
  weeklyHoursLimit: number;
  workweekStarts: string[];
  minutesByWorkweek: Map<string, number>;
  timeZone?: string;
}): WorkweekOvertimeWarning[] {
  const timeZone = input.timeZone ?? STAFF_PAYROLL_WORKWEEK_TIMEZONE;
  const limitMinutes = Math.round(input.weeklyHoursLimit * 60);
  return input.workweekStarts
    .map((workweekStart) => {
      const totalMinutes = input.minutesByWorkweek.get(workweekStart) ?? 0;
      return {
        workweekStart,
        workweekEnd: workweekEndKey(workweekStart, timeZone),
        totalMinutes,
        weeklyLimitMinutes: limitMinutes,
        exceedsLimit: totalMinutes > limitMinutes,
      };
    })
    .filter((row) => row.totalMinutes > 0);
}
