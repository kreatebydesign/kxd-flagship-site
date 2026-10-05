import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  authorizeMigrationRunnerBearer,
  evaluateApplyGuards,
  isMigrationRunnerCallable,
  isOneTimeMigrationRunnerEnabled,
  isVercelProductionRuntime,
  isAdvisoryLockAcquired,
  parseMigrateAction,
  PARTNER_PORTAL_PRODUCTION_MIGRATIONS,
  planPartnerPortalMigrations,
} from "../lib/internal/partner-portal-production-migrate-policy";

const root = process.cwd();
const read = (rel: string) => readFileSync(path.join(root, rel), "utf8");

const route = read("app/api/internal/kxd-production-migrate/route.ts");
const runner = read("lib/internal/partner-portal-production-migrate.ts");
const policy = read("lib/internal/partner-portal-production-migrate-policy.ts");

assert.match(route, /export const runtime = "nodejs"/);
assert.match(route, /export const dynamic = "force-dynamic"/);
assert.match(route, /export async function POST/);
assert.doesNotMatch(route, /export async function GET/);
assert.doesNotMatch(route, /export async function PUT/);
assert.doesNotMatch(route, /child_process|execSync|spawn\(/);
assert.match(route, /isMigrationRunnerCallable/);
assert.match(route, /Cache-Control.*no-store/);

assert.match(runner, /getMigrations/);
assert.match(runner, /migration\.up\(/);
assert.match(runner, /pg_try_advisory_xact_lock/);
assert.match(runner, /ApplyInProgressError/);
assert.doesNotMatch(runner, /payload\.db\.migrate\(/);
assert.doesNotMatch(runner, /child_process|execSync|spawn\(/);
assert.match(policy, /KXD_ENABLE_ONE_TIME_MIGRATION_RUNNER/);
assert.match(policy, /KXD_PRODUCTION_MIGRATION_RUN_KEY/);
assert.match(policy, /KXD_CONFIRM_PRODUCTION_MIGRATE/);
assert.match(policy, /VERCEL_ENV/);
assert.match(policy, /isVercelProductionRuntime/);
assert.deepEqual([...PARTNER_PORTAL_PRODUCTION_MIGRATIONS], [
  "20261004_partner_portal_phase1",
  "20261005_partner_portal_phase1_1",
]);

assert.equal(isOneTimeMigrationRunnerEnabled({}), false);
assert.equal(
  isOneTimeMigrationRunnerEnabled({
    KXD_ENABLE_ONE_TIME_MIGRATION_RUNNER: "1",
  }),
  false,
);
assert.equal(
  isOneTimeMigrationRunnerEnabled({
    KXD_ENABLE_ONE_TIME_MIGRATION_RUNNER: "1",
    KXD_PRODUCTION_MIGRATION_RUN_KEY: "short",
  }),
  false,
);
assert.equal(
  isOneTimeMigrationRunnerEnabled({
    KXD_ENABLE_ONE_TIME_MIGRATION_RUNNER: "0",
    KXD_PRODUCTION_MIGRATION_RUN_KEY: "x".repeat(32),
  }),
  false,
);
assert.equal(
  isOneTimeMigrationRunnerEnabled({
    KXD_ENABLE_ONE_TIME_MIGRATION_RUNNER: "1",
    KXD_PRODUCTION_MIGRATION_RUN_KEY: "x".repeat(32),
  }),
  true,
);

const enabledFlags = {
  KXD_ENABLE_ONE_TIME_MIGRATION_RUNNER: "1",
  KXD_PRODUCTION_MIGRATION_RUN_KEY: "x".repeat(32),
};
assert.equal(isVercelProductionRuntime({}), false);
assert.equal(isVercelProductionRuntime({ VERCEL_ENV: "preview" }), false);
assert.equal(isVercelProductionRuntime({ VERCEL_ENV: "development" }), false);
assert.equal(isVercelProductionRuntime({ VERCEL_ENV: "production" }), true);
assert.equal(isMigrationRunnerCallable(enabledFlags), false);
assert.equal(
  isMigrationRunnerCallable({ ...enabledFlags, VERCEL_ENV: "preview" }),
  false,
);
assert.equal(
  isMigrationRunnerCallable({ ...enabledFlags, VERCEL_ENV: "production" }),
  true,
);
assert.equal(
  isMigrationRunnerCallable({ VERCEL_ENV: "production" }),
  false,
);

assert.equal(isAdvisoryLockAcquired([{ locked: true }]), true);
assert.equal(isAdvisoryLockAcquired({ rows: [{ locked: false }] }), false);
assert.equal(isAdvisoryLockAcquired({ rows: [{ locked: "t" }] }), true);
assert.equal(isAdvisoryLockAcquired(null), false);

const enabledEnv = {
  KXD_ENABLE_ONE_TIME_MIGRATION_RUNNER: "1",
  KXD_PRODUCTION_MIGRATION_RUN_KEY: "kxd-prod-migrate-key-32chars-ok!",
};
assert.equal(authorizeMigrationRunnerBearer(null, enabledEnv), false);
assert.equal(authorizeMigrationRunnerBearer("Bearer wrong", enabledEnv), false);
assert.equal(
  authorizeMigrationRunnerBearer(
    `Bearer ${enabledEnv.KXD_PRODUCTION_MIGRATION_RUN_KEY}`,
    enabledEnv,
  ),
  true,
);
assert.equal(
  authorizeMigrationRunnerBearer(
    `Bearer ${enabledEnv.KXD_PRODUCTION_MIGRATION_RUN_KEY}`,
    {},
  ),
  false,
);

assert.equal(parseMigrateAction({ action: "status" }), "status");
assert.equal(parseMigrateAction({ action: "apply" }), "apply");
assert.equal(parseMigrateAction({ action: "status", extra: true }), null);
assert.equal(parseMigrateAction({ action: "drop" }), null);
assert.equal(parseMigrateAction({ sql: "select 1" }), null);

const confirmMissing = evaluateApplyGuards({
  KXD_ENABLE_ONE_TIME_MIGRATION_RUNNER: "1",
  KXD_PRODUCTION_MIGRATION_RUN_KEY: "x".repeat(32),
  DATABASE_URI: "postgresql://user:pass@ep-twilight-math.neon.tech/neondb",
});
assert.equal(confirmMissing.allowed, false);
assert.equal(confirmMissing.status, 403);

const localApply = evaluateApplyGuards({
  KXD_CONFIRM_PRODUCTION_MIGRATE: "1",
  DATABASE_URI: "postgresql://kxd@127.0.0.1:5432/kxd_audit_report_review",
});
assert.equal(localApply.allowed, false);
assert.equal(localApply.status, 409);

const neonApply = evaluateApplyGuards({
  KXD_CONFIRM_PRODUCTION_MIGRATE: "1",
  DATABASE_URI: "postgresql://user:pass@ep-twilight-math-x.neon.tech/neondb",
});
assert.equal(neonApply.allowed, true);

const unexpected = planPartnerPortalMigrations({
  catalogNames: [
    "20261004_partner_portal_phase1",
    "20261005_partner_portal_phase1_1",
    "20269999_unexpected",
  ],
  appliedNames: [],
});
assert.equal(unexpected.canApply, false);
assert.deepEqual(unexpected.unexpectedPending, ["20269999_unexpected"]);

const allowedOnly = planPartnerPortalMigrations({
  catalogNames: [
    "older",
    "20261004_partner_portal_phase1",
    "20261005_partner_portal_phase1_1",
  ],
  appliedNames: ["older"],
});
assert.equal(allowedOnly.canApply, true);
assert.deepEqual(allowedOnly.allowedPending, [
  "20261004_partner_portal_phase1",
  "20261005_partner_portal_phase1_1",
]);

console.log("verify-partner-portal-production-migrate: ok");
