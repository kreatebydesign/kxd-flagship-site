import { minutesBetween } from "@/lib/staff-time/dates";

/** Monday-start workweek key (YYYY-MM-DD of Monday) for a civil date in UTC parsing. */
export function mondayWorkweekStartKey(dateKey: string): string {
  const d = new Date(`${dateKey}T12:00:00Z`);
  const day = d.getUTCDay();
  const offset = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
}

export function dateKeysBetween(start: string, end: string): string[] {
  const keys: string[] = [];
  const cursor = new Date(`${start}T12:00:00Z`);
  const endDate = new Date(`${end}T12:00:00Z`);
  while (cursor <= endDate) {
    keys.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return keys;
}

/** Workweek Monday keys that overlap a pay-period date range (plus adjacent weeks for boundary shifts). */
export function workweekStartsTouchingPeriod(periodStart: string, periodEnd: string): string[] {
  const keys = new Set<string>();
  for (const day of dateKeysBetween(periodStart, periodEnd)) {
    keys.add(mondayWorkweekStartKey(day));
  }
  const before = new Date(`${periodStart}T12:00:00Z`);
  before.setUTCDate(before.getUTCDate() - 7);
  keys.add(mondayWorkweekStartKey(before.toISOString().slice(0, 10)));
  const after = new Date(`${periodEnd}T12:00:00Z`);
  after.setUTCDate(after.getUTCDate() + 7);
  keys.add(mondayWorkweekStartKey(after.toISOString().slice(0, 10)));
  return [...keys].sort();
}

function addDaysUtc(dateKey: string, days: number): string {
  const d = new Date(`${dateKey}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** End of workweek (Sunday) for a Monday-start key. */
export function workweekEndKey(mondayStart: string): string {
  return addDaysUtc(mondayStart, 6);
}

/**
 * Split shift minutes across Monday–Sunday workweeks (UTC civil boundaries on date keys).
 */
export function allocateShiftMinutesByWorkweek(
  startedAt: string,
  endedAt: string,
): Map<string, number> {
  const start = new Date(startedAt);
  const end = new Date(endedAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
    return new Map();
  }

  const allocations = new Map<string, number>();
  let cursor = start;
  while (cursor < end) {
    const dateKey = cursor.toISOString().slice(0, 10);
    const weekStart = mondayWorkweekStartKey(dateKey);
    const weekEnd = new Date(`${workweekEndKey(weekStart)}T23:59:59.999Z`);
    const sliceEnd = end < weekEnd ? end : weekEnd;
    const minutes = minutesBetween(cursor, sliceEnd);
    if (minutes > 0) {
      allocations.set(weekStart, (allocations.get(weekStart) ?? 0) + minutes);
    }
    cursor = new Date(sliceEnd.getTime() + 1);
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
}): WorkweekOvertimeWarning[] {
  const limitMinutes = Math.round(input.weeklyHoursLimit * 60);
  return input.workweekStarts.map((workweekStart) => {
    const totalMinutes = input.minutesByWorkweek.get(workweekStart) ?? 0;
    return {
      workweekStart,
      workweekEnd: workweekEndKey(workweekStart),
      totalMinutes,
      weeklyLimitMinutes: limitMinutes,
      exceedsLimit: totalMinutes > limitMinutes,
    };
  }).filter((row) => row.totalMinutes > 0);
}
