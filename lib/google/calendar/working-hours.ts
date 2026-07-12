/**
 * Phase 25C — Working hours for scheduling context.
 *
 * Google Calendar API does not reliably expose personal working hours.
 * We resolve from:
 * 1. GOOGLE_CALENDAR_WORKING_HOURS_JSON env override
 * 2. KXD scheduling policy defaults + calendar timezone
 */

import "server-only";

import { SCHEDULING_WORKING_HOURS } from "@/lib/scheduling/policy";
import { KXD_BUSINESS_TIMEZONE } from "@/lib/platform/timezone";
import { resolveGoogleCalendarTimezone } from "./timezone";
import type { WorkingHoursWindow } from "./types";
import { GOOGLE_CALENDAR_ENV } from "./validation";

interface EnvWorkingHours {
  weekdays?: number[];
  startHour?: number;
  endHour?: number;
}

function buildFromPolicy(
  timeZone: string,
  source: WorkingHoursWindow["source"],
  note: string,
): WorkingHoursWindow {
  return {
    weekdays: SCHEDULING_WORKING_HOURS.weekdaysOnly
      ? [1, 2, 3, 4, 5]
      : [0, 1, 2, 3, 4, 5, 6],
    startHour: SCHEDULING_WORKING_HOURS.startHour,
    endHour: SCHEDULING_WORKING_HOURS.endHour,
    timeZone,
    source,
    note,
  };
}

function tryEnvOverride(timeZone: string): WorkingHoursWindow | null {
  const raw = process.env[GOOGLE_CALENDAR_ENV.workingHoursJson]?.trim();
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as EnvWorkingHours;
    const weekdays =
      Array.isArray(parsed.weekdays) && parsed.weekdays.length > 0
        ? parsed.weekdays.map(Number).filter((n) => n >= 0 && n <= 6)
        : [1, 2, 3, 4, 5];
    const startHour =
      typeof parsed.startHour === "number"
        ? parsed.startHour
        : SCHEDULING_WORKING_HOURS.startHour;
    const endHour =
      typeof parsed.endHour === "number"
        ? parsed.endHour
        : SCHEDULING_WORKING_HOURS.endHour;
    return {
      weekdays,
      startHour,
      endHour,
      timeZone,
      source: "env-override",
      note: "Working hours loaded from GOOGLE_CALENDAR_WORKING_HOURS_JSON.",
    };
  } catch {
    return null;
  }
}

/** Offline-safe defaults — no Google calls. */
export function getDefaultWorkingHours(
  timeZone: string = KXD_BUSINESS_TIMEZONE,
): WorkingHoursWindow {
  return (
    tryEnvOverride(timeZone) ??
    buildFromPolicy(
      timeZone,
      "kxd-policy",
      "Using KXD scheduling policy defaults (no Google Calendar call).",
    )
  );
}

export async function getGoogleCalendarWorkingHours(
  calendarId?: string | null,
): Promise<WorkingHoursWindow> {
  let timeZone = KXD_BUSINESS_TIMEZONE;
  try {
    timeZone = await resolveGoogleCalendarTimezone(calendarId);
  } catch {
    /* keep business default */
  }

  const fromEnv = tryEnvOverride(timeZone);
  if (fromEnv) return fromEnv;

  return buildFromPolicy(
    timeZone,
    "kxd-policy",
    "Google Calendar API does not expose personal working hours; using KXD scheduling policy defaults with the calendar timezone.",
  );
}
