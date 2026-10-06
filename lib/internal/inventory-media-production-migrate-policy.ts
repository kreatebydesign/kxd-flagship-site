/**
 * Policy for the one-time Primal inventory referenced-media production migrate runner.
 * Independent of the Partner Portal runner allowlist and enable flags.
 */
import { createHash, timingSafeEqual } from "node:crypto";
import {
  isVercelProductionRuntime,
  MIGRATION_RUNNER_KEY_FLAG,
  MIGRATION_RUNNER_MIN_KEY_LENGTH,
  PARTNER_PORTAL_PRODUCTION_MIGRATIONS,
  resolveRuntimeDatabaseMeta,
  type PartnerPortalMigrateAction,
  type PartnerPortalMigrateEnv,
} from "./partner-portal-production-migrate-policy";

export const INVENTORY_MEDIA_PRODUCTION_MIGRATION =
  "20261003_client_inventory_referenced_media" as const;

export const INVENTORY_MEDIA_KNOWN_PENDING = [
  INVENTORY_MEDIA_PRODUCTION_MIGRATION,
  ...PARTNER_PORTAL_PRODUCTION_MIGRATIONS,
] as const;

export const INVENTORY_MEDIA_ENABLE_FLAG =
  "KXD_ENABLE_ONE_TIME_INVENTORY_MEDIA_MIGRATION";
export const INVENTORY_MEDIA_CONFIRM_FLAG = "KXD_CONFIRM_INVENTORY_MEDIA_MIGRATE";
/** Bearer secret env: KXD_PRODUCTION_MIGRATION_RUN_KEY (shared, 32+ chars). */
export const INVENTORY_MEDIA_APPLY_LOCK_KEYS = [824011003, 20261003] as const;

export type InventoryMediaMigrateAction = PartnerPortalMigrateAction;
export type InventoryMediaMigrateEnv = PartnerPortalMigrateEnv;

export function isInventoryMediaMigrationRunnerEnabled(
  env: InventoryMediaMigrateEnv = process.env,
): boolean {
  if (env[INVENTORY_MEDIA_ENABLE_FLAG]?.trim() !== "1") return false;
  const key = env[MIGRATION_RUNNER_KEY_FLAG]?.trim() ?? "";
  return key.length >= MIGRATION_RUNNER_MIN_KEY_LENGTH;
}

export function isInventoryMediaMigrationRunnerCallable(
  env: InventoryMediaMigrateEnv = process.env,
): boolean {
  return (
    isVercelProductionRuntime(env) && isInventoryMediaMigrationRunnerEnabled(env)
  );
}

export function isInventoryMediaMigrateConfirmSet(
  env: InventoryMediaMigrateEnv = process.env,
): boolean {
  return env[INVENTORY_MEDIA_CONFIRM_FLAG]?.trim() === "1";
}

function sha256(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

export function authorizeInventoryMediaMigrationRunnerBearer(
  authorizationHeader: string | null | undefined,
  env: InventoryMediaMigrateEnv = process.env,
): boolean {
  if (!isInventoryMediaMigrationRunnerEnabled(env)) return false;
  const secret = env[MIGRATION_RUNNER_KEY_FLAG]?.trim() ?? "";
  if (secret.length < MIGRATION_RUNNER_MIN_KEY_LENGTH) return false;
  if (typeof authorizationHeader !== "string") return false;
  const header = authorizationHeader.trim();
  const expected = `Bearer ${secret}`;
  return timingSafeEqual(sha256(header), sha256(expected));
}

export function evaluateInventoryMediaApplyGuards(
  env: InventoryMediaMigrateEnv = process.env,
): {
  allowed: boolean;
  status: number;
  error?: string;
} {
  if (!isInventoryMediaMigrateConfirmSet(env)) {
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

export function planInventoryMediaMigration(input: {
  catalogNames: string[];
  appliedNames: string[];
}): {
  pending: string[];
  unexpectedPending: string[];
  targetPending: boolean;
  applyNames: string[];
  canApply: boolean;
} {
  const applied = new Set(input.appliedNames);
  const pending = input.catalogNames.filter((name) => !applied.has(name));
  const known = new Set<string>(INVENTORY_MEDIA_KNOWN_PENDING);
  const unexpectedPending = pending.filter((name) => !known.has(name));
  const targetPending = pending.includes(INVENTORY_MEDIA_PRODUCTION_MIGRATION);
  return {
    pending,
    unexpectedPending,
    targetPending,
    applyNames: targetPending ? [INVENTORY_MEDIA_PRODUCTION_MIGRATION] : [],
    canApply: unexpectedPending.length === 0 && targetPending,
  };
}
