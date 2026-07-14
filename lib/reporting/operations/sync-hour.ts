/**
 * Phase 33B.1 — Strict Pacific sync-hour validation (no silent clamping).
 */

import { REPORTING_SCHEDULE_TIMEZONE } from "@/lib/reporting/automation/constants";

export type ParseReportingSyncHourResult =
  | { ok: true; hour: number }
  | { ok: false; error: string };

/**
 * Accept only whole integers in 0–23. Reject floats, strings with decimals, NaN, out of range.
 */
export function parseStrictReportingSyncHourPacific(
  value: unknown,
): ParseReportingSyncHourResult {
  let hour: number | null = null;

  if (typeof value === "number") {
    if (!Number.isFinite(value) || !Number.isInteger(value)) {
      return {
        ok: false,
        error: "Sync hour must be a whole number from 0 to 23.",
      };
    }
    hour = value;
  } else if (typeof value === "string") {
    const trimmed = value.trim();
    if (!/^-?\d+$/.test(trimmed)) {
      return {
        ok: false,
        error: "Sync hour must be a whole number from 0 to 23.",
      };
    }
    hour = Number(trimmed);
  } else {
    return {
      ok: false,
      error: "Sync hour must be a whole number from 0 to 23.",
    };
  }

  if (hour < 0 || hour > 23) {
    return {
      ok: false,
      error: "Sync hour must be between 0 and 23 (Pacific).",
    };
  }

  return { ok: true, hour };
}

/** Plain-language label, e.g. "5:00 AM Pacific". Schedule uses America/Los_Angeles. */
export function formatReportingSyncHourPacificLabel(hour: number): string {
  const parsed = parseStrictReportingSyncHourPacific(hour);
  if (!parsed.ok) return "Invalid sync hour";
  const h = parsed.hour;
  const suffix = h < 12 ? "AM" : "PM";
  const twelve = h % 12 === 0 ? 12 : h % 12;
  return `${twelve}:00 ${suffix} Pacific`;
}

export function reportingScheduleTimezoneLabel(): string {
  return REPORTING_SCHEDULE_TIMEZONE;
}
