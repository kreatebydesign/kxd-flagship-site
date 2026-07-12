/**
 * Phase 25C — Environment / OAuth config validation for Google Calendar.
 */

import { GoogleCalendarError } from "./errors";
import {
  GOOGLE_CALENDAR_WRITE_SCOPES,
  type GoogleCalendarOAuthConfig,
  type CalendarConnectionStatus,
} from "./types";

function trimEnv(key: string): string | null {
  const v = process.env[key]?.trim();
  return v ? v : null;
}

export const GOOGLE_CALENDAR_ENV = {
  clientId: "GOOGLE_CALENDAR_CLIENT_ID",
  clientSecret: "GOOGLE_CALENDAR_CLIENT_SECRET",
  redirectUri: "GOOGLE_CALENDAR_REDIRECT_URI",
  refreshToken: "GOOGLE_CALENDAR_REFRESH_TOKEN",
  calendarId: "GOOGLE_CALENDAR_ID",
  workingHoursJson: "GOOGLE_CALENDAR_WORKING_HOURS_JSON",
} as const;

/**
 * Load OAuth config. Does not require refresh token (needed for connect flow).
 * Throws GoogleCalendarError(invalid_config) when client credentials missing.
 */
export function loadGoogleCalendarOAuthConfig(opts?: {
  requireRefreshToken?: boolean;
}): GoogleCalendarOAuthConfig {
  const clientId = trimEnv(GOOGLE_CALENDAR_ENV.clientId);
  const clientSecret = trimEnv(GOOGLE_CALENDAR_ENV.clientSecret);
  const redirectUri =
    trimEnv(GOOGLE_CALENDAR_ENV.redirectUri) ||
    "http://localhost:3000/api/admin/calendar/oauth/callback";
  const refreshToken = trimEnv(GOOGLE_CALENDAR_ENV.refreshToken);
  const preferredCalendarId = trimEnv(GOOGLE_CALENDAR_ENV.calendarId);

  const missing: string[] = [];
  if (!clientId) missing.push(GOOGLE_CALENDAR_ENV.clientId);
  if (!clientSecret) missing.push(GOOGLE_CALENDAR_ENV.clientSecret);
  if (opts?.requireRefreshToken && !refreshToken) {
    missing.push(GOOGLE_CALENDAR_ENV.refreshToken);
  }

  if (missing.length > 0) {
    throw new GoogleCalendarError(
      "invalid_config",
      `Google Calendar OAuth is not fully configured. Missing: ${missing.join(", ")}.`,
      { details: { missing } },
    );
  }

  return {
    clientId: clientId!,
    clientSecret: clientSecret!,
    redirectUri,
    refreshToken,
    preferredCalendarId,
    scopes: [...GOOGLE_CALENDAR_WRITE_SCOPES],
  };
}

export function getGoogleCalendarConnectionStatus(): CalendarConnectionStatus {
  const clientId = trimEnv(GOOGLE_CALENDAR_ENV.clientId);
  const clientSecret = trimEnv(GOOGLE_CALENDAR_ENV.clientSecret);
  const refreshToken = trimEnv(GOOGLE_CALENDAR_ENV.refreshToken);
  const preferredCalendarId = trimEnv(GOOGLE_CALENDAR_ENV.calendarId);

  const missingEnv: string[] = [];
  if (!clientId) missingEnv.push(GOOGLE_CALENDAR_ENV.clientId);
  if (!clientSecret) missingEnv.push(GOOGLE_CALENDAR_ENV.clientSecret);
  if (!refreshToken) missingEnv.push(GOOGLE_CALENDAR_ENV.refreshToken);

  const configured = Boolean(clientId && clientSecret);
  const connected = configured && Boolean(refreshToken);

  return {
    configured,
    connected,
    hasRefreshToken: Boolean(refreshToken),
    preferredCalendarId,
    scope: GOOGLE_CALENDAR_WRITE_SCOPES.join(" "),
    /** Phase 26C — writes enabled when OAuth refresh token is connected. */
    writeEnabled: connected,
    missingEnv,
  };
}

export function assertCalendarId(calendarId: string): string {
  const id = calendarId.trim();
  if (!id) {
    throw new GoogleCalendarError(
      "invalid_request",
      "calendarId is required.",
    );
  }
  if (id.includes("\n") || id.includes("\r")) {
    throw new GoogleCalendarError(
      "invalid_request",
      "calendarId contains invalid characters.",
    );
  }
  return id;
}

export function assertIsoRange(timeMin: string, timeMax: string): void {
  const min = Date.parse(timeMin);
  const max = Date.parse(timeMax);
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    throw new GoogleCalendarError(
      "invalid_request",
      "timeMin and timeMax must be valid ISO datetimes.",
    );
  }
  if (max <= min) {
    throw new GoogleCalendarError(
      "invalid_request",
      "timeMax must be after timeMin.",
    );
  }
  const spanMs = max - min;
  const maxSpan = 45 * 24 * 60 * 60 * 1000; // Google freebusy practical window
  if (spanMs > maxSpan) {
    throw new GoogleCalendarError(
      "invalid_request",
      "Free/busy window must be 45 days or less.",
    );
  }
}
