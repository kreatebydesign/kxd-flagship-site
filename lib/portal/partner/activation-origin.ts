/**
 * Strict Origin allowlist for KXD Network partner activation APIs only.
 * Does not alter Client HQ / CES / WebAuthn portal origin guards.
 *
 * Production browsers normally send Origin on JSON POST. Some email in-app
 * WebViews omit it; allow a narrow same-site Host fallback for the Network
 * host only (never arbitrary Referer reflection).
 */

import { NETWORK_HOST } from "@/lib/portal/constants";

export const PARTNER_ACTIVATION_ORIGIN_ERROR = "Invalid request origin.";

export const PARTNER_ACTIVATION_PRODUCTION_ORIGIN = `https://${NETWORK_HOST}`;

function isProductionRuntime(env: NodeJS.ProcessEnv = process.env): boolean {
  // Prefer Vercel production. Local `next start` also sets NODE_ENV=production
  // and must still accept loopback Origin for invite QA smoke.
  if (env.VERCEL_ENV === "production") return true;
  if (env.KXD_PARTNER_ACTIVATION_STRICT_ORIGIN === "1") return true;
  return false;
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
    "http://localhost:3015",
    "http://127.0.0.1:3015",
    PARTNER_ACTIVATION_PRODUCTION_ORIGIN,
  ];
}

function reject(): {
  ok: false;
  status: 403;
  message: string;
} {
  return {
    ok: false,
    status: 403,
    message: PARTNER_ACTIVATION_ORIGIN_ERROR,
  };
}

function requestHost(req: Request): string | null {
  const forwarded = req.headers.get("x-forwarded-host");
  const raw = (forwarded?.split(",")[0] || req.headers.get("host") || "")
    .trim()
    .toLowerCase();
  if (!raw) return null;
  return raw.split(":")[0] || null;
}

function originForHost(
  host: string,
  allowed: readonly string[],
): string | null {
  for (const candidate of allowed) {
    try {
      if (new URL(candidate).hostname === host) return candidate;
    } catch {
      /* continue */
    }
  }
  return null;
}

function refererAllowsMissingOrigin(
  req: Request,
  allowed: readonly string[],
): boolean {
  const referer = req.headers.get("referer");
  if (!referer) return false;
  try {
    const url = new URL(referer);
    if (!allowed.includes(url.origin)) return false;
    return (
      url.pathname === "/portal/partner/activate" ||
      url.pathname.startsWith("/portal/partner/activate/")
    );
  } catch {
    return false;
  }
}

function sameSiteFetchEvidence(req: Request): boolean {
  const site = (req.headers.get("sec-fetch-site") || "").toLowerCase();
  return site === "same-origin" || site === "same-site";
}

/**
 * Fail closed unless the request is from an allowlisted Network origin.
 * Prefer an exact Origin match. When Origin is absent, allow only when the
 * request Host maps to an allowlisted origin AND same-site evidence exists
 * (Sec-Fetch-Site same-origin/same-site, or Referer on /portal/partner/activate).
 */
export function assertPartnerActivationOrigin(
  req: Request,
  env: NodeJS.ProcessEnv = process.env,
): { ok: true; origin: string } | { ok: false; status: 403; message: string } {
  const allowed = resolvePartnerActivationAllowedOrigins(env);
  const raw = req.headers.get("origin");

  if (raw) {
    let origin: string;
    try {
      origin = new URL(raw).origin;
    } catch {
      return reject();
    }

    // Header must be a pure origin (scheme + host [+ port]), not a full URL/path.
    if (raw !== origin) return reject();
    if (!allowed.includes(origin)) return reject();
    return { ok: true, origin };
  }

  const host = requestHost(req);
  if (!host) return reject();

  const inferred = originForHost(host, allowed);
  if (!inferred) return reject();

  if (sameSiteFetchEvidence(req) || refererAllowsMissingOrigin(req, allowed)) {
    return { ok: true, origin: inferred };
  }

  return reject();
}
