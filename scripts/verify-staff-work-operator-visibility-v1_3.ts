/**
 * Staff Work Management V1.3 — list enrichment + review queue semantics.
 */
import assert from "node:assert/strict";
import {
  deliverableSummaryFromWorkDoc,
  enrichWorkListItemFromDoc,
  isWorkSubmittedForReview,
} from "../lib/work/list-enrichment";
import { applyWorkFilters } from "../lib/work/planning/query";
import type { WorkListItem } from "../lib/work/types";
import {
  STAFF_ASSIGNMENT_DELIVERABLES_KEY,
  STAFF_DELIVERABLE_PROGRESS_KEY,
} from "../lib/staff/work-deliverables";

console.log("\nverify:staff-work-operator-visibility-v1.3\n");

function baseItem(partial: Partial<WorkListItem> & { id: number }): WorkListItem {
  return {
    clientId: 1,
    clientName: "Client",
    summary: null,
    description: null,
    acceptanceCriteria: null,
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
    assignedToId: 42,
    internalProject: null,
    estimatedEffort: null,
    dueDate: null,
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
    title: "Task",
    ...partial,
  };
}

const doc = {
  id: 1,
  metadata: {
    [STAFF_ASSIGNMENT_DELIVERABLES_KEY]: {
      v: 1,
      items: [{ id: "d1", title: "Draft email", instructions: null, required: true }],
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
    [STAFF_DELIVERABLE_PROGRESS_KEY]: {
      v: 1,
      assigneeUserId: 42,
      completed: { d1: { completedAt: "2026-01-02T00:00:00.000Z" } },
      updatedAt: "2026-01-02T00:00:00.000Z",
    },
  },
};

const item = baseItem({ id: 1, assignedToId: 42 });
const summary = deliverableSummaryFromWorkDoc(doc, 42);
assert.ok(summary);
assert.equal(summary!.completed, 1);
assert.equal(summary!.total, 1);

const staffSet = new Set([42]);
const enriched = enrichWorkListItemFromDoc(item, doc, { restrictedStaffUserIds: staffSet });
assert.equal(enriched.deliverableProgress?.completed, 1);
assert.equal(enriched.hasStaffAssignment, true);

const notStaff = enrichWorkListItemFromDoc(
  baseItem({ id: 2, assignedToId: 99 }),
  { id: 2, metadata: doc.metadata },
  { restrictedStaffUserIds: staffSet },
);
assert.equal(notStaff.hasStaffAssignment, false);

assert.equal(isWorkSubmittedForReview({ status: "review" }), true);
assert.equal(isWorkSubmittedForReview({ status: "waiting-on-kxd" }), false);

const pool = [
  baseItem({ id: 10, assignedToId: 42 }),
  baseItem({ id: 11, assignedToId: null }),
  baseItem({ id: 12, assignedToId: 99 }),
];
const staffOnly = applyWorkFilters(pool, { assigneeScope: "staff" }, new Date(), staffSet);
assert.deepEqual(staffOnly.map((w) => w.id), [10]);

const unassigned = applyWorkFilters(pool, { assigneeScope: "unassigned" }, new Date(), staffSet);
assert.deepEqual(unassigned.map((w) => w.id), [11]);

console.log("✓ Staff work operator visibility V1.3 checks passed.\n");
