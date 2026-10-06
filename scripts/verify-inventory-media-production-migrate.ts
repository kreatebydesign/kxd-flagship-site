import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  authorizeInventoryMediaMigrationRunnerBearer,
  evaluateInventoryMediaApplyGuards,
  INVENTORY_MEDIA_KNOWN_PENDING,
  INVENTORY_MEDIA_PRODUCTION_MIGRATION,
  isInventoryMediaMigrationRunnerCallable,
  isInventoryMediaMigrationRunnerEnabled,
  planInventoryMediaMigration,
} from "../lib/internal/inventory-media-production-migrate-policy";
import { parseMigrateAction } from "../lib/internal/partner-portal-production-migrate-policy";

const root = process.cwd();
const read = (rel: string) => readFileSync(path.join(root, rel), "utf8");

const route = read(
  "app/api/internal/kxd-production-inventory-media-migrate/route.ts",
);
const runner = read("lib/internal/inventory-media-production-migrate.ts");
const policy = read("lib/internal/inventory-media-production-migrate-policy.ts");
const partnerRoute = read("app/api/internal/kxd-production-migrate/route.ts");
const partnerPolicy = read(
  "lib/internal/partner-portal-production-migrate-policy.ts",
);
const partnerRunner = read("lib/internal/partner-portal-production-migrate.ts");

assert.match(route, /export const runtime = "nodejs"/);
assert.match(route, /export const dynamic = "force-dynamic"/);
assert.match(route, /export async function POST/);
assert.doesNotMatch(route, /export async function GET/);
assert.doesNotMatch(route, /child_process|execSync|spawn\(/);
assert.match(route, /isInventoryMediaMigrationRunnerCallable/);
assert.match(route, /Cache-Control.*no-store/);

assert.match(runner, /getMigrations/);
assert.match(runner, /pg_try_advisory_xact_lock/);
assert.match(runner, /ApplyInProgressError/);
assert.match(runner, /INVENTORY_MEDIA_PRODUCTION_MIGRATION/);
assert.doesNotMatch(runner, /payload\.db\.migrate\(/);
assert.doesNotMatch(runner, /child_process|execSync|spawn\(/);
assert.doesNotMatch(
  runner,
  /applyNames: lockedPlan\.allowedPending|names: lockedPlan\.allowedPending/,
);
assert.match(policy, /KXD_ENABLE_ONE_TIME_INVENTORY_MEDIA_MIGRATION/);
assert.match(policy, /KXD_CONFIRM_INVENTORY_MEDIA_MIGRATE/);
assert.match(policy, /KXD_PRODUCTION_MIGRATION_RUN_KEY/);
assert.equal(
  INVENTORY_MEDIA_PRODUCTION_MIGRATION,
  "20261003_client_inventory_referenced_media",
);
assert.deepEqual([...INVENTORY_MEDIA_KNOWN_PENDING], [
  "20261003_client_inventory_referenced_media",
  "20261004_partner_portal_phase1",
  "20261005_partner_portal_phase1_1",
]);

assert.doesNotMatch(partnerPolicy, /KXD_ENABLE_ONE_TIME_INVENTORY_MEDIA_MIGRATION/);
assert.doesNotMatch(partnerPolicy, /20261003_client_inventory_referenced_media/);
assert.doesNotMatch(partnerRoute, /inventory-media/);
assert.doesNotMatch(partnerRunner, /INVENTORY_MEDIA/);

assert.equal(isInventoryMediaMigrationRunnerEnabled({}), false);
assert.equal(
  isInventoryMediaMigrationRunnerEnabled({
    KXD_ENABLE_ONE_TIME_INVENTORY_MEDIA_MIGRATION: "1",
  }),
  false,
);
assert.equal(
  isInventoryMediaMigrationRunnerEnabled({
    KXD_ENABLE_ONE_TIME_INVENTORY_MEDIA_MIGRATION: "1",
    KXD_PRODUCTION_MIGRATION_RUN_KEY: "short",
  }),
  false,
);
assert.equal(
  isInventoryMediaMigrationRunnerEnabled({
    KXD_ENABLE_ONE_TIME_MIGRATION_RUNNER: "1",
    KXD_PRODUCTION_MIGRATION_RUN_KEY: "x".repeat(32),
  }),
  false,
);
assert.equal(
  isInventoryMediaMigrationRunnerEnabled({
    KXD_ENABLE_ONE_TIME_INVENTORY_MEDIA_MIGRATION: "1",
    KXD_PRODUCTION_MIGRATION_RUN_KEY: "x".repeat(32),
  }),
  true,
);

const enabledFlags = {
  KXD_ENABLE_ONE_TIME_INVENTORY_MEDIA_MIGRATION: "1",
  KXD_PRODUCTION_MIGRATION_RUN_KEY: "x".repeat(32),
};
assert.equal(isInventoryMediaMigrationRunnerCallable(enabledFlags), false);
assert.equal(
  isInventoryMediaMigrationRunnerCallable({
    ...enabledFlags,
    VERCEL_ENV: "preview",
  }),
  false,
);
assert.equal(
  isInventoryMediaMigrationRunnerCallable({
    ...enabledFlags,
    VERCEL_ENV: "development",
  }),
  false,
);
assert.equal(
  isInventoryMediaMigrationRunnerCallable({
    ...enabledFlags,
    VERCEL_ENV: "production",
  }),
  true,
);

const enabledEnv = {
  KXD_ENABLE_ONE_TIME_INVENTORY_MEDIA_MIGRATION: "1",
  KXD_PRODUCTION_MIGRATION_RUN_KEY: "kxd-prod-migrate-key-32chars-ok!",
};
assert.equal(authorizeInventoryMediaMigrationRunnerBearer(null, enabledEnv), false);
assert.equal(
  authorizeInventoryMediaMigrationRunnerBearer("Bearer wrong", enabledEnv),
  false,
);
assert.equal(
  authorizeInventoryMediaMigrationRunnerBearer(
    `Bearer ${enabledEnv.KXD_PRODUCTION_MIGRATION_RUN_KEY}`,
    enabledEnv,
  ),
  true,
);
assert.equal(
  authorizeInventoryMediaMigrationRunnerBearer(
    `Bearer ${enabledEnv.KXD_PRODUCTION_MIGRATION_RUN_KEY}`,
    {
      KXD_ENABLE_ONE_TIME_MIGRATION_RUNNER: "1",
      KXD_PRODUCTION_MIGRATION_RUN_KEY: enabledEnv.KXD_PRODUCTION_MIGRATION_RUN_KEY,
    },
  ),
  false,
);

assert.equal(parseMigrateAction({ action: "status" }), "status");
assert.equal(parseMigrateAction({ action: "apply" }), "apply");
assert.equal(parseMigrateAction({ action: "status", extra: true }), null);
assert.equal(parseMigrateAction({ name: "20261003_client_inventory_referenced_media" }), null);

const confirmMissing = evaluateInventoryMediaApplyGuards({
  KXD_ENABLE_ONE_TIME_INVENTORY_MEDIA_MIGRATION: "1",
  KXD_PRODUCTION_MIGRATION_RUN_KEY: "x".repeat(32),
  DATABASE_URI: "postgresql://user:pass@ep-twilight-math.neon.tech/neondb",
});
assert.equal(confirmMissing.allowed, false);
assert.equal(confirmMissing.status, 403);

const localApply = evaluateInventoryMediaApplyGuards({
  KXD_CONFIRM_INVENTORY_MEDIA_MIGRATE: "1",
  DATABASE_URI: "postgresql://kxd@127.0.0.1:5432/kxd_audit_report_review",
});
assert.equal(localApply.allowed, false);
assert.equal(localApply.status, 409);

const neonApply = evaluateInventoryMediaApplyGuards({
  KXD_CONFIRM_INVENTORY_MEDIA_MIGRATE: "1",
  DATABASE_URI: "postgresql://user:pass@ep-twilight-math-x.neon.tech/neondb",
});
assert.equal(neonApply.allowed, true);

const productionPending = planInventoryMediaMigration({
  catalogNames: [
    "older",
    "20261003_client_inventory_referenced_media",
    "20261004_partner_portal_phase1",
    "20261005_partner_portal_phase1_1",
  ],
  appliedNames: ["older"],
});
assert.equal(productionPending.canApply, true);
assert.equal(productionPending.targetPending, true);
assert.deepEqual(productionPending.applyNames, [
  "20261003_client_inventory_referenced_media",
]);
assert.ok(
  !productionPending.applyNames.includes("20261004_partner_portal_phase1"),
);
assert.ok(
  !productionPending.applyNames.includes("20261005_partner_portal_phase1_1"),
);

const unexpected = planInventoryMediaMigration({
  catalogNames: [
    "20261003_client_inventory_referenced_media",
    "20269999_unexpected",
  ],
  appliedNames: [],
});
assert.equal(unexpected.canApply, false);
assert.deepEqual(unexpected.unexpectedPending, ["20269999_unexpected"]);

const targetAlreadyApplied = planInventoryMediaMigration({
  catalogNames: [
    "20261003_client_inventory_referenced_media",
    "20261004_partner_portal_phase1",
    "20261005_partner_portal_phase1_1",
  ],
  appliedNames: ["20261003_client_inventory_referenced_media"],
});
assert.equal(targetAlreadyApplied.canApply, false);
assert.equal(targetAlreadyApplied.targetPending, false);
assert.deepEqual(targetAlreadyApplied.applyNames, []);

console.log("verify-inventory-media-production-migrate: ok");
