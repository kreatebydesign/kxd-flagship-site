/**
 * Staff assignment schedule labels — due + planned dates without inventing values.
 */
import assert from "node:assert/strict";
import { staffAssignmentScheduleDisplay } from "../lib/staff/assignment-schedule";
import { buildStaffPlan } from "../lib/staff/plan";
import type { WorkListItem } from "../lib/work/types";

console.log("\nverify:staff-assignment-schedule\n");

function mock(partial: Partial<WorkListItem>): WorkListItem {
  return {
    id: 1,
    clientId: null,
    clientName: "Internal",
    title: "Task",
    summary: null,
    description: null,
    acceptanceCriteria: null,
    notes: null,
    source: "manual",
    sourceId: null,
    category: "general",
    status: "new",
    priority: "normal",
    clientVisible: false,
    timelineEnabled: true,
    createdBy: null,
    assignedTo: null,
    assignedToId: 3,
    internalProject: null,
    tags: [],
    estimatedEffort: null,
    dueDate: null,
    startDate: null,
    plannedForDate: null,
    schedulingStatus: "none",
    scheduledStart: null,
    scheduledEnd: null,
    activeScheduleLinkId: null,
    startedAt: null,
    completedAt: null,
    parentWorkId: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    href: "/admin/operations/staff/work/1",
    adminHref: "/admin/work/1",
    clientSuccessHref: null,
    activityHistory: [],
    ...partial,
  };
}

const noDates = staffAssignmentScheduleDisplay(mock({}));
assert.equal(noDates.primary, "No due date");
assert.equal(noDates.secondary, null);
assert.equal(noDates.dueChip, null);

const plannedOnly = staffAssignmentScheduleDisplay(
  mock({ plannedForDate: "2026-11-01T00:00:00.000Z" }),
);
assert.match(plannedOnly.primary, /^Planned /);
assert.equal(plannedOnly.secondary, null);

const dueOnly = staffAssignmentScheduleDisplay(
  mock({ dueDate: "2026-12-01T00:00:00.000Z" }),
);
assert.match(dueOnly.primary, /^Due /);
assert.equal(dueOnly.secondary, null);
assert.ok(dueOnly.dueChip);

const both = staffAssignmentScheduleDisplay(
  mock({
    dueDate: "2026-11-15T00:00:00.000Z",
    plannedForDate: "2026-11-01T00:00:00.000Z",
  }),
);
assert.match(both.primary, /^Due /);
assert.match(both.secondary ?? "", /^Planned /);

const overdue = staffAssignmentScheduleDisplay(
  mock({
    dueDate: "2020-01-01T00:00:00.000Z",
    status: "in-progress",
  }),
);
assert.equal(overdue.primary, "Overdue");
assert.equal(overdue.isOverdue, true);

const planActor = {
  userId: 3,
  email: "tyler@kreatebydesign.com",
  displayName: "Tyler",
  role: "editor",
  staffRole: "business_development_specialist" as const,
  onboardingCompletedAt: "2026-07-01T00:00:00.000Z",
};
const trainingStub = {
  overallPercent: 100,
  continueLesson: null,
  recommendedLesson: null,
  paths: [],
  growthTrack: { roleTitle: "Test", roleSummary: "", expandingInto: [], notIncluded: [] },
};

const plannedOnlyWork = mock({
  id: 91,
  plannedForDate: "2026-11-01T00:00:00.000Z",
  status: "new",
});
const planPlanned = buildStaffPlan({
  actor: planActor,
  assigned: [plannedOnlyWork],
  training: trainingStub as never,
  now: new Date("2026-10-01T12:00:00.000Z"),
});
const plannedRow =
  planPlanned.plan.find((p) => p.workId === 91) ??
  planPlanned.comingNext.find((p) => p.workId === 91);
assert.ok(plannedRow, "planned-only work appears on staff home plan");
assert.match(plannedRow!.dueState, /^Planned /);
assert.notEqual(plannedRow!.dueState, "No due date");

const dueOnlyWork = mock({
  id: 92,
  dueDate: "2026-12-15T00:00:00.000Z",
  status: "new",
});
const planDue = buildStaffPlan({
  actor: planActor,
  assigned: [dueOnlyWork],
  training: trainingStub as never,
  now: new Date("2026-10-01T12:00:00.000Z"),
});
const dueRow = planDue.plan.find((p) => p.workId === 92);
assert.ok(dueRow);
assert.match(dueRow!.dueState, /^Due /);

const overdueWork = mock({
  id: 93,
  dueDate: "2020-01-01T00:00:00.000Z",
  status: "in-progress",
});
const planOverdue = buildStaffPlan({
  actor: planActor,
  assigned: [overdueWork],
  training: trainingStub as never,
  now: new Date("2026-10-01T12:00:00.000Z"),
});
const overdueRow = planOverdue.plan.find((p) => p.workId === 93);
assert.ok(overdueRow);
assert.equal(overdueRow!.dueState, "Overdue");

const neitherWork = mock({ id: 94, status: "new" });
const planNeither = buildStaffPlan({
  actor: planActor,
  assigned: [neitherWork],
  training: trainingStub as never,
  now: new Date("2026-10-01T12:00:00.000Z"),
});
const neitherRow = planNeither.plan.find((p) => p.workId === 94);
assert.ok(neitherRow);
assert.equal(neitherRow!.dueState, "No due date");

console.log("verify:staff-assignment-schedule — OK\n");
