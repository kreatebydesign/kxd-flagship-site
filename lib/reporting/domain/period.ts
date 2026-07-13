/**
 * Phase 29B — Period helpers for reporting domain.
 */

import type { PeriodGrain, PeriodWindow } from "./types";

export function createMonthPeriod(year: number, month: number): PeriodWindow {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
  const label = start.toLocaleString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  return {
    start: start.toISOString(),
    end: end.toISOString(),
    grain: "month",
    label,
  };
}

export function shiftPeriod(period: PeriodWindow, steps: number): PeriodWindow {
  if (period.grain !== "month") {
    const start = new Date(period.start);
    const end = new Date(period.end);
    const span = end.getTime() - start.getTime();
    const nextStart = new Date(start.getTime() + steps * (span + 1));
    const nextEnd = new Date(nextStart.getTime() + span);
    return {
      start: nextStart.toISOString(),
      end: nextEnd.toISOString(),
      grain: period.grain,
    };
  }

  const start = new Date(period.start);
  const year = start.getUTCFullYear();
  const month = start.getUTCMonth() + 1 + steps;
  const normalized = new Date(Date.UTC(year, month - 1, 1));
  return createMonthPeriod(normalized.getUTCFullYear(), normalized.getUTCMonth() + 1);
}

export function periodKey(period: PeriodWindow): string {
  return `${period.grain}:${period.start.slice(0, 10)}:${period.end.slice(0, 10)}`;
}

export function assertGrain(grain: PeriodGrain): PeriodGrain {
  return grain;
}
