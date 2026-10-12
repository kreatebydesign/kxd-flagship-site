/**
 * One-time Partner Portal Phase 4 production migrate runner.
 * Applies only 20261008_partner_portal_phase4_network_directory (additive DDL).
 */
import "server-only";

import {
  commitTransaction,
  createLocalReq,
  getMigrations,
  getPayload,
  initTransaction,
  killTransaction,
} from "payload";
import config from "@payload-config";
import { migrations } from "../../migrations/index";
import { sql } from "@payloadcms/db-postgres";
import {
  isAdvisoryLockAcquired,
  isVercelProductionRuntime,
  resolveRuntimeDatabaseMeta,
  type PartnerPortalMigrateAction,
  type PartnerPortalMigrateEnv,
} from "./partner-portal-production-migrate-policy";
import {
  evaluatePartnerPhase4ApplyGuards,
  PARTNER_PHASE4_APPLY_LOCK_KEYS,
  PARTNER_PHASE4_PRODUCTION_MIGRATION,
  planPartnerPhase4Migration,
} from "./partner-phase4-production-migrate-policy";

export {
  authorizePartnerPhase4MigrationRunnerBearer,
  isPartnerPhase4MigrationRunnerCallable,
  PARTNER_PHASE4_PRODUCTION_MIGRATION,
} from "./partner-phase4-production-migrate-policy";
export { parseMigrateAction } from "./partner-portal-production-migrate-policy";

function catalogNames(): string[] {
  return migrations.map((migration) => migration.name);
}

async function listAppliedMigrationNames(): Promise<string[]> {
  const payload = await getPayload({ config });
  const { existingMigrations } = await getMigrations({ payload });
  return existingMigrations
    .map((row) => String(row.name ?? ""))
    .filter((name) => name.length > 0 && name !== "dev");
}

type DrizzleExecutor = {
  execute: (query: unknown) => Promise<unknown>;
};

type DrizzleSessionAdapter = {
  drizzle?: DrizzleExecutor;
  sessions?: Record<string, { db?: DrizzleExecutor }>;
};

class ApplyInProgressError extends Error {
  readonly status = 409;
  constructor() {
    super("Apply is already in progress.");
    this.name = "ApplyInProgressError";
  }
}

async function resolveTransactionDb(
  adapter: DrizzleSessionAdapter,
  req: { transactionID?: string | number | Promise<string | number> },
): Promise<DrizzleExecutor> {
  const transactionId = await req.transactionID;
  const db =
    (transactionId ? adapter.sessions?.[String(transactionId)]?.db : undefined) ??
    adapter.drizzle;
  if (!db?.execute) {
    throw new Error("Database transaction handle is unavailable.");
  }
  return db;
}

async function acquireApplyLock(db: DrizzleExecutor): Promise<void> {
  const [lockClass, lockId] = PARTNER_PHASE4_APPLY_LOCK_KEYS;
  const result = await db.execute(
    sql`select pg_try_advisory_xact_lock(${lockClass}, ${lockId}) as locked`,
  );
  if (!isAdvisoryLockAcquired(result)) {
    throw new ApplyInProgressError();
  }
}

async function applyTargetMigrationInTransaction(input: {
  payload: Awaited<ReturnType<typeof getPayload>>;
  req: Awaited<ReturnType<typeof createLocalReq>>;
  db: DrizzleExecutor;
}): Promise<string> {
  const migration = migrations.find(
    (entry) => entry.name === PARTNER_PHASE4_PRODUCTION_MIGRATION,
  );
  if (!migration) {
    throw new Error("Authorized migration is missing from the catalog.");
  }
  const { latestBatch } = await getMigrations({ payload: input.payload });
  await migration.up({
    db: input.db,
    payload: input.payload,
    req: input.req,
  } as Parameters<typeof migration.up>[0]);
  await input.payload.create({
    collection: "payload-migrations",
    data: { name: migration.name, batch: latestBatch + 1 },
    req: input.req,
  });
  return migration.name;
}

export async function runPartnerPhase4ProductionMigrate(input: {
  action: PartnerPortalMigrateAction;
  confirmApply: boolean;
  env?: PartnerPortalMigrateEnv;
}): Promise<{
  ok: boolean;
  status: number;
  body: Record<string, unknown>;
}> {
  const env = input.env ?? process.env;
  if (!isVercelProductionRuntime(env)) {
    return {
      ok: false,
      status: 404,
      body: { ok: false, error: "Not found." },
    };
  }
  const dbMeta = resolveRuntimeDatabaseMeta(env);

  if (input.action === "apply") {
    if (!input.confirmApply) {
      return {
        ok: false,
        status: 403,
        body: { ok: false, error: "Apply confirmation is required." },
      };
    }
    const applyGuard = evaluatePartnerPhase4ApplyGuards(env);
    if (!applyGuard.allowed) {
      return {
        ok: false,
        status: applyGuard.status,
        body: { ok: false, error: applyGuard.error },
      };
    }
  }

  const appliedNames = await listAppliedMigrationNames();
  const plan = planPartnerPhase4Migration({
    catalogNames: catalogNames(),
    appliedNames,
  });

  const statusBody = {
    ok: true,
    action: input.action,
    hostPrefix: dbMeta.hostPrefix,
    applied: appliedNames.includes(PARTNER_PHASE4_PRODUCTION_MIGRATION)
      ? [PARTNER_PHASE4_PRODUCTION_MIGRATION]
      : [],
    pending: plan.pending,
    targetPending: plan.targetPending,
  };

  if (input.action === "status") {
    return { ok: true, status: 200, body: statusBody };
  }

  if (!plan.canApply || !plan.targetPending) {
    return {
      ok: false,
      status: 409,
      body: {
        ok: false,
        error: "Target migration is not pending.",
        pending: plan.pending,
        targetPending: plan.targetPending,
      },
    };
  }

  const payload = await getPayload({ config });
  process.env.PAYLOAD_MIGRATING = "true";
  const req = await createLocalReq({}, payload);
  const adapter = payload.db as DrizzleSessionAdapter;

  try {
    await initTransaction(req);
    const db = await resolveTransactionDb(adapter, req);
    await acquireApplyLock(db);

    const appliedInsideLock = await listAppliedMigrationNames();
    const lockedPlan = planPartnerPhase4Migration({
      catalogNames: catalogNames(),
      appliedNames: appliedInsideLock,
    });
    if (!lockedPlan.canApply || !lockedPlan.targetPending) {
      await killTransaction(req);
      return {
        ok: false,
        status: 409,
        body: {
          ok: false,
          error: "Target migration is not pending.",
          pending: lockedPlan.pending,
          targetPending: lockedPlan.targetPending,
        },
      };
    }

    const appliedNow = await applyTargetMigrationInTransaction({
      payload,
      req,
      db,
    });
    await commitTransaction(req);
    return {
      ok: true,
      status: 200,
      body: {
        ...statusBody,
        applied: [appliedNow],
        appliedNow: [appliedNow],
        pending: lockedPlan.pending.filter((name) => name !== appliedNow),
        targetPending: false,
      },
    };
  } catch (error) {
    await killTransaction(req);
    if (error instanceof ApplyInProgressError) {
      return {
        ok: false,
        status: error.status,
        body: { ok: false, error: error.message },
      };
    }
    throw error;
  }
}
