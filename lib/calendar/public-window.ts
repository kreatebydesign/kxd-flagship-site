/**
 * Public calendar visibility — upcoming feeds vs month-navigable schedule archive.
 */

/** How far back month grids can load published events (inclusive by overlap). */
export const PUBLIC_CALENDAR_ARCHIVE_MONTHS = 36;

/** Forward horizon for schedule and upcoming lists. */
export const PUBLIC_CALENDAR_FORWARD_HORIZON_MONTHS = 24;

/** Safety cap after filtering (not the primary bound). */
export const PUBLIC_CALENDAR_MAX_EVENTS = 120;

export type PublicCalendarListMode = "schedule" | "upcoming";

export type PublicCalendarWindow = {
  windowStart: string;
  windowEnd: string;
  maxEvents: number;
};

function toDateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function startOfMonth(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(1);
  return x;
}

function endOfMonth(year: number, monthIndex0: number): string {
  const end = new Date(year, monthIndex0 + 1, 0, 12, 0, 0, 0);
  return toDateOnly(end);
}

function addCalendarMonths(from: Date, months: number): Date {
  const next = new Date(from);
  next.setHours(0, 0, 0, 0);
  next.setMonth(next.getMonth() + months);
  return next;
}

/** Full schedule window for /calendar month navigation (not upcoming-only). */
export function resolvePublicCalendarScheduleWindow(
  now: Date = new Date(),
): PublicCalendarWindow {
  const today = startOfMonth(now);
  const archiveStart = addCalendarMonths(today, -PUBLIC_CALENDAR_ARCHIVE_MONTHS);
  const forwardEnd = addCalendarMonths(today, PUBLIC_CALENDAR_FORWARD_HORIZON_MONTHS);
  return {
    windowStart: toDateOnly(archiveStart),
    windowEnd: toDateOnly(forwardEnd),
    maxEvents: PUBLIC_CALENDAR_MAX_EVENTS,
  };
}

/** Compact upcoming-only window (register widgets, compact lists). */
export function resolvePublicCalendarUpcomingWindow(
  now: Date = new Date(),
): PublicCalendarWindow {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const forwardEnd = addCalendarMonths(today, PUBLIC_CALENDAR_FORWARD_HORIZON_MONTHS);
  return {
    windowStart: toDateOnly(today),
    windowEnd: toDateOnly(forwardEnd),
    maxEvents: 48,
  };
}

export function resolvePublicCalendarWindow(
  mode: PublicCalendarListMode,
  now: Date = new Date(),
): PublicCalendarWindow {
  return mode === "upcoming"
    ? resolvePublicCalendarUpcomingWindow(now)
    : resolvePublicCalendarScheduleWindow(now);
}

/** Event overlaps [windowStart, windowEnd] on calendar dates. */
export function isWithinPublicCalendarWindow(
  startsOn: string,
  endsOn: string | null,
  window: PublicCalendarWindow,
): boolean {
  const start = startsOn.slice(0, 10);
  const end = (endsOn ?? startsOn).slice(0, 10);
  if (!start) return false;
  if (end < window.windowStart) return false;
  if (start > window.windowEnd) return false;
  return true;
}

export type CalendarMonthRef = { year: number; month: number };

/** `month` is 1–12. Returns overlap for month grid cells. */
export function eventOverlapsCalendarMonth(
  startsOn: string,
  endsOn: string | null,
  ref: CalendarMonthRef,
): boolean {
  const start = startsOn.slice(0, 10);
  const end = (endsOn ?? startsOn).slice(0, 10);
  if (!start) return false;
  const monthStart = `${ref.year}-${String(ref.month).padStart(2, "0")}-01`;
  const monthEnd = endOfMonth(ref.year, ref.month - 1);
  return start <= monthEnd && end >= monthStart;
}

/** Parse `YYYY-MM` for bounded month queries. */
export function parsePublicCalendarMonthParam(
  value: string | null | undefined,
): CalendarMonthRef | null {
  const text = String(value ?? "").trim();
  const match = /^(\d{4})-(\d{2})$/.exec(text);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    return null;
  }
  return { year, month };
}

export function calendarMonthWindow(ref: CalendarMonthRef): PublicCalendarWindow {
  const monthStart = `${ref.year}-${String(ref.month).padStart(2, "0")}-01`;
  const monthEnd = endOfMonth(ref.year, ref.month - 1);
  return {
    windowStart: monthStart,
    windowEnd: monthEnd,
    maxEvents: PUBLIC_CALENDAR_MAX_EVENTS,
  };
}