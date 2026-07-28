/**
 * Period helpers for Batch D — reuse reporting domain month windows (UTC).
 */

import { createMonthPeriod, shiftPeriod } from "@/lib/reporting/domain/period";
import type { PeriodWindow } from "@/lib/reporting/domain/types";
import { defaultExecutiveReportingPeriod } from "@/lib/reporting/ingest/period";

/** Current calendar month (UTC) — for “in progress this month” framing. */
export function currentCalendarMonthPeriod(now = new Date()): PeriodWindow {
  return createMonthPeriod(now.getUTCFullYear(), now.getUTCMonth() + 1);
}

/** Default performance period: previous completed UTC month. */
export function defaultWorkPerformancePeriod(now = new Date()): PeriodWindow {
  return defaultExecutiveReportingPeriod(now);
}

export function comparisonPeriodFor(period: PeriodWindow): PeriodWindow {
  return shiftPeriod(period, -1);
}

export function periodLabel(period: PeriodWindow): string {
  return period.label ?? `${period.start} – ${period.end}`;
}

/** Inclusive UTC day bounds from PeriodWindow start/end (YYYY-MM-DD). */
export function isIsoDateInPeriod(iso: string | null | undefined, period: PeriodWindow): boolean {
  if (!iso) return false;
  const day = iso.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
  return day >= period.start && day <= period.end;
}
