/**
 * Phase 25C — Typed Google Calendar / OAuth failures.
 * Never throw bare Error from the Google calendar domain.
 */

export type GoogleCalendarErrorCode =
  | "not_configured"
  | "authentication_failure"
  | "authorization_failure"
  | "calendar_not_found"
  | "network_failure"
  | "rate_limit"
  | "temporary_outage"
  | "malformed_response"
  | "unsupported_calendar"
  | "invalid_config"
  | "invalid_request";

export class GoogleCalendarError extends Error {
  readonly code: GoogleCalendarErrorCode;
  readonly status?: number;
  readonly retryable: boolean;
  readonly details?: Record<string, unknown>;

  constructor(
    code: GoogleCalendarErrorCode,
    message: string,
    opts?: {
      status?: number;
      retryable?: boolean;
      details?: Record<string, unknown>;
      cause?: unknown;
    },
  ) {
    super(message, opts?.cause ? { cause: opts.cause } : undefined);
    this.name = "GoogleCalendarError";
    this.code = code;
    this.status = opts?.status;
    this.retryable = opts?.retryable ?? false;
    this.details = opts?.details;
  }
}

export function isGoogleCalendarError(err: unknown): err is GoogleCalendarError {
  return err instanceof GoogleCalendarError;
}

/** Map Google HTTP status / body to a typed domain error. */
export function googleCalendarErrorFromHttp(
  status: number,
  bodyText: string,
): GoogleCalendarError {
  const snippet = bodyText.slice(0, 240);
  if (status === 401) {
    return new GoogleCalendarError(
      "authentication_failure",
      "Google Calendar authentication failed — refresh token or credentials are invalid.",
      { status, retryable: false, details: { body: snippet } },
    );
  }
  if (status === 403) {
    return new GoogleCalendarError(
      "authorization_failure",
      "Google Calendar authorization failed — missing scope or calendar access denied.",
      { status, retryable: false, details: { body: snippet } },
    );
  }
  if (status === 404) {
    return new GoogleCalendarError(
      "calendar_not_found",
      "Google Calendar resource not found.",
      { status, retryable: false, details: { body: snippet } },
    );
  }
  if (status === 429) {
    return new GoogleCalendarError(
      "rate_limit",
      "Google Calendar rate limit exceeded.",
      { status, retryable: true, details: { body: snippet } },
    );
  }
  if (status >= 500) {
    return new GoogleCalendarError(
      "temporary_outage",
      "Google Calendar temporary outage.",
      { status, retryable: true, details: { body: snippet } },
    );
  }
  return new GoogleCalendarError(
    "malformed_response",
    `Unexpected Google Calendar HTTP ${status}.`,
    { status, retryable: false, details: { body: snippet } },
  );
}
