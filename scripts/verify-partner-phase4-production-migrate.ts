/**
 * Focused coverage for Partner Phase 4 production migrate runner.
 *
 * Run:
 *   npm run verify:partner-phase4-production-migrate
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  authorizePartnerPhase4MigrationRunnerBearer,
  evaluatePartnerPhase4ApplyGuards,
  isPartnerPhase4MigrationRunnerCallable,
  isPartnerPhase4MigrationRunnerEnabled,
  PARTNER_PHASE4_PRODUCTION_MIGRATION,
  planPartnerPhase4Migration,
} from "../lib/internal/partner-phase4-production-migrate-policy";
import { parseMigrateAction } from "../lib/internal/partner-portal-production-migrate-policy";

const root = process.cwd();
const read = (rel: string) => readFileSync(path.join(root, rel), "utf8");

const route = read(
  "app/api/internal/kxd-production-partner-phase4-migrate/route.ts",
);
const runner = read("lib/internal/partner-phase4-production-migrate.ts");
const policy = read("lib/internal/partner-phase4-production-migrate-policy.ts");
const page = read("app/admin/sales/partners/page.tsx");
const migration = read(
  "migrations/20261008_partner_portal_phase4_network_directory.ts",
);

assert.match(route, /export const runtime = "nodejs"/);
assert.match(route, /export const dynamic = "force-dynamic"/);
assert.match(route, /export async function POST/);
assert.doesNotMatch(route, /export async function GET/);
assert.doesNotMatch(route, /child_process|execSync|spawn\(/);
assert.match(route, /isPartnerPhase4MigrationRunnerCallable/);
assert.match(route, /Cache-Control.*no-store/);

assert.match(runner, /getMigrations/);
assert.match(runner, /pg_try_advisory_xact_lock/);
assert.match(runner, /ApplyInProgressError/);
assert.match(runner, /PARTNER_PHASE4_PRODUCTION_MIGRATION/);
assert.doesNotMatch(runner, /payload\.db\.migrate\(/);
assert.doesNotMatch(runner, /child_process|execSync|spawn\(/);

assert.match(policy, /KXD_ENABLE_ONE_TIME_PARTNER_PHASE4_MIGRATION/);
assert.match(policy, /KXD_CONFIRM_PARTNER_PHASE4_MIGRATE/);
assert.match(policy, /MIGRATION_RUNNER_KEY_FLAG/);
assert.equal(
  PARTNER_PHASE4_PRODUCTION_MIGRATION,
  "20261008_partner_portal_phase4_network_directory",
);

assert.match(page, /loadNetworkCommandWorkspace/);
assert.match(page, /NetworkCommandDesk/);
assert.match(migration, /directory_visibility/);
assert.match(migration, /ADD COLUMN IF NOT EXISTS/);

assert.equal(isPartnerPhase4MigrationRunnerEnabled({}), false);
assert.equal(
  isPartnerPhase4MigrationRunnerEnabled({
    KXD_ENABLE_ONE_TIME_PARTNER_PHASE4_MIGRATION: "1",
  }),
  false,
);
assert.equal(
  isPartnerPhase4MigrationRunnerEnabled({
    KXD_ENABLE_ONE_TIME_PARTNER_PHASE4_MIGRATION: "1",
    KXD_PRODUCTION_MIGRATION_RUN_KEY: "x".repeat(32),
  }),
  true,
);
assert.equal(
  isPartnerPhase4MigrationRunnerCallable({
    KXD_ENABLE_ONE_TIME_PARTNER_PHASE4_MIGRATION: "1",
    KXD_PRODUCTION_MIGRATION_RUN_KEY: "x".repeat(32),
    VERCEL_ENV: "production",
  }),
  true,
);
assert.equal(
  isPartnerPhase4MigrationRunnerCallable({
    KXD_ENABLE_ONE_TIME_PARTNER_PHASE4_MIGRATION: "1",
    KXD_PRODUCTION_MIGRATION_RUN_KEY: "x".repeat(32),
    VERCEL_ENV: "preview",
  }),
  false,
);

const key = "kxd-partner-phase4-migrate-key-32chars!!";
assert.equal(
  authorizePartnerPhase4MigrationRunnerBearer(`Bearer ${key}`, {
    KXD_ENABLE_ONE_TIME_PARTNER_PHASE4_MIGRATION: "1",
    KXD_PRODUCTION_MIGRATION_RUN_KEY: key,
  }),
  true,
);
assert.equal(
  authorizePartnerPhase4MigrationRunnerBearer("Bearer wrong", {
    KXD_ENABLE_ONE_TIME_PARTNER_PHASE4_MIGRATION: "1",
    KXD_PRODUCTION_MIGRATION_RUN_KEY: key,
  }),
  false,
);

assert.equal(
  evaluatePartnerPhase4ApplyGuards({
    KXD_CONFIRM_PARTNER_PHASE4_MIGRATE: "1",
    DATABASE_URI: "postgresql://u:p@ep-demo.us-west-2.aws.neon.tech/neondb",
  }).allowed,
  true,
);
assert.equal(
  evaluatePartnerPhase4ApplyGuards({
    KXD_CONFIRM_PARTNER_PHASE4_MIGRATE: "1",
    DATABASE_URI: "postgresql://u:p@127.0.0.1:5432/local",
  }).allowed,
  false,
);

const pendingPlan = planPartnerPhase4Migration({
  catalogNames: [
    "20261004_partner_portal_phase1",
    PARTNER_PHASE4_PRODUCTION_MIGRATION,
    "unrelated_pending",
  ],
  appliedNames: ["20261004_partner_portal_phase1"],
});
assert.equal(pendingPlan.targetPending, true);
assert.equal(pendingPlan.canApply, true);
assert.deepEqual(pendingPlan.applyNames, [PARTNER_PHASE4_PRODUCTION_MIGRATION]);
// Unrelated pending must not block Phase 4 apply.
assert.ok(pendingPlan.pending.includes("unrelated_pending"));

const donePlan = planPartnerPhase4Migration({
  catalogNames: [PARTNER_PHASE4_PRODUCTION_MIGRATION],
  appliedNames: [PARTNER_PHASE4_PRODUCTION_MIGRATION],
});
assert.equal(donePlan.targetPending, false);
assert.equal(donePlan.canApply, false);

assert.equal(parseMigrateAction({ action: "status" }), "status");
assert.equal(parseMigrateAction({ action: "apply" }), "apply");
assert.equal(parseMigrateAction({ action: "nope" }), null);

console.log("verify-partner-phase4-production-migrate: ok");
