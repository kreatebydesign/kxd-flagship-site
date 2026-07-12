/**
 * Phase 25C / 26C — Google Calendar foundation.
 *
 * Auth: OAuth 2.0 (refresh token) for Matt’s founder calendar.
 * Scopes: calendar.readonly + calendar.events (Phase 26C create).
 */

export type {
  BusyBlock,
  CalendarAvailabilitySnapshot,
  CalendarConnectionStatus,
  CalendarListItem,
  CalendarMetadata,
  CreateCalendarEventInput,
  CreatedCalendarEvent,
  FreeBusyQueryInput,
  FreeBusyResult,
  GoogleCalendarOAuthConfig,
  WorkingHoursSource,
  WorkingHoursWindow,
} from "./types";

export {
  GOOGLE_CALENDAR_API_BASE,
  GOOGLE_CALENDAR_EVENTS_SCOPE,
  GOOGLE_CALENDAR_READONLY_SCOPE,
  GOOGLE_CALENDAR_WRITE_SCOPES,
  GOOGLE_OAUTH_AUTH_URL,
  GOOGLE_OAUTH_TOKEN_URL,
} from "./types";

export {
  GoogleCalendarError,
  googleCalendarErrorFromHttp,
  isGoogleCalendarError,
} from "./errors";
export type { GoogleCalendarErrorCode } from "./errors";

export {
  GOOGLE_CALENDAR_ENV,
  assertCalendarId,
  assertIsoRange,
  getGoogleCalendarConnectionStatus,
  loadGoogleCalendarOAuthConfig,
} from "./validation";

export {
  buildGoogleCalendarAuthorizationUrl,
  clearGoogleCalendarAccessTokenCache,
  exchangeGoogleCalendarAuthorizationCode,
  getGoogleCalendarAccessToken,
} from "./auth";

export { clearCalendarReadCache } from "./cache";

export {
  getGoogleCalendarMetadata,
  getPrimaryGoogleCalendar,
  listGoogleCalendars,
  resolveTargetCalendarId,
  validateCalendarOwnership,
} from "./calendars";

export { createCalendarEvent, getCalendarEvent, listCalendarEventsInRange } from "./events";

export { queryGoogleCalendarFreeBusy } from "./availability";
export { resolveGoogleCalendarTimezone } from "./timezone";
export {
  getDefaultWorkingHours,
  getGoogleCalendarWorkingHours,
} from "./working-hours";

export {
  googleCalendarAvailabilityProvider,
  googleCalendarDayObserver,
  googleCalendarEventReader,
  googleCalendarEventWriter,
  googleCalendarMetadataProvider,
} from "./providers";
