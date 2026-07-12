/**
 * Phase 25C — Scheduling Domain calendar context adapter.
 *
 * Exposes availability through provider interfaces only.
 * Does not change proposal lifecycle or recommend slots.
 */

import "server-only";

import {
  googleCalendarAvailabilityProvider,
  googleCalendarDayObserver,
  googleCalendarEventReader,
  googleCalendarEventWriter,
  googleCalendarMetadataProvider,
} from "@/lib/google/calendar/providers";
import { getGoogleCalendarConnectionStatus } from "@/lib/google/calendar/validation";
import type { CalendarAvailabilitySnapshot } from "@/lib/google/calendar/types";
import type {
  CalendarAvailabilityProvider,
  CalendarDayObserver,
  CalendarEventReader,
  CalendarEventWriter,
  CalendarMetadataProvider,
} from "./calendar-providers";

export type {
  CalendarAvailabilityProvider,
  CalendarDayObserver,
  CalendarEventReader,
  CalendarEventWriter,
  CalendarMetadataProvider,
} from "./calendar-providers";

/** Default providers — Google Calendar. */
export function getCalendarMetadataProvider(): CalendarMetadataProvider {
  return googleCalendarMetadataProvider;
}

export function getCalendarAvailabilityProvider(): CalendarAvailabilityProvider {
  return googleCalendarAvailabilityProvider;
}

export function getCalendarEventWriter(): CalendarEventWriter {
  return googleCalendarEventWriter;
}

export function getCalendarEventReader(): CalendarEventReader {
  return googleCalendarEventReader;
}

export function getCalendarDayObserver(): CalendarDayObserver {
  return googleCalendarDayObserver;
}

export interface SchedulingCalendarContext {
  calendarConnected: boolean;
  calendarAvailabilityAssessed: boolean;
  calendarAvailability: CalendarAvailabilitySnapshot | null;
  busyBlocks: CalendarAvailabilitySnapshot["busyBlocks"];
  timezone: string;
  workingHours: CalendarAvailabilitySnapshot["workingHours"] | null;
  errors: string[];
}

/**
 * Load deterministic calendar context for a time window.
 * Safe when calendar is disconnected — assessed=false, empty busy blocks.
 */
export async function getSchedulingCalendarContext(input: {
  timeMin: string;
  timeMax: string;
  calendarId?: string | null;
}): Promise<SchedulingCalendarContext> {
  const status = getGoogleCalendarConnectionStatus();
  const snapshot = await getCalendarAvailabilityProvider().getAvailabilitySnapshot({
    calendarId: input.calendarId,
    timeMin: input.timeMin,
    timeMax: input.timeMax,
  });

  return {
    calendarConnected: status.connected,
    calendarAvailabilityAssessed: snapshot.calendarAvailabilityAssessed,
    calendarAvailability: snapshot,
    busyBlocks: snapshot.busyBlocks,
    timezone: snapshot.timezone,
    workingHours: snapshot.workingHours,
    errors: snapshot.errors,
  };
}
