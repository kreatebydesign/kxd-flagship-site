/**
 * Reporting period helpers for branded client reports.
 * Preserves configurable periods; July 1–30, 2026 is the controlled release target.
 */

import type { BrandedReportPeriod } from "./types";

export const DEFAULT_REPORTING_TIMEZONE = "America/Los_Angeles";

/** Controlled July 2026 release window — excludes July 31. */
export const JULY_2026_CONTROLLED = {
  year: 2026,
  month: 7,
  startDay: 1,
  endDay: 30,
  label: "July 1–30, 2026",
  excludesFinalDayNote:
    "July 31 is excluded from this controlled release so unfinished Google data is not presented as finalized.",
} as const;

function utcDayBounds(
  year: number,
  month: number,
  day: number,
  endOfDay: boolean,
): string {
  if (endOfDay) {
    return new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999)).toISOString();
  }
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0)).toISOString();
}

export function createBrandedReportPeriod(input: {
  year: number;
  month: number;
  startDay?: number;
  endDay?: number;
  timezone?: string | null;
}): BrandedReportPeriod {
  const year = input.year;
  const month = input.month;
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    throw new Error("Invalid reporting year/month.");
  }

  const lastDayOfMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const startDay = input.startDay ?? 1;
  const endDay = input.endDay ?? lastDayOfMonth;

  if (startDay < 1 || endDay < startDay || endDay > lastDayOfMonth) {
    throw new Error("Invalid reporting day bounds.");
  }

  const timezone =
    (input.timezone && input.timezone.trim()) || DEFAULT_REPORTING_TIMEZONE;

  const isControlledJuly2026 =
    year === JULY_2026_CONTROLLED.year &&
    month === JULY_2026_CONTROLLED.month &&
    startDay === JULY_2026_CONTROLLED.startDay &&
    endDay === JULY_2026_CONTROLLED.endDay;

  const monthName = new Date(Date.UTC(year, month - 1, 1)).toLocaleString("en-US", {
    month: "long",
    timeZone: "UTC",
  });

  const label = isControlledJuly2026
    ? JULY_2026_CONTROLLED.label
    : startDay === 1 && endDay === lastDayOfMonth
      ? `${monthName} ${year}`
      : `${monthName} ${startDay}–${endDay}, ${year}`;

  return {
    start: utcDayBounds(year, month, startDay, false),
    end: utcDayBounds(year, month, endDay, true),
    label,
    year,
    month,
    timezone,
    isControlledJuly2026,
    excludesFinalDayNote: isControlledJuly2026
      ? JULY_2026_CONTROLLED.excludesFinalDayNote
      : endDay < lastDayOfMonth
        ? `Period ends on day ${endDay}; later days in ${monthName} are not included.`
        : null,
  };
}

/** Default controlled release period for this phase. */
export function july2026ControlledPeriod(
  timezone?: string | null,
): BrandedReportPeriod {
  return createBrandedReportPeriod({
    year: JULY_2026_CONTROLLED.year,
    month: JULY_2026_CONTROLLED.month,
    startDay: JULY_2026_CONTROLLED.startDay,
    endDay: JULY_2026_CONTROLLED.endDay,
    timezone,
  });
}

/** Prior comparison window of equal length immediately before the period. */
export function comparisonPeriodFor(
  period: BrandedReportPeriod,
): { start: string; end: string; label: string } {
  const start = new Date(period.start);
  const end = new Date(period.end);
  const spanMs = end.getTime() - start.getTime();
  const priorEnd = new Date(start.getTime() - 1);
  const priorStart = new Date(priorEnd.getTime() - spanMs);
  return {
    start: priorStart.toISOString(),
    end: priorEnd.toISOString(),
    label: "Prior period (equal length)",
  };
}
