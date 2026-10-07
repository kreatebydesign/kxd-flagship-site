/**
 * Strict Origin allowlist for KXD Network partner activation APIs only.
 * Does not alter Client HQ / CES / WebAuthn portal origin guards.
 */

import { NETWORK_HOST } from "@/lib/portal/constants";

export const PARTNER_ACTIVATION_ORIGIN_ERROR = "Invalid request origin.";

export const PARTNER_ACTIVATION_PRODUCTION_ORIGIN = `https://${NETWORK_HOST}`;

function isProductionRuntime(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.NODE_ENV === "production" || env.VERCEL_ENV === "production";
}

/**
 * Explicit allowlist — no wildcards, suffix matching, or reflection.
 * Production: only https://network.kreatebydesign.com
 * Non-production: localhost loopbacks (+ canonical network origin for local QA).
 */
export function resolvePartnerActivationAllowedOrigins(
  env: NodeJS.ProcessEnv = process.env,
): readonly string[] {
  if (isProductionRuntime(env)) {
    return [PARTNER_ACTIVATION_PRODUCTION_ORIGIN];
  }
  return [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    PARTNER_ACTIVATION_PRODUCTION_ORIGIN,
  ];
}

/**
 * Fail closed unless the request carries an Origin header that exactly matches
 * the partner-activation allowlist. No Referer/Host bypass.
 */
export function assertPartnerActivationOrigin(
  req: Request,
  env: NodeJS.ProcessEnv = process.env,
): { ok: true; origin: string } | { ok: false; status: 403; message: string } {
  const raw = req.headers.get("origin");
  if (!raw) {
    return {
      ok: false,
      status: 403,
      message: PARTNER_ACTIVATION_ORIGIN_ERROR,
    };
  }

  let origin: string;
  try {
    origin = new URL(raw).origin;
  } catch {
    return {
      ok: false,
      status: 403,
      message: PARTNER_ACTIVATION_ORIGIN_ERROR,
    };
  }

  // Header must be a pure origin (scheme + host [+ port]), not a full URL/path.
  if (raw !== origin) {
    return {
      ok: false,
      status: 403,
      message: PARTNER_ACTIVATION_ORIGIN_ERROR,
    };
  }

  if (!resolvePartnerActivationAllowedOrigins(env).includes(origin)) {
    return {
      ok: false,
      status: 403,
      message: PARTNER_ACTIVATION_ORIGIN_ERROR,
    };
  }

  return { ok: true, origin };
}
