/**
 * Policy for one-time Partner Portal Phase 4 (network directory) production migrate.
 * Applies only 20261008_partner_portal_phase4_network_directory.
 * Does not mutate partner identity, invitations, or commissions — additive DDL only.
 */
import { createHash, timingSafeEqual } from "node:crypto";
import {
  isVercelProductionRuntime,
  MIGRATION_RUNNER_KEY_FLAG,
  MIGRATION_RUNNER_MIN_KEY_LENGTH,
  resolveRuntimeDatabaseMeta,
  type PartnerPortalMigrateAction,
  type PartnerPortalMigrateEnv,
} from "./partner-portal-production-migrate-policy";

export const PARTNER_PHASE4_PRODUCTION_MIGRATION =
  "20261008_partner_portal_phase4_network_directory" as const;

export const PARTNER_PHASE4_ENABLE_FLAG =
  "KXD_ENABLE_ONE_TIME_PARTNER_PHASE4_MIGRATION";
export const PARTNER_PHASE4_CONFIRM_FLAG = "KXD_CONFIRM_PARTNER_PHASE4_MIGRATE";
/** Session-independent Postgres xact advisory lock pair (class, id). */
export const PARTNER_PHASE4_APPLY_LOCK_KEYS = [824011008, 20261008] as const;

export type PartnerPhase4MigrateAction = PartnerPortalMigrateAction;
export type PartnerPhase4MigrateEnv = PartnerPortalMigrateEnv;

export function isPartnerPhase4MigrationRunnerEnabled(
  env: PartnerPhase4MigrateEnv = process.env,
): boolean {
  if (env[PARTNER_PHASE4_ENABLE_FLAG]?.trim() !== "1") return false;
  const key = env[MIGRATION_RUNNER_KEY_FLAG]?.trim() ?? "";
  return key.length >= MIGRATION_RUNNER_MIN_KEY_LENGTH;
}

export function isPartnerPhase4MigrationRunnerCallable(
  env: PartnerPhase4MigrateEnv = process.env,
): boolean {
  return (
    isVercelProductionRuntime(env) && isPartnerPhase4MigrationRunnerEnabled(env)
  );
}

export function isPartnerPhase4MigrateConfirmSet(
  env: PartnerPhase4MigrateEnv = process.env,
): boolean {
  return env[PARTNER_PHASE4_CONFIRM_FLAG]?.trim() === "1";
}

function sha256(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

export function authorizePartnerPhase4MigrationRunnerBearer(
  authorizationHeader: string | null | undefined,
  env: PartnerPhase4MigrateEnv = process.env,
): boolean {
  if (!isPartnerPhase4MigrationRunnerEnabled(env)) return false;
  const secret = env[MIGRATION_RUNNER_KEY_FLAG]?.trim() ?? "";
  if (secret.length < MIGRATION_RUNNER_MIN_KEY_LENGTH) return false;
  if (typeof authorizationHeader !== "string") return false;
  const header = authorizationHeader.trim();
  const expected = `Bearer ${secret}`;
  return timingSafeEqual(sha256(header), sha256(expected));
}

export function evaluatePartnerPhase4ApplyGuards(
  env: PartnerPhase4MigrateEnv = process.env,
): {
  allowed: boolean;
  status: number;
  error?: string;
} {
  if (!isPartnerPhase4MigrateConfirmSet(env)) {
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

/**
 * Phase 4 may apply even when unrelated migrations are pending.
 * Only the target migration is considered.
 */
export function planPartnerPhase4Migration(input: {
  catalogNames: string[];
  appliedNames: string[];
}): {
  pending: string[];
  targetPending: boolean;
  applyNames: string[];
  canApply: boolean;
} {
  const applied = new Set(input.appliedNames);
  const pending = input.catalogNames.filter((name) => !applied.has(name));
  const targetPending = pending.includes(PARTNER_PHASE4_PRODUCTION_MIGRATION);
  return {
    pending,
    targetPending,
    applyNames: targetPending ? [PARTNER_PHASE4_PRODUCTION_MIGRATION] : [],
    canApply: targetPending,
  };
}
