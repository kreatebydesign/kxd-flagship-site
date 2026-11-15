/**
 * Harlow staff experience — RBAC, role caps, bonus/idempotency guards (no DB).
 *   npx tsx scripts/verify-harlow-staff-experience.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  actorHasStaffCapability,
  isStaffAllowedApiPath,
  isStaffAllowedPagePath,
  resolveStaffCapabilities,
  staffRoleTitle,
} from "../lib/staff/permissions.ts";
import { staffActorFromUser } from "../lib/staff/actor.ts";
import {
  HARLOW_DISPLAY_NAME,
  HARLOW_PROPOSED_HOURLY_RATE_CENTS,
} from "../lib/staff/harlow-staff-constants.ts";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const harlow: NonNullable<ReturnType<typeof staffActorFromUser>> = staffActorFromUser({
  id: 88,
  email: "harlow@example.com",
  displayName: "Harlow",
  role: "editor",
  staffRole: "junior_studio_teammate",
  staffOnboardingCompletedAt: "2026-11-01T00:00:00.000Z",
})!;

const tyler = staffActorFromUser({
  id: 3,
  email: "tyler@kreatebydesign.com",
  displayName: "Tyler",
  role: "editor",
  staffRole: "business_development_specialist",
  staffOnboardingCompletedAt: "2026-01-01T00:00:00.000Z",
})!;

assert.ok(harlow);
assert.ok(tyler);
assert.equal(staffRoleTitle(harlow.staffRole), "Junior Studio Teammate");
assert.equal(HARLOW_PROPOSED_HOURLY_RATE_CENTS, 1455);

const harlowCaps = resolveStaffCapabilities(harlow);
assert.ok(harlowCaps.has("staff.time.clock"));
assert.ok(harlowCaps.has("staff.time.read.self"));
assert.ok(harlowCaps.has("staff.assigned-work.read"));
assert.ok(!harlowCaps.has("staff.sales.read"));
assert.ok(!harlowCaps.has("admin.payroll.review"));
assert.ok(!harlowCaps.has("admin.full-operations"));

assert.ok(tylerCapsHasSales(tyler));
assert.ok(isStaffAllowedPagePath("/admin/operations/staff/my-work", harlow));
assert.ok(isStaffAllowedPagePath("/admin/operations/staff/time", harlow));
assert.ok(isStaffAllowedPagePath("/admin/operations/staff/my-time-pay", harlow));
assert.equal(isStaffAllowedPagePath("/admin/operations/staff/sales", harlow), false);
assert.equal(isStaffAllowedPagePath("/admin/operations/brain", harlow), false);
assert.equal(isStaffAllowedApiPath("/api/admin/staff/payroll/bonuses", harlow), true);
assert.equal(isStaffAllowedApiPath("/api/admin/financial-command", harlow), false);
assert.equal(isStaffAllowedApiPath("/api/admin/staff/payroll/wage-payments", harlow), false);

const migration = readFileSync(
  path.join(repoRoot, "migrations/20261115_harlow_staff_foundation.ts"),
  "utf8",
);
assert.match(migration, /staff_discretionary_bonuses/);
assert.match(migration, /junior_studio_teammate/);
assert.match(migration, /linked_staff_user_id/);

const complianceMigration = readFileSync(
  path.join(repoRoot, "migrations/20261116_staff_minor_employment_compliance.ts"),
  "utf8",
);
assert.match(complianceMigration, /staff_employment_compliance_records/);
assert.match(complianceMigration, /paid_shift_activation/);
assert.match(complianceMigration, /payment_status/);

const shifts = readFileSync(path.join(repoRoot, "lib/staff-time/shifts.ts"), "utf8");
assert.match(shifts, /assertStaffPaidShiftPermitted/);

const usersCollection = readFileSync(path.join(repoRoot, "payload/collections/Users.ts"), "utf8");
assert.match(usersCollection, /junior_studio_teammate/);

const juniorCollection = readFileSync(
  path.join(repoRoot, "payload/collections/JuniorCreatorUsers.ts"),
  "utf8",
);
assert.match(juniorCollection, /linkedStaffUser/);

const provision = readFileSync(path.join(repoRoot, "lib/staff/harlow-staff-provision.ts"), "utf8");
assert.ok(provision.includes(HARLOW_DISPLAY_NAME));
assert.ok(provision.includes("Refusing to override"));
assert.ok(provision.includes("CONFIRM_HARLOW_STAFF_PROVISION"));

console.log("verify-harlow-staff-experience: OK");

function tylerCapsHasSales(
  actor: NonNullable<ReturnType<typeof staffActorFromUser>>,
): boolean {
  return actorHasStaffCapability(actor, "staff.sales.read");
}