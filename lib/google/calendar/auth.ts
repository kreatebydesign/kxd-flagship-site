/**
 * Phase 25C — Google Calendar OAuth (user consent / refresh token).
 *
 * Option A: OAuth 2.0 for Matt’s personal/founder calendar.
 * Access tokens are short-lived and cached in-process only.
 * Credentials (client secret, refresh token) are never cached or returned to UI routes
 * except the one-time OAuth callback setup payload for an authenticated admin.
 */

import "server-only";

import { GoogleCalendarError, googleCalendarErrorFromHttp } from "./errors";
import {
  GOOGLE_OAUTH_AUTH_URL,
  GOOGLE_OAUTH_TOKEN_URL,
  type GoogleCalendarAccessToken,
  type GoogleCalendarOAuthConfig,
} from "./types";
import { loadGoogleCalendarOAuthConfig } from "./validation";

/** In-process access token only — never persist credentials here. */
let cachedAccess: GoogleCalendarAccessToken | null = null;

const ACCESS_TOKEN_SKEW_MS = 60_000;

export function clearGoogleCalendarAccessTokenCache(): void {
  cachedAccess = null;
}

export function buildGoogleCalendarAuthorizationUrl(opts?: {
  state?: string;
  prompt?: "consent" | "select_account" | "none";
}): string {
  const config = loadGoogleCalendarOAuthConfig({ requireRefreshToken: false });
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    scope: config.scopes.join(" "),
    access_type: "offline",
    include_granted_scopes: "true",
    prompt: opts?.prompt ?? "consent",
  });
  if (opts?.state) params.set("state", opts.state);
  return `${GOOGLE_OAUTH_AUTH_URL}?${params.toString()}`;
}

export interface GoogleOAuthTokenExchangeResult {
  accessToken: string;
  expiresIn: number;
  refreshToken: string | null;
  scope: string | null;
  tokenType: string;
}

/**
 * Exchange authorization code for tokens (one-time connect).
 * Refresh token must be stored as GOOGLE_CALENDAR_REFRESH_TOKEN (env / Vercel secret).
 */
export async function exchangeGoogleCalendarAuthorizationCode(
  code: string,
): Promise<GoogleOAuthTokenExchangeResult> {
  const trimmed = code.trim();
  if (!trimmed) {
    throw new GoogleCalendarError(
      "invalid_request",
      "OAuth authorization code is required.",
    );
  }

  const config = loadGoogleCalendarOAuthConfig({ requireRefreshToken: false });
  const body = new URLSearchParams({
    code: trimmed,
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri: config.redirectUri,
    grant_type: "authorization_code",
  });

  const res = await fetch(GOOGLE_OAUTH_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });

  const text = await res.text().catch(() => "");
  if (!res.ok) {
    throw googleCalendarErrorFromHttp(res.status, text);
  }

  let json: Record<string, unknown>;
  try {
    json = JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new GoogleCalendarError(
      "malformed_response",
      "OAuth token response was not valid JSON.",
    );
  }

  const accessToken = typeof json.access_token === "string" ? json.access_token : null;
  if (!accessToken) {
    throw new GoogleCalendarError(
      "malformed_response",
      "OAuth token response missing access_token.",
    );
  }

  const expiresIn =
    typeof json.expires_in === "number" ? json.expires_in : 3600;
  const refreshToken =
    typeof json.refresh_token === "string" ? json.refresh_token : null;

  cachedAccess = {
    accessToken,
    expiresAt: Date.now() + expiresIn * 1000,
    tokenType: typeof json.token_type === "string" ? json.token_type : "Bearer",
    scope: typeof json.scope === "string" ? json.scope : undefined,
  };

  return {
    accessToken,
    expiresIn,
    refreshToken,
    scope: typeof json.scope === "string" ? json.scope : null,
    tokenType: cachedAccess.tokenType,
  };
}

async function refreshAccessToken(
  config: GoogleCalendarOAuthConfig,
): Promise<GoogleCalendarAccessToken> {
  if (!config.refreshToken) {
    throw new GoogleCalendarError(
      "not_configured",
      "GOOGLE_CALENDAR_REFRESH_TOKEN is not set. Complete OAuth connect first.",
    );
  }

  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    refresh_token: config.refreshToken,
    grant_type: "refresh_token",
  });

  let res: Response;
  try {
    res = await fetch(GOOGLE_OAUTH_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      cache: "no-store",
    });
  } catch (err) {
    throw new GoogleCalendarError(
      "network_failure",
      "Failed to reach Google OAuth token endpoint.",
      { retryable: true, cause: err },
    );
  }

  const text = await res.text().catch(() => "");
  if (!res.ok) {
    throw googleCalendarErrorFromHttp(res.status, text);
  }

  let json: Record<string, unknown>;
  try {
    json = JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new GoogleCalendarError(
      "malformed_response",
      "Refresh token response was not valid JSON.",
    );
  }

  const accessToken = typeof json.access_token === "string" ? json.access_token : null;
  if (!accessToken) {
    throw new GoogleCalendarError(
      "authentication_failure",
      "Refresh token exchange did not return an access token.",
    );
  }

  const expiresIn =
    typeof json.expires_in === "number" ? json.expires_in : 3600;

  const token: GoogleCalendarAccessToken = {
    accessToken,
    expiresAt: Date.now() + expiresIn * 1000,
    tokenType: typeof json.token_type === "string" ? json.token_type : "Bearer",
    scope: typeof json.scope === "string" ? json.scope : undefined,
  };
  cachedAccess = token;
  return token;
}

/**
 * Returns a valid access token, refreshing when needed.
 * Never returns client secret or refresh token.
 */
export async function getGoogleCalendarAccessToken(): Promise<string> {
  if (
    cachedAccess &&
    cachedAccess.expiresAt - ACCESS_TOKEN_SKEW_MS > Date.now()
  ) {
    return cachedAccess.accessToken;
  }

  const config = loadGoogleCalendarOAuthConfig({ requireRefreshToken: true });
  const token = await refreshAccessToken(config);
  return token.accessToken;
}
