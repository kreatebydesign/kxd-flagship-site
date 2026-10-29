/**
 * Staff Sales Development — financial privacy projections (no DB).
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { staffActorFromUser } from "../lib/staff/actor";
import {
  filterStaffVisibleSalesActivities,
  isStaffVisibleSalesActivity,
  staffVisibleLeadQualificationNotes,
  STAFF_OPERATOR_ONLY_SALES_ACTIVITY_TYPES,
  STAFF_VISIBLE_SALES_ACTIVITY_TYPES,
} from "../lib/staff/sales/projection";
import { rejectForbiddenStaffLeadPatchKeys } from "../lib/staff/sales/policy";

const root = path.resolve(import.meta.dirname, "..");

function read(rel: string): string {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

console.log("\nStaff Sales financial privacy — verify:staff-sales-financial-privacy\n");

const tyler = staffActorFromUser({
  id: 3,
  email: "tyler@kreatebydesign.com",
  displayName: "Tyler",
  role: "editor",
  staffRole: "business_development_specialist",
  staffOnboardingCompletedAt: "2026-07-01T00:00:00.000Z",
});
assert.ok(tyler);

assert.equal(STAFF_VISIBLE_SALES_ACTIVITY_TYPES.has("email"), true);
assert.equal(STAFF_OPERATOR_ONLY_SALES_ACTIVITY_TYPES.has("proposal-sent"), true);
assert.equal(isStaffVisibleSalesActivity({ activityType: "proposal-sent", id: 1 }), false);
assert.equal(
  isStaffVisibleSalesActivity({ activityType: "note", id: 2, proposal: 99 }),
  false,
);
assert.equal(isStaffVisibleSalesActivity({ activityType: "email", id: 3, title: "Hi" }), true);

const filtered = filterStaffVisibleSalesActivities([
  { id: 1, activityType: "email", title: "Outreach", occurredAt: "2026-01-01" },
  { id: 2, activityType: "commercial-review", title: "Margin review", occurredAt: "2026-01-02" },
  { id: 3, activityType: "note", title: "Hidden", proposal: 1, occurredAt: "2026-01-03" },
]);
assert.equal(filtered.length, 1);
assert.equal(filtered[0]?.id, 1);

const ownedLead = { id: 10, sourcedByStaffUser: 3, notes: "Tyler qualification" };
const inboundLead = {
  id: 11,
  assignedStaffUser: 3,
  sourceInquiry: 5,
  notes: "Budget $50k from operator",
};
assert.equal(
  staffVisibleLeadQualificationNotes(ownedLead, tyler!),
  "Tyler qualification",
);
assert.equal(staffVisibleLeadQualificationNotes(inboundLead, tyler!), null);

assert.equal(
  rejectForbiddenStaffLeadPatchKeys({ notes: "ok", estimatedValue: 1000 }),
  'Staff permission denied: field "estimatedValue" is not allowed.',
);
assert.equal(
  rejectForbiddenStaffLeadPatchKeys({ estimatedMRR: 500 }),
  'Staff permission denied: field "estimatedMRR" is not allowed.',
);
assert.equal(rejectForbiddenStaffLeadPatchKeys({ notes: "ok" }), null);

const dataSrc = read("lib/staff/sales/data.ts");
assert.doesNotMatch(dataSrc, /estimatedValue:\s*\n\s*lead\.estimatedValue/);
assert.match(dataSrc, /filterStaffVisibleSalesActivities/);
assert.match(dataSrc, /staffVisibleLeadQualificationNotes/);

const typesSrc = read("lib/staff/sales/types.ts");
assert.doesNotMatch(typesSrc, /estimatedValue/);

const policySrc = read("lib/staff/sales/policy.ts");
assert.doesNotMatch(
  policySrc,
  /STAFF_SALES_CREATABLE_PATCH_KEYS[\s\S]*"estimatedValue"/,
);
assert.doesNotMatch(
  policySrc,
  /STAFF_SALES_CREATABLE_PATCH_KEYS[\s\S]*"estimatedMRR"/,
);

const leadsRoute = read("app/api/admin/staff/sales/leads/route.ts");
assert.doesNotMatch(leadsRoute, /estimatedValue/);

const activitiesRoute = read(
  "app/api/admin/staff/sales/leads/[leadId]/activities/route.ts",
);
assert.match(activitiesRoute, /filterStaffVisibleSalesActivities/);

console.log("Staff Sales financial privacy verification passed.\n");
