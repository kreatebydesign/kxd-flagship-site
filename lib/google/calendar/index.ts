/**
 * Phase 25C — Google Calendar read foundation.
 *
 * Auth: OAuth 2.0 (refresh token) for Matt’s founder calendar.
 * Scope: calendar.readonly only — no event writes in this phase.
 */

export type {
  BusyBlock,
  CalendarAvailabilitySnapshot,
  CalendarConnectionStatus,
  CalendarListItem,
  CalendarMetadata,
  FreeBusyQueryInput,
  FreeBusyResult,
  GoogleCalendarOAuthConfig,
  WorkingHoursSource,
  WorkingHoursWindow,
} from "./types";

export {
  GOOGLE_CALENDAR_API_BASE,
  GOOGLE_CALENDAR_READONLY_SCOPE,
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

export { queryGoogleCalendarFreeBusy } from "./availability";
export { resolveGoogleCalendarTimezone } from "./timezone";
export { getDefaultWorkingHours, getGoogleCalendarWorkingHours } from "./working-hours";

export {
  googleCalendarAvailabilityProvider,
  googleCalendarMetadataProvider,
} from "./providers";
