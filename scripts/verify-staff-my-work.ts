/**
 * Staff My Work — board mapping and BDS client scope query shape.
 */
import assert from "node:assert/strict";
import {
  groupStaffMyWorkItems,
  partitionStaffMyWorkBoard,
  staffMyWorkBoardColumn,
} from "../lib/staff/my-work-board";
import type { WorkListItem } from "../lib/work/types";

console.log("\nverify:staff-my-work\n");

function mockWork(partial: Partial<WorkListItem> & { id: number; status: WorkListItem["status"] }): WorkListItem {
  return {
    id: partial.id,
    clientId: partial.clientId ?? null,
    clientName: partial.clientName ?? "Internal",
    title: partial.title ?? "Task",
    summary: null,
    description: null,
    notes: null,
    source: "manual",
    sourceId: null,
    category: "general",
    status: partial.status,
    priority: partial.priority ?? "normal",
    clientVisible: false,
    timelineEnabled: true,
    createdBy: null,
    assignedTo: null,
    assignedToId: 99,
    internalProject: partial.internalProject ?? null,
    tags: [],
    estimatedEffort: null,
    dueDate: partial.dueDate ?? null,
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
    updatedAt: "2026-01-02T00:00:00.000Z",
    href: "/admin/operations/staff/work/1",
    adminHref: "/admin/operations/staff/work/1",
    clientSuccessHref: null,
    activityHistory: [],
  };
}

assert.equal(staffMyWorkBoardColumn("new"), "todo");
assert.equal(staffMyWorkBoardColumn("planned"), "todo");
assert.equal(staffMyWorkBoardColumn("in-progress"), "in-progress");
assert.equal(staffMyWorkBoardColumn("blocked"), "blocked");
assert.equal(staffMyWorkBoardColumn("review"), "in-review");
assert.equal(staffMyWorkBoardColumn("completed"), null);

const board = partitionStaffMyWorkBoard([
  mockWork({ id: 1, status: "new" }),
  mockWork({ id: 2, status: "in-progress" }),
  mockWork({ id: 3, status: "blocked" }),
  mockWork({ id: 4, status: "review" }),
]);
assert.equal(board.todo.length, 1);
assert.equal(board["in-progress"].length, 1);
assert.equal(board.blocked.length, 1);
assert.equal(board["in-review"].length, 1);

const groups = groupStaffMyWorkItems([
  mockWork({ id: 10, status: "new", clientId: 5, clientName: "Acme Co" }),
  mockWork({ id: 11, status: "planned", internalProject: "Studio ops" }),
]);
assert.equal(groups.length, 2);
assert.ok(groups.some((g) => g.label === "Acme Co"));
assert.ok(groups.some((g) => g.label.includes("Studio ops")));

console.log("✓ Board column mapping");
console.log("✓ Client / internal grouping");
console.log("\nAll staff-my-work checks passed.\n");
