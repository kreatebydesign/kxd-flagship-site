/**
 * Discretionary bonus ledger — idempotency key shape, owner gate, separation from hourly (no DB).
 *   npx tsx scripts/verify-staff-discretionary-bonuses.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isFounderOrAdmin } from "../lib/staff/permissions.ts";
import type { StaffActor } from "../lib/staff/types.ts";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const record = readFileSync(path.join(repoRoot, "lib/staff-pay/bonuses/record.ts"), "utf8");
const migration = readFileSync(
  path.join(repoRoot, "migrations/20261115_harlow_staff_foundation.ts"),
  "utf8",
);

assert.match(migration, /staff_discretionary_bonuses_idempotency_unique/);
assert.match(record, /BONUS_OWNER_ONLY/);
assert.match(record, /ON CONFLICT \(staff_user_id, idempotency_key\)/);
assert.doesNotMatch(record, /staff_wage_payment_allocations/);
assert.match(record, /BONUS_SELF_DENIED/);

const markPaid = readFileSync(path.join(repoRoot, "lib/staff-pay/bonuses/mark-paid.ts"), "utf8");
assert.match(markPaid, /BONUS_PAYMENT_DUPLICATE/);

const matt: StaffActor = {
  userId: 1,
  email: "matt@kreatebydesign.com",
  displayName: "Matt",
  role: "admin",
  staffRole: "none",
  onboardingCompletedAt: null,
};
const tyler: StaffActor = {
  userId: 3,
  email: "tyler@kreatebydesign.com",
  displayName: "Tyler",
  role: "editor",
  staffRole: "business_development_specialist",
  onboardingCompletedAt: "2026-01-01T00:00:00.000Z",
};

assert.equal(isFounderOrAdmin(matt), true);
assert.equal(isFounderOrAdmin(tyler), false);

const bonusesRoute = readFileSync(
  path.join(repoRoot, "app/api/admin/staff/payroll/bonuses/route.ts"),
  "utf8",
);
assert.match(bonusesRoute, /Staff may only view their own bonuses/);
assert.match(bonusesRoute, /Only the owner may record discretionary bonuses/);

console.log("verify-staff-discretionary-bonuses: OK");