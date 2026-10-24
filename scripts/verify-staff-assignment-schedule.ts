/**
 * Staff assignment schedule labels — due + planned dates without inventing values.
 */
import assert from "node:assert/strict";
import { staffAssignmentScheduleDisplay } from "../lib/staff/assignment-schedule";
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

console.log("verify:staff-assignment-schedule — OK\n");
