/**
 * Phase 31C — Shared cron-secret authorization helpers.
 * Edge-safe (no Node crypto / no server-only). Fail closed when CRON_SECRET absent/blank.
 */

/** Non-empty trimmed cron secret, or null (fail closed). */
export function resolveConfiguredCronSecret(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): string | null {
  const raw = env.CRON_SECRET;
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** Constant-time-ish string equality (Edge + Node safe). */
function safeEqualString(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i += 1) {
    out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return out === 0;
}

/**
 * True only when CRON_SECRET is configured AND Authorization exactly matches
 * `Bearer <CRON_SECRET>`. Absent, blank, malformed, or incorrect → false.
 */
export function isAuthorizedCronBearer(
  authorizationHeader: string | null | undefined,
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): boolean {
  const secret = resolveConfiguredCronSecret(env);
  if (!secret) return false;
  if (typeof authorizationHeader !== "string") return false;
  const header = authorizationHeader.trim();
  const expected = `Bearer ${secret}`;
  return safeEqualString(header, expected);
}

/** Admin ingest path that may intentionally accept a cron bearer. */
export const REPORTING_ADMIN_INGEST_PATH = "/api/admin/reporting/ingest";

export function isReportingAdminIngestPath(pathname: string): boolean {
  return pathname === REPORTING_ADMIN_INGEST_PATH;
}
