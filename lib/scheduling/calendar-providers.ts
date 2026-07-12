/**
 * Phase 25C — Provider interfaces for Scheduling Domain.
 * Scheduling consumes these — never Google client internals.
 */

import type {
  BusyBlock,
  CalendarAvailabilitySnapshot,
  CalendarListItem,
  CalendarMetadata,
  FreeBusyQueryInput,
  FreeBusyResult,
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

export type { BusyBlock, CalendarAvailabilitySnapshot, WorkingHoursWindow };
