/**
 * Staff Sales Development Phase 1 — policy and access verification (no DB).
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { staffActorFromUser } from "../lib/staff/actor";
import {
  actorHasStaffCapability,
  isStaffAllowedApiPath,
  isStaffAllowedPagePath,
} from "../lib/staff/permissions";
import {
  assertStaffMayAccessSalesLead,
  staffMayAccessSalesLead,
} from "../lib/staff/sales/access";
import {
  assertStaffLeadStatusTransition,
  isStaffAllowedLeadStatus,
  isStaffAllowedNextAction,
  rejectForbiddenStaffLeadPatchKeys,
  STAFF_SALES_OPERATOR_ONLY_STATUSES,
} from "../lib/staff/sales/policy";

const root = path.resolve(import.meta.dirname, "..");

function read(rel: string): string {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

console.log("\nStaff Sales Phase 1 — verify:staff-sales-phase1\n");

const tyler = staffActorFromUser({
  id: 99,
  email: "tyler@kreatebydesign.com",
  displayName: "Tyler",
  role: "editor",
  staffRole: "business_development_specialist",
  staffOnboardingCompletedAt: "2026-07-01T00:00:00.000Z",
});
assert.ok(tyler);

const heather = staffActorFromUser({
  id: 2,
  email: "heather@kreatebydesign.com",
  displayName: "Heather",
  role: "editor",
  staffRole: "operations_coordinator",
  staffOnboardingCompletedAt: "2026-07-01T00:00:00.000Z",
});
assert.ok(heather);

const other = staffActorFromUser({
  id: 88,
  email: "other@kreatebydesign.com",
  displayName: "Other",
  role: "editor",
  staffRole: "business_development_specialist",
  staffOnboardingCompletedAt: "2026-07-01T00:00:00.000Z",
});
assert.ok(other);

assert.equal(actorHasStaffCapability(tyler!, "staff.sales.read"), true);
assert.equal(actorHasStaffCapability(tyler!, "staff.sales.manage"), true);
assert.equal(actorHasStaffCapability(heather!, "staff.sales.read"), false);

assert.equal(
  isStaffAllowedPagePath("/admin/operations/staff/sales", tyler!),
  true,
);
assert.equal(
  isStaffAllowedPagePath("/admin/operations/staff/sales/42", tyler!),
  true,
);
assert.equal(isStaffAllowedPagePath("/admin/sales", tyler!), false);
assert.equal(isStaffAllowedPagePath("/admin/operations/research", tyler!), false);

assert.equal(
  isStaffAllowedApiPath("/api/admin/staff/sales/leads", tyler!),
  true,
);
assert.equal(
  isStaffAllowedApiPath("/api/admin/staff/sales/leads/5/outreach", tyler!),
  true,
);
assert.equal(isStaffAllowedApiPath("/api/admin/sales/leads", tyler!), false);
assert.equal(isStaffAllowedApiPath("/api/admin/research-leads", tyler!), false);

const ownedLead = {
  id: 1,
  sourcedByStaffUser: tyler!.userId,
  assignedStaffUser: null,
};
const assignedLead = {
  id: 2,
  sourcedByStaffUser: null,
  assignedStaffUser: tyler!.userId,
};
const foreignLead = {
  id: 3,
  sourcedByStaffUser: other!.userId,
  assignedStaffUser: null,
};

assert.equal(staffMayAccessSalesLead(tyler!, ownedLead), true);
assert.equal(staffMayAccessSalesLead(tyler!, assignedLead), true);
assert.equal(staffMayAccessSalesLead(tyler!, foreignLead), false);

assert.throws(() => assertStaffMayAccessSalesLead(tyler!, foreignLead));

assert.equal(isStaffAllowedLeadStatus("discovery"), true);
assert.equal(isStaffAllowedLeadStatus("proposal"), false);
assert.equal(isStaffAllowedNextAction("send-proposal"), false);
assert.equal(isStaffAllowedNextAction("respond-today"), true);

assert.throws(() =>
  assertStaffLeadStatusTransition("new", "won"),
);
assert.throws(() =>
  assertStaffLeadStatusTransition("proposal", "nurturing"),
);

const forged = rejectForbiddenStaffLeadPatchKeys({
  notes: "ok",
  sourcedByStaffUser: 1,
});
assert.ok(forged?.includes("sourcedByStaffUser"));
const assignedForged = rejectForbiddenStaffLeadPatchKeys({
  assignedStaffUser: tyler!.userId,
});
assert.ok(assignedForged?.includes("assignedStaffUser"));

assert.equal(STAFF_SALES_OPERATOR_ONLY_STATUSES.has("won"), true);

assert.match(read("migrations/20261022_staff_sales_development_phase1.ts"), /sourced_by_staff_user_id/);
assert.match(read("payload/collections/SalesLeads.ts"), /sourcedByStaffUser/);
assert.match(read("payload/collections/SalesLeads.ts"), /assignedStaffUser/);
assert.match(read("components/admin/operations/shared/OperationsShell.tsx"), /Sales development/);
assert.doesNotMatch(
  read("lib/staff/permissions.ts"),
  /OPERATIONS_COORDINATOR_CAPABILITIES[\s\S]*staff\.sales\.read/,
);

assert.match(read("app/api/admin/sales/leads/route.ts"), /requirePayloadAdminApi/);
assert.match(
  read("app/api/admin/staff/sales/leads/route.ts"),
  /requireStaffCapabilityApi\("staff\.sales/,
);

console.log("Staff Sales Phase 1 verification passed.\n");
