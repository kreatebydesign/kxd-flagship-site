/**
 * Phase 29C — Period conversion helpers for Google APIs.
 */

import type { PeriodWindow } from "@/lib/reporting/domain";

/** GA4 / GSC date format YYYY-MM-DD (UTC calendar date from ISO). */
export function toProviderDate(iso: string): string {
  return iso.slice(0, 10);
}

export function periodIncludesToday(period: PeriodWindow, now = new Date()): boolean {
  const today = now.toISOString().slice(0, 10);
  return toProviderDate(period.start) <= today && toProviderDate(period.end) >= today;
}

/**
 * Search Console data typically lags ~2–3 days.
 * Returns the latest date that is considered settled.
 */
export function searchConsoleSettledEndDate(now = new Date(), lagDays = 3): string {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  d.setUTCDate(d.getUTCDate() - lagDays);
  return d.toISOString().slice(0, 10);
}

export function clampPeriodToSettled(
  period: PeriodWindow,
  settledEnd: string,
): { effective: PeriodWindow; adjusted: boolean } {
  const start = toProviderDate(period.start);
  const end = toProviderDate(period.end);
  if (end <= settledEnd) {
    return { effective: period, adjusted: false };
  }
  if (start > settledEnd) {
    return {
      effective: {
        ...period,
        start: `${settledEnd}T00:00:00.000Z`,
        end: `${settledEnd}T23:59:59.999Z`,
      },
      adjusted: true,
    };
  }
  return {
    effective: {
      ...period,
      end: `${settledEnd}T23:59:59.999Z`,
    },
    adjusted: true,
  };
}

export function previousPeriodWindow(period: PeriodWindow): PeriodWindow {
  const start = new Date(period.start);
  const end = new Date(period.end);
  const span = end.getTime() - start.getTime();
  const prevEnd = new Date(start.getTime() - 1);
  const prevStart = new Date(prevEnd.getTime() - span);
  return {
    start: prevStart.toISOString(),
    end: prevEnd.toISOString(),
    grain: period.grain,
  };
}
