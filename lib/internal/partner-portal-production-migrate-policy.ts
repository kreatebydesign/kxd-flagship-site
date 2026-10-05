/**
 * Policy for the one-time Partner Portal production migrate runner.
 * Pure guards — no Payload, no DB, no secrets in return values.
 */
import { createHash, timingSafeEqual } from "node:crypto";

export const PARTNER_PORTAL_PRODUCTION_MIGRATIONS = [
  "20261004_partner_portal_phase1",
  "20261005_partner_portal_phase1_1",
] as const;

export type PartnerPortalMigrateAction = "status" | "apply";

export type PartnerPortalMigrateEnv = Record<string, string | undefined>;

export const MIGRATION_RUNNER_ENABLE_FLAG = "KXD_ENABLE_ONE_TIME_MIGRATION_RUNNER";
export const MIGRATION_RUNNER_KEY_FLAG = "KXD_PRODUCTION_MIGRATION_RUN_KEY";
export const MIGRATION_RUNNER_CONFIRM_FLAG = "KXD_CONFIRM_PRODUCTION_MIGRATE";
export const MIGRATION_RUNNER_MIN_KEY_LENGTH = 32;
/** Session-independent Postgres xact advisory lock pair (class, id). */
export const MIGRATION_RUNNER_APPLY_LOCK_KEYS = [824011005, 20261005] as const;

export function isAdvisoryLockAcquired(result: unknown): boolean {
  const rows = Array.isArray(result)
    ? result
    : result && typeof result === "object" && "rows" in result
      ? (result as { rows: unknown[] }).rows
      : [];
  const row = rows[0];
  if (!row || typeof row !== "object") return false;
  const locked = (row as { locked?: unknown }).locked;
  return locked === true || locked === "t" || locked === "true";
}

export function isVercelProductionRuntime(
  env: PartnerPortalMigrateEnv = process.env,
): boolean {
  return env.VERCEL_ENV?.trim() === "production";
}

export function isOneTimeMigrationRunnerEnabled(
  env: PartnerPortalMigrateEnv = process.env,
): boolean {
  if (env[MIGRATION_RUNNER_ENABLE_FLAG]?.trim() !== "1") return false;
  const key = env[MIGRATION_RUNNER_KEY_FLAG]?.trim() ?? "";
  return key.length >= MIGRATION_RUNNER_MIN_KEY_LENGTH;
}

/** Route exposure: flags + Vercel Production only. Preview/dev always 404. */
export function isMigrationRunnerCallable(
  env: PartnerPortalMigrateEnv = process.env,
): boolean {
  return isVercelProductionRuntime(env) && isOneTimeMigrationRunnerEnabled(env);
}

export function isProductionMigrateConfirmSet(
  env: PartnerPortalMigrateEnv = process.env,
): boolean {
  return env[MIGRATION_RUNNER_CONFIRM_FLAG]?.trim() === "1";
}

function sha256(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

export function authorizeMigrationRunnerBearer(
  authorizationHeader: string | null | undefined,
  env: PartnerPortalMigrateEnv = process.env,
): boolean {
  if (!isOneTimeMigrationRunnerEnabled(env)) return false;
  const secret = env[MIGRATION_RUNNER_KEY_FLAG]?.trim() ?? "";
  if (secret.length < MIGRATION_RUNNER_MIN_KEY_LENGTH) return false;
  if (typeof authorizationHeader !== "string") return false;
  const header = authorizationHeader.trim();
  const expected = `Bearer ${secret}`;
  return timingSafeEqual(sha256(header), sha256(expected));
}

export function parseMigrateAction(
  body: unknown,
): PartnerPortalMigrateAction | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const keys = Object.keys(body as Record<string, unknown>);
  if (keys.length !== 1 || keys[0] !== "action") return null;
  const action = (body as { action?: unknown }).action;
  if (action === "status" || action === "apply") return action;
  return null;
}

export function hostPrefixAndDatabaseName(connectionString: string): {
  hostPrefix: string;
  databaseName: string;
  isLocal: boolean;
  isNeon: boolean;
} {
  try {
    const url = new URL(connectionString);
    const host = url.hostname.toLowerCase();
    const isLocal =
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "::1" ||
      host.endsWith(".local");
    const isNeon = host.endsWith(".neon.tech");
    const hostPrefix = host.split(".")[0] || "(unknown)";
    const databaseName =
      url.pathname.replace(/^\//, "").split("?")[0] || "(default)";
    return { hostPrefix, databaseName, isLocal, isNeon };
  } catch {
    return {
      hostPrefix: "(unparseable)",
      databaseName: "(unknown)",
      isLocal: false,
      isNeon: false,
    };
  }
}

export function resolveRuntimeDatabaseMeta(
  env: PartnerPortalMigrateEnv = process.env,
): ReturnType<typeof hostPrefixAndDatabaseName> {
  const uri = env.DATABASE_URI?.trim() || env.DATABASE_URL?.trim() || "";
  if (!uri) {
    return {
      hostPrefix: "(none)",
      databaseName: "(none)",
      isLocal: true,
      isNeon: false,
    };
  }
  return hostPrefixAndDatabaseName(uri);
}

export function evaluateApplyGuards(env: PartnerPortalMigrateEnv = process.env): {
  allowed: boolean;
  status: number;
  error?: string;
} {
  if (!isProductionMigrateConfirmSet(env)) {
    return {
      allowed: false,
      status: 403,
      error: "Apply confirmation is required.",
    };
  }
  const dbMeta = resolveRuntimeDatabaseMeta(env);
  if (dbMeta.isLocal || !dbMeta.isNeon) {
    return {
      allowed: false,
      status: 409,
      error: "Apply is refused for this database target.",
    };
  }
  return { allowed: true, status: 200 };
}

export function planPartnerPortalMigrations(input: {
  catalogNames: string[];
  appliedNames: string[];
}): {
  pending: string[];
  unexpectedPending: string[];
  allowedPending: string[];
  canApply: boolean;
} {
  const applied = new Set(input.appliedNames);
  const pending = input.catalogNames.filter((name) => !applied.has(name));
  const allowed = new Set<string>(PARTNER_PORTAL_PRODUCTION_MIGRATIONS);
  const unexpectedPending = pending.filter((name) => !allowed.has(name));
  const allowedPending = PARTNER_PORTAL_PRODUCTION_MIGRATIONS.filter((name) =>
    pending.includes(name),
  );
  return {
    pending,
    unexpectedPending,
    allowedPending: [...allowedPending],
    canApply: unexpectedPending.length === 0,
  };
}
