/**
 * Phase 25C — Google Calendar domain types.
 * Plain domain objects — never expose Google SDK shapes to Scheduling.
 */

export const GOOGLE_CALENDAR_READONLY_SCOPE =
  "https://www.googleapis.com/auth/calendar.readonly" as const;

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
  /** Read-only foundation — writes are never enabled in 25C. */
  writeEnabled: false;
  missingEnv: string[];
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
