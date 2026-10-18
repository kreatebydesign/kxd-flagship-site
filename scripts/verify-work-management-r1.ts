/**
 * Work Management Release 0+1 — authorization and lifecycle policy checks.
 */
import assert from "node:assert/strict";
import { staffActorFromUser } from "../lib/staff/actor";
import {
  StaffWorkFieldPolicyError,
  buildStaffAwareWorkUpdatePatch,
} from "../lib/staff/work-field-policy";
import {
  assertRestrictedStaffWorkStatusTransition,
  assigneeRoleRequiresOperatorCompletion,
} from "../lib/staff/work-status-policy";
import { workRequiresOperatorApproval } from "../lib/staff/work-approval";
import type { WorkListItem } from "../lib/work/types";

console.log("\nWork Management R1 — verify:work-management-r1\n");

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

function mockWork(
  partial: Partial<WorkListItem> & { id: number; title: string },
): WorkListItem {
  return {
    clientId: 1,
    clientName: "Client",
    summary: "Summary",
    description: "Brief",
    acceptanceCriteria: "Criteria",
    notes: null,
    source: "manual",
    sourceId: null,
    category: "operations",
    status: "in-progress",
    priority: "normal",
    clientVisible: false,
    timelineEnabled: false,
    createdBy: null,
    assignedTo: "Tyler",
    assignedToId: 99,
    internalProject: null,
    estimatedEffort: null,
    dueDate: "2026-12-01",
    startDate: null,
    plannedForDate: null,
    tags: [],
    activityHistory: [],
    schedulingStatus: "none",
    scheduledStart: null,
    scheduledEnd: null,
    activeScheduleLinkId: null,
    startedAt: null,
    completedAt: null,
    parentWorkId: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    href: "/admin/work/0",
    adminHref: "/admin/work/0",
    clientSuccessHref: null,
    ...partial,
  };
}

const tylerWork = mockWork({ id: 1, title: "Client task" });

assert.equal(assigneeRoleRequiresOperatorCompletion("business_development_specialist"), true);
assert.equal(assigneeRoleRequiresOperatorCompletion("operations_coordinator"), false);
assert.equal(workRequiresOperatorApproval(tylerWork, tyler!), true);

assert.throws(() => {
  assertRestrictedStaffWorkStatusTransition(tyler!, tylerWork, "completed");
});

assert.throws(() => {
  buildStaffAwareWorkUpdatePatch(tyler!, tylerWork, { dueDate: "2026-12-31" });
}, StaffWorkFieldPolicyError);

assert.throws(() => {
  buildStaffAwareWorkUpdatePatch(tyler!, tylerWork, { assignedToId: 2 });
}, StaffWorkFieldPolicyError);

assert.throws(() => {
  buildStaffAwareWorkUpdatePatch(tyler!, tylerWork, { status: "completed" });
}, StaffWorkFieldPolicyError);

const patch = buildStaffAwareWorkUpdatePatch(tyler!, tylerWork, {
  notes: "Execution note",
});
assert.equal(patch.notes, "Execution note");

const heatherWork = mockWork({
  id: 2,
  title: "Coordinator task",
  assignedToId: 2,
  tags: [],
});
assertRestrictedStaffWorkStatusTransition(heather!, heatherWork, "completed");

console.log("✓ All work management R1 checks passed.\n");
