/**
 * Phase 25C — Google Calendar domain types.
 * Plain domain objects — never expose Google SDK shapes to Scheduling.
 */

export const GOOGLE_CALENDAR_READONLY_SCOPE =
  "https://www.googleapis.com/auth/calendar.readonly" as const;

/** Event create/update/delete — Phase 26C write scope (least privilege for events). */
export const GOOGLE_CALENDAR_EVENTS_SCOPE =
  "https://www.googleapis.com/auth/calendar.events" as const;

export const GOOGLE_CALENDAR_WRITE_SCOPES = [
  GOOGLE_CALENDAR_READONLY_SCOPE,
  GOOGLE_CALENDAR_EVENTS_SCOPE,
] as const;

export const GOOGLE_OAUTH_AUTH_URL =
  "https://accounts.google.com/o/oauth2/v2/auth" as const;

export const GOOGLE_OAUTH_TOKEN_URL =
  "https://oauth2.googleapis.com/token" as const;

export const GOOGLE_CALENDAR_API_BASE =
  "https://www.googleapis.com/calendar/v3" as const;

export interface GoogleCalendarOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  refreshToken: string | null;
  /** Optional preferred calendar id (defaults to primary). */
  preferredCalendarId: string | null;
  scopes: readonly string[];
}

export interface GoogleCalendarAccessToken {
  accessToken: string;
  expiresAt: number;
  tokenType: string;
  scope?: string;
}

export interface CalendarListItem {
  id: string;
  summary: string;
  description: string | null;
  primary: boolean;
  accessRole: string;
  timeZone: string | null;
  selected: boolean;
  backgroundColor: string | null;
}

export interface CalendarMetadata {
  id: string;
  summary: string;
  description: string | null;
  timeZone: string;
  accessRole: string | null;
  primary: boolean;
}

export interface BusyBlock {
  calendarId: string;
  start: string;
  end: string;
}

export interface FreeBusyQueryInput {
  calendarIds: string[];
  timeMin: string;
  timeMax: string;
  timeZone?: string;
}

export interface FreeBusyResult {
  timeMin: string;
  timeMax: string;
  timeZone: string;
  calendars: Array<{
    calendarId: string;
    busy: BusyBlock[];
    errors: string[];
  }>;
  queriedAt: string;
}

export type WorkingHoursSource =
  | "kxd-policy"
  | "env-override"
  | "calendar-unavailable";

export interface WorkingHoursWindow {
  /** 0 = Sunday … 6 = Saturday */
  weekdays: number[];
  startHour: number;
  endHour: number;
  timeZone: string;
  source: WorkingHoursSource;
  note: string;
}

export interface CalendarConnectionStatus {
  configured: boolean;
  connected: boolean;
  hasRefreshToken: boolean;
  preferredCalendarId: string | null;
  scope: string;
  /** Phase 26C — true when connected; event creation is available. */
  writeEnabled: boolean;
  missingEnv: string[];
}

/**
 * Input for creating a single calendar event (domain shape — not Google SDK).
 */
export interface CreateCalendarEventInput {
  /** When omitted, the writer resolves preferred / primary calendar. */
  calendarId?: string | null;
  title: string;
  description?: string | null;
  start: string;
  end: string;
  timezone: string;
  attendees?: Array<{ email: string }>;
}

/**
 * Confirmed Google event metadata returned to Scheduling (plain objects only).
 */
export interface CreatedCalendarEvent {
  googleEventId: string;
  htmlLink: string | null;
  etag: string | null;
  calendarId: string;
  createdAt: string;
}

/**
 * Phase 27A — Normalized calendar event state for Scheduling (read-only).
 * Never a raw Google API payload.
 */
export interface CalendarEventSnapshot {
  eventId: string;
  calendarId: string;
  title: string | null;
  description: string | null;
  location: string | null;
  start: string | null;
  end: string | null;
  timezone: string | null;
  status: string | null;
  htmlLink: string | null;
  etag: string | null;
  updatedAt: string | null;
  createdAt: string | null;
  organizerEmail: string | null;
  cancelled: boolean;
  exists: boolean;
}

export type CalendarEventReadFailureClassification =
  | "authorization_failure"
  | "authentication_failure"
  | "provider_unavailable"
  | "transient_error"
  | "not_found"
  | "invalid_request"
  | "unknown";

export interface CalendarEventReadFailure {
  classification: CalendarEventReadFailureClassification;
  message: string;
  retryable: boolean;
  providerCode?: string;
}

/**
 * Reader outcome — found, missing (404), or provider failure.
 * Does not create, update, or delete events.
 */
export type CalendarEventReadResult =
  | {
      outcome: "found";
      event: CalendarEventSnapshot;
      failure: null;
    }
  | {
      outcome: "missing";
      event: null;
      failure: CalendarEventReadFailure;
    }
  | {
      outcome: "failure";
      event: null;
      failure: CalendarEventReadFailure;
    };

export interface GetCalendarEventInput {
  calendarId: string;
  eventId: string;
}

/**
 * Phase 27B — Read-only day/range observation (no create/update/delete).
 */
export interface ListCalendarEventsInput {
  calendarId?: string | null;
  timeMin: string;
  timeMax: string;
  /** Max events to return (Google page size). */
  maxResults?: number;
}

/**
 * Observed event for day composition — privacy-aware, never a raw Google payload.
 */
export interface ObservedCalendarEvent extends CalendarEventSnapshot {
  allDay: boolean;
  /** True when Google marks the event private/confidential or summary is withheld. */
  isPrivate: boolean;
  visibility: string | null;
  transparency: string | null;
}

export interface ListCalendarEventsResult {
  outcome: "ok" | "failure";
  calendarId: string | null;
  events: ObservedCalendarEvent[];
  observedAt: string;
  failure: CalendarEventReadFailure | null;
}

/**
 * Deterministic availability snapshot for Scheduling Domain consumption.
 */
export interface CalendarAvailabilitySnapshot {
  calendarAvailabilityAssessed: boolean;
  calendarId: string | null;
  timezone: string;
  workingHours: WorkingHoursWindow;
  busyBlocks: BusyBlock[];
  timeMin: string | null;
  timeMax: string | null;
  assessedAt: string | null;
  errors: string[];
}
