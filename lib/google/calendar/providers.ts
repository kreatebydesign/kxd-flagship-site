/**
 * Phase 25C / 26C — Google implementations of Scheduling calendar provider interfaces.
 */

import "server-only";

import { queryGoogleCalendarFreeBusy } from "./availability";
import {
  getGoogleCalendarMetadata,
  getPrimaryGoogleCalendar,
  listGoogleCalendars,
  resolveTargetCalendarId,
  validateCalendarOwnership,
} from "./calendars";
import { createCalendarEvent, getCalendarEvent, listCalendarEventsInRange } from "./events";
import { isGoogleCalendarError } from "./errors";
import { resolveGoogleCalendarTimezone } from "./timezone";
import type { CalendarAvailabilitySnapshot } from "./types";
import { getGoogleCalendarConnectionStatus } from "./validation";
import {
  getDefaultWorkingHours,
  getGoogleCalendarWorkingHours,
} from "./working-hours";
import type {
  CalendarAvailabilityProvider,
  CalendarDayObserver,
  CalendarEventReader,
  CalendarEventWriter,
  CalendarMetadataProvider,
} from "@/lib/scheduling/calendar-providers";

export const googleCalendarMetadataProvider: CalendarMetadataProvider = {
  listCalendars: () => listGoogleCalendars(),
  getPrimaryCalendar: () => getPrimaryGoogleCalendar(),
  getCalendarMetadata: (calendarId) => getGoogleCalendarMetadata(calendarId),
  getTimezone: (calendarId) => resolveGoogleCalendarTimezone(calendarId),
  getWorkingHours: (calendarId) => getGoogleCalendarWorkingHours(calendarId),
  validateOwnership: (calendarId) => validateCalendarOwnership(calendarId),
};

export const googleCalendarAvailabilityProvider: CalendarAvailabilityProvider = {
  queryFreeBusy: (input) => queryGoogleCalendarFreeBusy(input),

  async getAvailabilitySnapshot(input) {
    const status = getGoogleCalendarConnectionStatus();
    if (!status.connected) {
      const workingHours = getDefaultWorkingHours();
      return {
        calendarAvailabilityAssessed: false,
        calendarId: null,
        timezone: workingHours.timeZone,
        workingHours: {
          ...workingHours,
          source: "calendar-unavailable",
          note: "Google Calendar is not connected — availability not assessed.",
        },
        busyBlocks: [],
        timeMin: input.timeMin,
        timeMax: input.timeMax,
        assessedAt: null,
        errors: status.missingEnv.map((k) => `Missing ${k}`),
      } satisfies CalendarAvailabilitySnapshot;
    }

    try {
      const calendarId = await resolveTargetCalendarId(input.calendarId);
      const workingHours = await getGoogleCalendarWorkingHours(calendarId);
      const freeBusy = await queryGoogleCalendarFreeBusy({
        calendarIds: [calendarId],
        timeMin: input.timeMin,
        timeMax: input.timeMax,
        timeZone: workingHours.timeZone,
      });

      const busyBlocks = freeBusy.calendars.flatMap((c) => c.busy);
      const errors = freeBusy.calendars.flatMap((c) => c.errors);

      return {
        calendarAvailabilityAssessed: true,
        calendarId,
        timezone: freeBusy.timeZone,
        workingHours,
        busyBlocks,
        timeMin: freeBusy.timeMin,
        timeMax: freeBusy.timeMax,
        assessedAt: freeBusy.queriedAt,
        errors,
      };
    } catch (err) {
      const message = isGoogleCalendarError(err)
        ? `${err.code}: ${err.message}`
        : err instanceof Error
          ? err.message
          : "Unknown calendar error";

      const workingHours = getDefaultWorkingHours();

      return {
        calendarAvailabilityAssessed: false,
        calendarId: input.calendarId ?? null,
        timezone: workingHours.timeZone,
        workingHours: {
          ...workingHours,
          source: "calendar-unavailable",
          note: "Calendar availability could not be assessed.",
        },
        busyBlocks: [],
        timeMin: input.timeMin,
        timeMax: input.timeMax,
        assessedAt: null,
        errors: [message],
      };
    }
  },
};

/** Phase 26C — create-only writer. */
export const googleCalendarEventWriter: CalendarEventWriter = {
  async createEvent(input) {
    const calendarId = await resolveTargetCalendarId(input.calendarId);
    return createCalendarEvent({
      ...input,
      calendarId,
    });
  },
};

/** Phase 27A — read-only linked event fetch. Never creates or mutates. */
export const googleCalendarEventReader: CalendarEventReader = {
  async getEvent(input) {
    const calendarId = await resolveTargetCalendarId(input.calendarId);
    return getCalendarEvent({
      calendarId,
      eventId: input.eventId,
    });
  },
};

/** Phase 27B — day observation. Never creates, updates, deletes, or syncs links. */
export const googleCalendarDayObserver: CalendarDayObserver = {
  async listEventsInRange(input) {
    const calendarId = await resolveTargetCalendarId(input.calendarId);
    return listCalendarEventsInRange({
      ...input,
      calendarId,
    });
  },
};
