/**
 * Phase 25C — Provider interfaces for Scheduling Domain.
 * Scheduling consumes these — never Google client internals.
 */

import type {
  BusyBlock,
  CalendarAvailabilitySnapshot,
  CalendarEventReadResult,
  CalendarListItem,
  CalendarMetadata,
  CreateCalendarEventInput,
  CreatedCalendarEvent,
  FreeBusyQueryInput,
  FreeBusyResult,
  GetCalendarEventInput,
  ListCalendarEventsInput,
  ListCalendarEventsResult,
  ObservedCalendarEvent,
  WorkingHoursWindow,
} from "@/lib/google/calendar/types";

export interface CalendarMetadataProvider {
  listCalendars(): Promise<CalendarListItem[]>;
  getPrimaryCalendar(): Promise<CalendarListItem>;
  getCalendarMetadata(calendarId?: string | null): Promise<CalendarMetadata>;
  getTimezone(calendarId?: string | null): Promise<string>;
  getWorkingHours(calendarId?: string | null): Promise<WorkingHoursWindow>;
  validateOwnership(calendarId?: string | null): Promise<{
    ok: true;
    calendarId: string;
    accessRole: string;
    primary: boolean;
  }>;
}

export interface CalendarAvailabilityProvider {
  /**
   * Query free/busy for a window.
   * Does not recommend slots — raw busy blocks only.
   */
  queryFreeBusy(input: FreeBusyQueryInput): Promise<FreeBusyResult>;

  /**
   * Build a deterministic availability snapshot for Scheduling.
   */
  getAvailabilitySnapshot(input: {
    calendarId?: string | null;
    timeMin: string;
    timeMax: string;
  }): Promise<CalendarAvailabilitySnapshot>;
}

/**
 * Phase 26C — Event creation only (no update / delete).
 * Scheduling calls this — never Google modules directly.
 */
export interface CalendarEventWriter {
  createEvent(input: CreateCalendarEventInput): Promise<CreatedCalendarEvent>;
}

/**
 * Phase 27A — Linked event read only (no create / update / delete).
 * Returns normalized scheduling-domain shapes — never raw Google payloads.
 */
export interface CalendarEventReader {
  getEvent(input: GetCalendarEventInput): Promise<CalendarEventReadResult>;
}

/**
 * Phase 27B — Current-day / range observation (read-only).
 * Observing the day is distinct from syncing a linked schedule record.
 */
export interface CalendarDayObserver {
  listEventsInRange(
    input: ListCalendarEventsInput,
  ): Promise<ListCalendarEventsResult>;
}

export type {
  BusyBlock,
  CalendarAvailabilitySnapshot,
  CalendarEventReadResult,
  CreateCalendarEventInput,
  CreatedCalendarEvent,
  GetCalendarEventInput,
  ListCalendarEventsInput,
  ListCalendarEventsResult,
  ObservedCalendarEvent,
  WorkingHoursWindow,
};
