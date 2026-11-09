/**
 * Apply only pending staff pay / wage ledger migrations (61101, 61102, 61109)
 * on an isolated non-production Neon branch.
 *
 *   KXD_CONFIRM_PREVIEW_DB_WRITE=1 KXD_WAGE_LEDGER_QA_ENDPOINT_ID=ep-… \
 *   DATABASE_URI=…direct… KXD_SERVER_ONLY_SHIM=1 \
 *   node --import ./scripts/shims/register-server-only.mjs --import tsx \
 *     scripts/apply-wage-ledger-pending-migrations.ts
 */
import { assertPreviewKxdOsDatabase } from "./lib/preview-kxd-os-db.ts";
import { applyOrderedMigrations, listOrderedMigrationNames } from "./lib/payload-migrate-ordered.ts";

const TARGET = new Set([
  "20261101_staff_time_pay_requests",
  "20261102_staff_pay_historical_entries",
  "20261109_staff_wage_external_payments",
]);

assertPreviewKxdOsDatabase();

const all = listOrderedMigrationNames();
const pending = all.filter((n) => TARGET.has(n));
console.log(`[KXD] wage-ledger migration names in index: ${pending.join(", ")}`);

await applyOrderedMigrations();
console.log("[KXD] apply-wage-ledger-pending-migrations: complete");
