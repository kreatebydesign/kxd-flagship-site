/**
 * Staff client assignments + business_development_specialist role verification.
 * Pure assertions — no database mutations.
 */
import assert from "node:assert/strict";
import {
  actorHasStaffCapability,
  isRestrictedStaff,
  isStaffAllowedApiPath,
  isStaffAllowedPagePath,
  normalizeStaffRole,
  staffRoleTitle,
} from "../lib/staff/permissions";
import { staffActorFromUser } from "../lib/staff/actor";
import {
  actorUsesAssignedClientScope,
  staffRoleRequiresAssignedClientScope,
} from "../lib/staff/client-scope";
import { assertRestrictedStaffWorkStatusTransition } from "../lib/staff/work-status-policy";
import {
  isRestrictedStaffPayloadUser,
  isStudioPayloadOperator,
} from "../payload/access/index.ts";
import type { WorkListItem } from "../lib/work/types";

console.log("\nStaff client access — verify:staff-client-access\n");

const heather = staffActorFromUser({
  id: 2,
  email: "heather@kreatebydesign.com",
  displayName: "Heather",
  role: "editor",
  staffRole: "operations_coordinator",
  staffOnboardingCompletedAt: "2026-07-01T00:00:00.000Z",
});
assert.ok(heather);

const tyler = staffActorFromUser({
  id: 99,
  email: "tyler@kreatebydesign.com",
  displayName: "Tyler",
  role: "editor",
  staffRole: "business_development_specialist",
  staffOnboardingCompletedAt: null,
});
assert.ok(tyler);

const matt = staffActorFromUser({
  id: 1,
  email: "matt@kreatebydesign.com",
  displayName: "Matt",
  role: "admin",
  staffRole: "none",
});
assert.ok(matt);

const editorNoRole = staffActorFromUser({
  id: 50,
  email: "legacy@kreatebydesign.com",
  displayName: "Legacy",
  role: "editor",
  staffRole: "none",
});
assert.ok(editorNoRole);

assert.equal(normalizeStaffRole("business_development_specialist"), "business_development_specialist");
assert.equal(
  staffRoleTitle("business_development_specialist"),
  "Business Development & Digital Specialist",
);

assert.equal(isRestrictedStaff(matt!), false);
assert.equal(isRestrictedStaff(heather!), true);
assert.equal(isRestrictedStaff(tyler!), true);
assert.equal(isRestrictedStaff(editorNoRole!), true);

assert.equal(actorHasStaffCapability(heather!, "staff.billing.verify"), true);
assert.equal(actorHasStaffCapability(tyler!, "staff.billing.verify"), false);
assert.equal(actorHasStaffCapability(tyler!, "staff.home"), true);
assert.equal(actorHasStaffCapability(tyler!, "admin.full-operations"), false);
assert.equal(actorHasStaffCapability(editorNoRole!, "staff.home"), false);

assert.equal(staffRoleRequiresAssignedClientScope("business_development_specialist"), true);
assert.equal(staffRoleRequiresAssignedClientScope("operations_coordinator"), false);
assert.equal(actorUsesAssignedClientScope(tyler!), true);
assert.equal(actorUsesAssignedClientScope(heather!), false);

assert.equal(
  isStaffAllowedApiPath("/api/admin/financial-command", tyler!),
  false,
);
assert.equal(
  isStaffAllowedApiPath("/api/admin/review-inbox/bulk-complete", heather!),
  true,
);
assert.equal(
  isStaffAllowedApiPath("/api/admin/client-requests/12/status", tyler!),
  true,
);
assert.equal(
  isStaffAllowedApiPath("/api/admin/client-command/activity", tyler!),
  false,
);
assert.equal(
  isStaffAllowedPagePath("/admin/operations/client-command/22", tyler!),
  false,
);
assert.equal(
  isStaffAllowedPagePath("/admin/operations/upgrade-requests", tyler!),
  false,
);
assert.equal(
  isStaffAllowedPagePath("/admin/operations/onboarding", tyler!),
  false,
);
assert.equal(
  isStaffAllowedPagePath("/admin/operations/onboarding", heather!),
  true,
);

const editorPayload = {
  id: 50,
  collection: "users" as const,
  role: "editor",
  staffRole: "none",
};
assert.equal(isRestrictedStaffPayloadUser(editorPayload as never), true);
assert.equal(isStudioPayloadOperator(editorPayload as never), false);
assert.equal(isStudioPayloadOperator(mattPayloadUser() as never), true);

function mattPayloadUser() {
  return { id: 1, collection: "users" as const, role: "admin", staffRole: "none" };
}

function mockWork(
  partial: Partial<WorkListItem> & { id: number; title: string },
): WorkListItem {
  return {
    clientId: 1,
    clientName: "Client",
    summary: "Summary",
    description: null,
    acceptanceCriteria: null,
    notes: null,
    source: "manual",
    sourceId: null,
    category: "creative",
    status: "in-progress",
    priority: "normal",
    clientVisible: false,
    timelineEnabled: false,
    createdBy: null,
    assignedTo: "Tyler",
    assignedToId: 99,
    internalProject: null,
    estimatedEffort: null,
    dueDate: null,
    startDate: null,
    plannedForDate: null,
    tags: ["requires-approval"],
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

const approvalWork = mockWork({ id: 1, title: "Social post draft" });
assert.throws(() => {
  assertRestrictedStaffWorkStatusTransition(tyler!, approvalWork, "completed");
});

const openWork = mockWork({
  id: 2,
  title: "Internal note",
  tags: [],
  category: "operations",
});
assertRestrictedStaffWorkStatusTransition(tyler!, openWork, "review");

assert.throws(() => {
  assertRestrictedStaffWorkStatusTransition(tyler!, openWork, "completed");
});

assert.throws(() => {
  assertRestrictedStaffWorkStatusTransition(tyler!, openWork, "archived");
});

console.log("✓ All staff client access checks passed.\n");
