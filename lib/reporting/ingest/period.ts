/**
 * Phase 31C — Default executive reporting period.
 *
 * Prefer a completed calendar month over a partial in-progress month so
 * Executive Performance does not imply unfinished board-period certainty.
 */

import { createMonthPeriod, shiftPeriod } from "@/lib/reporting/domain/period";
import type { PeriodWindow } from "@/lib/reporting/domain/types";

/** Maximum inclusive calendar-day span for custom start/end windows. */
export const REPORTING_INGEST_MAX_RANGE_DAYS = 62;

/**
 * Previous completed UTC calendar month.
 * Example: on 2026-07-13 → June 2026.
 */
export function defaultExecutiveReportingPeriod(now = new Date()): PeriodWindow {
  const current = createMonthPeriod(now.getUTCFullYear(), now.getUTCMonth() + 1);
  return shiftPeriod(current, -1);
}

export function resolveReportingMonthPeriod(input: {
  year?: number | null;
  month?: number | null;
  now?: Date;
}): PeriodWindow {
  if (
    input.year != null &&
    input.month != null &&
    Number.isFinite(input.year) &&
    Number.isFinite(input.month) &&
    input.month >= 1 &&
    input.month <= 12
  ) {
    return createMonthPeriod(input.year, input.month);
  }
  return defaultExecutiveReportingPeriod(input.now ?? new Date());
}

function parseIsoDay(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const d = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Resolve ingest period from month OR custom day bounds.
 * Enforces REPORTING_INGEST_MAX_RANGE_DAYS on custom ranges.
 */
export function resolveIngestPeriod(input: {
  year?: number | null;
  month?: number | null;
  start?: string | null;
  end?: string | null;
  now?: Date;
}): PeriodWindow | { error: string } {
  if (input.year != null || input.month != null) {
    if (input.year == null || input.month == null) {
      return { error: "year and month must be provided together." };
    }
    if (input.month < 1 || input.month > 12) {
      return { error: "month must be between 1 and 12." };
    }
    return resolveReportingMonthPeriod({
      year: input.year,
      month: input.month,
      now: input.now,
    });
  }

  if (input.start || input.end) {
    if (!input.start || !input.end) {
      return { error: "start and end must be provided together as YYYY-MM-DD." };
    }
    const start = parseIsoDay(input.start);
    const end = parseIsoDay(input.end);
    if (!start || !end) {
      return { error: "start and end must be valid YYYY-MM-DD dates." };
    }
    if (end.getTime() < start.getTime()) {
      return { error: "end must be on or after start." };
    }
    const daySpan =
      Math.floor((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1;
    if (daySpan > REPORTING_INGEST_MAX_RANGE_DAYS) {
      return {
        error: `Date range exceeds ${REPORTING_INGEST_MAX_RANGE_DAYS} days.`,
      };
    }
    const endInclusive = new Date(end);
    endInclusive.setUTCHours(23, 59, 59, 999);
    return {
      start: start.toISOString(),
      end: endInclusive.toISOString(),
      grain: daySpan <= 7 ? "week" : "month",
      label: `${input.start} – ${input.end}`,
    };
  }

  return defaultExecutiveReportingPeriod(input.now ?? new Date());
}
