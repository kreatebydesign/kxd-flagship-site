/**
 * Staff Sales Development — financial & activity privacy (no DB).
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { staffActorFromUser } from "../lib/staff/actor";
import {
  actorHasStaffCapability,
  isStaffAllowedApiPath,
} from "../lib/staff/permissions";
import {
  assertStaffMayAccessSalesLead,
  staffMayAccessSalesLead,
} from "../lib/staff/sales/access";
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

const otherBds = staffActorFromUser({
  id: 88,
  email: "other@kreatebydesign.com",
  displayName: "Other",
  role: "editor",
  staffRole: "business_development_specialist",
  staffOnboardingCompletedAt: "2026-07-01T00:00:00.000Z",
});
assert.ok(otherBds);

// --- Activity type gates ---
assert.equal(STAFF_VISIBLE_SALES_ACTIVITY_TYPES.has("email"), true);
assert.equal(STAFF_OPERATOR_ONLY_SALES_ACTIVITY_TYPES.has("proposal-sent"), true);
assert.equal(
  isStaffVisibleSalesActivity({ activityType: "proposal-sent", id: 1 }, tyler!),
  false,
);
assert.equal(
  isStaffVisibleSalesActivity(
    { activityType: "note", id: 2, proposal: 99, recordedByStaffUser: 3 },
    tyler!,
  ),
  false,
);

// Staff-authored activity (explicit recorder)
assert.equal(
  isStaffVisibleSalesActivity(
    {
      activityType: "email",
      id: 3,
      title: "Outreach",
      recordedByStaffUser: 3,
    },
    tyler!,
  ),
  true,
);

// Operator note with safe-looking type — hidden without staff recorder
assert.equal(
  isStaffVisibleSalesActivity(
    {
      activityType: "note",
      id: 4,
      title: "Pipeline review",
      summary: "Proposal $49,500 discussed with founder",
      recordedByStaffUser: null,
    },
    tyler!,
  ),
  false,
);

// Legacy staff outreach row missing recorder — hidden (ambiguous)
assert.equal(
  isStaffVisibleSalesActivity(
    { activityType: "call", id: 5, title: "Call logged" },
    tyler!,
  ),
  false,
);

// Other staff user's recorded activity — hidden from Tyler
assert.equal(
  isStaffVisibleSalesActivity(
    { activityType: "email", id: 6, recordedByStaffUser: 88 },
    tyler!,
  ),
  false,
);

const filtered = filterStaffVisibleSalesActivities(
  [
    {
      id: 1,
      activityType: "email",
      title: "Outreach",
      occurredAt: "2026-01-01",
      recordedByStaffUser: 3,
    },
    {
      id: 2,
      activityType: "commercial-review",
      title: "Margin review",
      occurredAt: "2026-01-02",
    },
    {
      id: 3,
      activityType: "note",
      title: "Operator note",
      summary: "Budget approved at $50k",
      occurredAt: "2026-01-03",
    },
    {
      id: 4,
      activityType: "call",
      title: "Legacy call",
      occurredAt: "2026-01-04",
      recordedByStaffUser: 3,
    },
  ],
  tyler!,
);
assert.equal(filtered.length, 2);
assert.deepEqual(
  filtered.map((r) => r.id),
  [1, 4],
);

// --- Lead qualification notes (sourced-by only) ---
const staffSourcedLead = {
  id: 10,
  sourcedByStaffUser: 3,
  notes: "Tyler qualification notes",
};
const inboundAssignedLead = {
  id: 11,
  assignedStaffUser: 3,
  sourceInquiry: 5,
  notes: "Budget $50k from operator",
};
const legacyAssignedLead = {
  id: 12,
  assignedStaffUser: 3,
  source: "staff-outbound",
  notes: "Legacy operator notes without intake link",
};
assert.equal(
  staffVisibleLeadQualificationNotes(staffSourcedLead, tyler!),
  "Tyler qualification notes",
);
assert.equal(staffVisibleLeadQualificationNotes(inboundAssignedLead, tyler!), null);
assert.equal(staffVisibleLeadQualificationNotes(legacyAssignedLead, tyler!), null);

// --- Access scope ---
const foreignLead = { id: 99, sourcedByStaffUser: 88, assignedStaffUser: null };
assert.equal(staffMayAccessSalesLead(tyler!, staffSourcedLead), true);
assert.equal(staffMayAccessSalesLead(tyler!, inboundAssignedLead), true);
assert.equal(staffMayAccessSalesLead(tyler!, foreignLead), false);
assert.throws(() => assertStaffMayAccessSalesLead(tyler!, foreignLead));

// --- API / mutation guards ---
assert.equal(isStaffAllowedApiPath("/api/admin/staff/sales/leads", tyler!), true);
assert.equal(isStaffAllowedApiPath("/api/admin/sales/leads", tyler!), false);
assert.equal(actorHasStaffCapability(tyler!, "staff.sales.manage"), true);
assert.equal(actorHasStaffCapability(tyler!, "admin.full-operations"), false);

assert.equal(
  rejectForbiddenStaffLeadPatchKeys({ notes: "ok", estimatedValue: 1000 }),
  'Staff permission denied: field "estimatedValue" is not allowed.',
);
assert.equal(
  rejectForbiddenStaffLeadPatchKeys({ estimatedMRR: 500 }),
  'Staff permission denied: field "estimatedMRR" is not allowed.',
);
assert.equal(rejectForbiddenStaffLeadPatchKeys({ notes: "ok" }), null);

// --- Owner data plane preserved ---
const operatorWorkspace = read("lib/sales/workspace.ts");
assert.match(operatorWorkspace, /estimatedValue/);
const salesActivitiesCollection = read("payload/collections/SalesActivities.ts");
assert.match(salesActivitiesCollection, /recordedByStaffUser/);
assert.doesNotMatch(salesActivitiesCollection, /read:\s*publicRead/);

const dataSrc = read("lib/staff/sales/data.ts");
assert.doesNotMatch(dataSrc, /estimatedValue:\s*\n\s*lead\.estimatedValue/);
assert.match(dataSrc, /recordedByStaffUserId:\s*actor\.userId/);

const typesSrc = read("lib/staff/sales/types.ts");
assert.doesNotMatch(typesSrc, /estimatedValue/);

const policySrc = read("lib/staff/sales/policy.ts");
assert.doesNotMatch(
  policySrc,
  /STAFF_SALES_CREATABLE_PATCH_KEYS[\s\S]*"estimatedValue"/,
);

const migrationSrc = read("migrations/20261029_staff_sales_activity_staff_recording.ts");
assert.match(migrationSrc, /recorded_by_staff_user_id/);
assert.match(read("migrations/index.ts"), /20261029_staff_sales_activity_staff_recording/);

console.log("Staff Sales financial privacy verification passed.\n");
