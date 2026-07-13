/**
 * Phase 29C — Google Reporting API scopes and auth.
 *
 * Separate from Calendar OAuth (calendar.readonly / calendar.events)
 * and any Drive credentials. Reporting never reads GOOGLE_CALENDAR_* or Drive env.
 *
 * Credential precedence (intentional — no silent SA→OAuth fallthrough on bad SA JSON):
 * 1. GOOGLE_REPORTING_SERVICE_ACCOUNT_JSON (inline JSON)
 * 2. GA4_SERVICE_ACCOUNT_JSON / GSC_SERVICE_ACCOUNT_JSON (aliases)
 * 3. GOOGLE_APPLICATION_CREDENTIALS (filesystem path to JSON)
 * 4. GOOGLE_REPORTING_CLIENT_ID + CLIENT_SECRET + REFRESH_TOKEN (all three)
 * Else: not-configured
 *
 * If a higher-precedence source is present but invalid → invalid-configuration
 * (does not fall through to OAuth).
 */

import "server-only";

import { createSign } from "node:crypto";
import { envPresent, envValue } from "@/lib/live-integrations/status";
import { mapHttpStatusToProviderStatus, providerError, sanitizeProviderMessage } from "../errors";
import type { ReportingProviderError } from "../types";

export const GOOGLE_REPORTING_ANALYTICS_SCOPE =
  "https://www.googleapis.com/auth/analytics.readonly";

export const GOOGLE_REPORTING_WEBMASTERS_SCOPE =
  "https://www.googleapis.com/auth/webmasters.readonly";

export const GOOGLE_REPORTING_SCOPES = [
  GOOGLE_REPORTING_ANALYTICS_SCOPE,
  GOOGLE_REPORTING_WEBMASTERS_SCOPE,
] as const;

/** Documented precedence for operators and tests. */
export const GOOGLE_REPORTING_CREDENTIAL_PRECEDENCE = [
  "GOOGLE_REPORTING_SERVICE_ACCOUNT_JSON",
  "GA4_SERVICE_ACCOUNT_JSON",
  "GSC_SERVICE_ACCOUNT_JSON",
  "GOOGLE_APPLICATION_CREDENTIALS",
  "GOOGLE_REPORTING_CLIENT_ID+SECRET+REFRESH_TOKEN",
] as const;

const GOOGLE_OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token";

export type GoogleReportingAuthMode =
  | "service-account"
  | "oauth-refresh"
  | "not-configured"
  | "invalid-configuration";

export interface GoogleReportingAuthConfig {
  mode: GoogleReportingAuthMode;
  serviceAccountEmail?: string;
  oauthClientConfigured?: boolean;
  scopes: readonly string[];
  /** Sanitized reason when mode is invalid-configuration */
  invalidReason?: string;
}

export interface ServiceAccountJson {
  client_email: string;
  private_key: string;
  token_uri?: string;
}

interface CachedToken {
  accessToken: string;
  expiresAt: number;
  mode: Exclude<GoogleReportingAuthMode, "not-configured" | "invalid-configuration">;
}

let cachedToken: CachedToken | null = null;

export function clearGoogleReportingAccessTokenCache(): void {
  cachedToken = null;
}

/**
 * Parse and validate service account JSON.
 * Normalizes escaped newlines in private_key (common when stored in env).
 * Never throws with credential contents.
 */
export function parseServiceAccountJson(
  raw: string,
):
  | { ok: true; value: ServiceAccountJson }
  | { ok: false; error: ReportingProviderError } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {
      ok: false,
      error: providerError(
        "invalid-configuration",
        "Service account JSON is malformed.",
      ),
    };
  }

  if (!parsed || typeof parsed !== "object") {
    return {
      ok: false,
      error: providerError(
        "invalid-configuration",
        "Service account JSON must be an object.",
      ),
    };
  }

  const obj = parsed as Record<string, unknown>;
  const clientEmail = typeof obj.client_email === "string" ? obj.client_email.trim() : "";
  let privateKey = typeof obj.private_key === "string" ? obj.private_key : "";
  if (!clientEmail || !privateKey) {
    return {
      ok: false,
      error: providerError(
        "invalid-configuration",
        "Service account JSON requires client_email and private_key.",
      ),
    };
  }

  // Env-stored keys often contain literal \n sequences.
  privateKey = privateKey.replace(/\\n/g, "\n");
  if (!privateKey.includes("BEGIN") || !privateKey.includes("PRIVATE KEY")) {
    return {
      ok: false,
      error: providerError(
        "invalid-configuration",
        "Service account private_key is not a recognizable PEM key.",
      ),
    };
  }

  const tokenUri =
    typeof obj.token_uri === "string" && obj.token_uri.trim()
      ? obj.token_uri.trim()
      : undefined;

  return {
    ok: true,
    value: {
      client_email: clientEmail,
      private_key: privateKey,
      token_uri: tokenUri,
    },
  };
}

type CredentialResolution =
  | { kind: "service-account"; value: ServiceAccountJson; source: string }
  | { kind: "oauth" }
  | { kind: "not-configured" }
  | { kind: "invalid"; error: ReportingProviderError };

/**
 * Resolve reporting credentials with strict precedence (exported for tests via env injection).
 */
export function resolveGoogleReportingCredentials(env: {
  get: (key: string) => string | undefined;
  present: (key: string) => boolean;
}): CredentialResolution {
  const inlineKeys = [
    "GOOGLE_REPORTING_SERVICE_ACCOUNT_JSON",
    "GA4_SERVICE_ACCOUNT_JSON",
    "GSC_SERVICE_ACCOUNT_JSON",
  ] as const;

  for (const key of inlineKeys) {
    const raw = env.get(key)?.trim();
    if (!raw) continue;
    const parsed = parseServiceAccountJson(raw);
    if (!parsed.ok) return { kind: "invalid", error: parsed.error };
    return { kind: "service-account", value: parsed.value, source: key };
  }

  const credPath = env.get("GOOGLE_APPLICATION_CREDENTIALS")?.trim();
  if (credPath) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const fs = require("node:fs") as typeof import("node:fs");
      const file = fs.readFileSync(credPath, "utf8");
      const parsed = parseServiceAccountJson(file);
      if (!parsed.ok) return { kind: "invalid", error: parsed.error };
      return {
        kind: "service-account",
        value: parsed.value,
        source: "GOOGLE_APPLICATION_CREDENTIALS",
      };
    } catch {
      return {
        kind: "invalid",
        error: providerError(
          "invalid-configuration",
          "GOOGLE_APPLICATION_CREDENTIALS path could not be read.",
        ),
      };
    }
  }

  const hasOauth =
    env.present("GOOGLE_REPORTING_CLIENT_ID") &&
    env.present("GOOGLE_REPORTING_CLIENT_SECRET") &&
    env.present("GOOGLE_REPORTING_REFRESH_TOKEN");

  if (hasOauth) return { kind: "oauth" };

  // Guard: never accidentally pick Calendar or Drive credentials.
  if (
    env.present("GOOGLE_CALENDAR_REFRESH_TOKEN") ||
    env.present("GOOGLE_CALENDAR_CLIENT_ID")
  ) {
    // Still not-configured for reporting — Calendar env is intentionally ignored.
    return { kind: "not-configured" };
  }

  return { kind: "not-configured" };
}

function defaultEnv() {
  return {
    get: (key: string) => envValue(key) ?? undefined,
    present: (key: string) => envPresent(key),
  };
}

export function getGoogleReportingAuthConfig(
  env = defaultEnv(),
): GoogleReportingAuthConfig {
  const resolved = resolveGoogleReportingCredentials(env);
  if (resolved.kind === "service-account") {
    return {
      mode: "service-account",
      serviceAccountEmail: resolved.value.client_email,
      scopes: GOOGLE_REPORTING_SCOPES,
    };
  }
  if (resolved.kind === "oauth") {
    return {
      mode: "oauth-refresh",
      oauthClientConfigured: true,
      scopes: GOOGLE_REPORTING_SCOPES,
    };
  }
  if (resolved.kind === "invalid") {
    return {
      mode: "invalid-configuration",
      scopes: GOOGLE_REPORTING_SCOPES,
      invalidReason: resolved.error.message,
    };
  }
  return { mode: "not-configured", scopes: GOOGLE_REPORTING_SCOPES };
}

function base64url(input: Buffer | string): string {
  const buf = typeof input === "string" ? Buffer.from(input) : input;
  return buf
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

async function fetchServiceAccountAccessToken(
  sa: ServiceAccountJson,
): Promise<{ accessToken: string; expiresAt: number }> {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = base64url(
    JSON.stringify({
      iss: sa.client_email,
      scope: GOOGLE_REPORTING_SCOPES.join(" "),
      aud: sa.token_uri || GOOGLE_OAUTH_TOKEN_URL,
      iat: now,
      exp: now + 3600,
    }),
  );
  const unsigned = `${header}.${claim}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();
  const signature = base64url(signer.sign(sa.private_key));
  const assertion = `${unsigned}.${signature}`;

  const body = new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    assertion,
  });

  const res = await fetch(sa.token_uri || GOOGLE_OAUTH_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw Object.assign(new Error(sanitizeProviderMessage(text || `HTTP ${res.status}`)), {
      status: res.status,
    });
  }

  const json = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!json.access_token) {
    throw new Error("Service account token response missing access_token.");
  }
  return {
    accessToken: json.access_token,
    expiresAt: Date.now() + Math.max(30, (json.expires_in ?? 3600) - 60) * 1000,
  };
}

async function fetchOAuthRefreshAccessToken(): Promise<{ accessToken: string; expiresAt: number }> {
  const clientId = envValue("GOOGLE_REPORTING_CLIENT_ID");
  const clientSecret = envValue("GOOGLE_REPORTING_CLIENT_SECRET");
  const refreshToken = envValue("GOOGLE_REPORTING_REFRESH_TOKEN");
  if (!clientId || !clientSecret || !refreshToken) {
    throw Object.assign(new Error("Reporting OAuth credentials are not configured."), {
      status: 0,
      code: "not-configured",
    });
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });

  const res = await fetch(GOOGLE_OAUTH_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw Object.assign(new Error(sanitizeProviderMessage(text || `HTTP ${res.status}`)), {
      status: res.status,
    });
  }

  const json = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!json.access_token) {
    throw new Error("OAuth refresh response missing access_token.");
  }
  return {
    accessToken: json.access_token,
    expiresAt: Date.now() + Math.max(30, (json.expires_in ?? 3600) - 60) * 1000,
  };
}

export type GoogleReportingAccessResult =
  | { ok: true; accessToken: string; mode: "service-account" | "oauth-refresh" }
  | { ok: false; error: ReportingProviderError };

export async function getGoogleReportingAccessToken(): Promise<GoogleReportingAccessResult> {
  const resolved = resolveGoogleReportingCredentials(defaultEnv());

  if (resolved.kind === "not-configured") {
    return {
      ok: false,
      error: providerError(
        "not-configured",
        "Google Reporting credentials are not configured. Set GOOGLE_REPORTING_SERVICE_ACCOUNT_JSON or GOOGLE_REPORTING_* OAuth trio.",
      ),
    };
  }

  if (resolved.kind === "invalid") {
    return { ok: false, error: resolved.error };
  }

  const mode = resolved.kind === "service-account" ? "service-account" : "oauth-refresh";

  if (cachedToken && cachedToken.mode === mode && Date.now() < cachedToken.expiresAt) {
    return { ok: true, accessToken: cachedToken.accessToken, mode };
  }

  try {
    const token =
      resolved.kind === "service-account"
        ? await fetchServiceAccountAccessToken(resolved.value)
        : await fetchOAuthRefreshAccessToken();

    cachedToken = {
      accessToken: token.accessToken,
      expiresAt: token.expiresAt,
      mode,
    };
    return { ok: true, accessToken: token.accessToken, mode };
  } catch (err) {
    const status =
      typeof err === "object" && err && "status" in err
        ? Number((err as { status: number }).status)
        : undefined;
    const codeHint =
      typeof err === "object" && err && "code" in err
        ? String((err as { code: string }).code)
        : undefined;
    const message = err instanceof Error ? err.message : "Authentication failed";
    if (codeHint === "not-configured" || status === 0) {
      return { ok: false, error: providerError("not-configured", message) };
    }
    const code = status ? mapHttpStatusToProviderStatus(status) : "unauthorized";
    return {
      ok: false,
      error: providerError(code === "rate-limited" ? "rate-limited" : "unauthorized", message, {
        httpStatus: status && status > 0 ? status : undefined,
        retryable: status === 429 || (status != null && status >= 500),
      }),
    };
  }
}
