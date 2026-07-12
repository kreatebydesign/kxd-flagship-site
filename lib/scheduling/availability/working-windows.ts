/**
 * Phase 25D — Working-window expansion from hours policy + horizon.
 */

import {
  addCalendarDays,
  toIso,
  toMs,
  zonedParts,
  zonedWallTimeToUtcMs,
} from "./time";
import type {
  AvailabilityHoursSource,
  AvailabilityWorkingHoursPolicy,
  NormalizedTimeWindow,
} from "./types";
import { DEFAULT_AVAILABILITY_HOURS } from "./types";

export function resolveWorkingHoursPolicy(input: {
  timeZone: string;
  explicit?: {
    weekdays?: number[];
    startHour?: number;
    endHour?: number;
  } | null;
  envJson?: string | null;
  /** When calendar data unavailable. */
  unavailable?: boolean;
}): AvailabilityWorkingHoursPolicy {
  const warnings: string[] = [];
  const timeZone = input.timeZone || "America/Los_Angeles";

  if (input.unavailable) {
    return {
      ...DEFAULT_AVAILABILITY_HOURS,
      weekdays: [...DEFAULT_AVAILABILITY_HOURS.weekdays],
      timeZone,
      source: "calendar-unavailable",
      note: "Calendar availability was not assessed — using default working hours for planning math only.",
      warnings: ["calendar-unavailable"],
    };
  }

  if (input.explicit) {
    return {
      weekdays:
        input.explicit.weekdays && input.explicit.weekdays.length > 0
          ? input.explicit.weekdays
          : [...DEFAULT_AVAILABILITY_HOURS.weekdays],
      startHour:
        typeof input.explicit.startHour === "number"
          ? input.explicit.startHour
          : DEFAULT_AVAILABILITY_HOURS.startHour,
      endHour:
        typeof input.explicit.endHour === "number"
          ? input.explicit.endHour
          : DEFAULT_AVAILABILITY_HOURS.endHour,
      timeZone,
      source: "explicit-request",
      note: "Working hours supplied on the availability request.",
      warnings,
    };
  }

  const raw = input.envJson?.trim();
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as {
        weekdays?: number[];
        startHour?: number;
        endHour?: number;
      };
      const weekdays =
        Array.isArray(parsed.weekdays) && parsed.weekdays.length > 0
          ? parsed.weekdays.map(Number).filter((n) => n >= 0 && n <= 6)
          : [...DEFAULT_AVAILABILITY_HOURS.weekdays];
      const startHour =
        typeof parsed.startHour === "number"
          ? parsed.startHour
          : DEFAULT_AVAILABILITY_HOURS.startHour;
      const endHour =
        typeof parsed.endHour === "number"
          ? parsed.endHour
          : DEFAULT_AVAILABILITY_HOURS.endHour;
      if (endHour <= startHour) {
        warnings.push("env-working-hours-invalid-range");
        throw new Error("invalid range");
      }
      return {
        weekdays,
        startHour,
        endHour,
        timeZone,
        source: "environment-override" satisfies AvailabilityHoursSource,
        note: "Working hours loaded from GOOGLE_CALENDAR_WORKING_HOURS_JSON.",
        warnings,
      };
    } catch {
      warnings.push("env-working-hours-json-invalid");
    }
  }

  return {
    weekdays: [...DEFAULT_AVAILABILITY_HOURS.weekdays],
    startHour: DEFAULT_AVAILABILITY_HOURS.startHour,
    endHour: DEFAULT_AVAILABILITY_HOURS.endHour,
    timeZone,
    source: "default-policy",
    note:
      "Using KXD Edition 1 default working hours (Mon–Fri aligned with scheduling policy).",
    warnings,
  };
}

/**
 * Expand working hours into concrete UTC windows inside [rangeStart, rangeEnd].
 */
export function expandWorkingWindows(
  rangeStartIso: string,
  rangeEndIso: string,
  policy: AvailabilityWorkingHoursPolicy,
): NormalizedTimeWindow[] {
  const rangeStartMs = toMs(rangeStartIso);
  const rangeEndMs = toMs(rangeEndIso);
  if (rangeEndMs <= rangeStartMs) return [];

  const weekdaySet = new Set(policy.weekdays);
  const startParts = zonedParts(rangeStartMs, policy.timeZone);
  let cursor = {
    year: startParts.year,
    month: startParts.month,
    day: startParts.day,
  };

  const endParts = zonedParts(rangeEndMs - 1, policy.timeZone);
  const endKey = endParts.year * 10_000 + endParts.month * 100 + endParts.day;

  const windows: NormalizedTimeWindow[] = [];
  // Safety: max ~400 days
  for (let i = 0; i < 400; i += 1) {
    const key = cursor.year * 10_000 + cursor.month * 100 + cursor.day;
    if (key > endKey) break;

    const noonMs = zonedWallTimeToUtcMs(
      cursor.year,
      cursor.month,
      cursor.day,
      12,
      0,
      policy.timeZone,
    );
    const weekday = zonedParts(noonMs, policy.timeZone).weekday;

    if (weekdaySet.has(weekday)) {
      const winStart = zonedWallTimeToUtcMs(
        cursor.year,
        cursor.month,
        cursor.day,
        policy.startHour,
        0,
        policy.timeZone,
      );
      const winEnd = zonedWallTimeToUtcMs(
        cursor.year,
        cursor.month,
        cursor.day,
        policy.endHour,
        0,
        policy.timeZone,
      );
      const clippedStart = Math.max(winStart, rangeStartMs);
      const clippedEnd = Math.min(winEnd, rangeEndMs);
      if (clippedEnd > clippedStart) {
        windows.push({
          startMs: clippedStart,
          endMs: clippedEnd,
          start: toIso(clippedStart),
          end: toIso(clippedEnd),
        });
      }
    }

    cursor = addCalendarDays(cursor.year, cursor.month, cursor.day, 1);
  }

  return windows;
}
