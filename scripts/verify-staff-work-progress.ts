/**
 * Staff guided work — progress notes merge + checklist metadata.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  mergeStaffProgressNotes,
  splitWorkNotes,
  STAFF_PROGRESS_SECTION_MARKER,
} from "../lib/staff/work-execution-notes.ts";
import {
  allRequiredChecklistItemsChecked,
  buildStaffGuidedChecklistItems,
  mergeChecklistState,
} from "../lib/staff/guided-checklist.ts";
import {
  buildStaffGuidedExecutionPatch,
  checklistStatesEqual,
  readStaffGuidedExecution,
} from "../lib/staff/work-guided-metadata.ts";

console.log("\nverify:staff-work-progress\n");

const studio = "Matt: verify Tailscale and Screen Sharing before approving.";
const merged = mergeStaffProgressNotes(studio, "Installed Tailscale; signed in with studio account.");
assert.ok(merged?.includes(studio));
assert.ok(merged?.includes(STAFF_PROGRESS_SECTION_MARKER));
assert.ok(merged?.includes("Installed Tailscale"));

const split = splitWorkNotes(merged);
assert.equal(split.studioNotes, studio);
assert.match(split.staffProgress ?? "", /Installed Tailscale/);

const preserved = mergeStaffProgressNotes(
  `${studio}\n\n[Returned by Matt]\nPlease add hostname.`,
  "Added hostname in progress notes.",
);
assert.ok(preserved?.includes("[Returned by Matt]"));
assert.ok(preserved?.includes("Added hostname"));

const items = buildStaffGuidedChecklistItems(true);
const checked = mergeChecklistState(items, { understood: true, boundary: true });
assert.equal(allRequiredChecklistItemsChecked(items, checked), false);

const full = mergeChecklistState(items, {
  understood: true,
  "no-invention": true,
  boundary: true,
  matt: true,
});
assert.equal(allRequiredChecklistItemsChecked(items, full), true);

const meta = buildStaffGuidedExecutionPatch({}, 42, full);
const fakeDoc = { metadata: meta };
const state = readStaffGuidedExecution(fakeDoc, 42);
assert.ok(state?.checked?.understood);
assert.equal(readStaffGuidedExecution(fakeDoc, 99), null);

assert.equal(checklistStatesEqual(full, full, ["understood", "matt"]), true);
assert.equal(
  checklistStatesEqual(full, { ...full, matt: false }, ["understood", "matt"]),
  false,
);

const integrationMeta = {
  workNumber: "WK-000042",
  integrationVersion: 1,
  relationships: [{ type: "manual", entityId: "x", linkedAt: "2026-01-01T00:00:00.000Z" }],
};
const withChecklist = buildStaffGuidedExecutionPatch(integrationMeta, 7, full);
assert.equal(withChecklist.workNumber, "WK-000042");
assert.equal(Array.isArray(withChecklist.relationships), true);

assert.equal(splitWorkNotes("Legacy operator note only").studioNotes, "Legacy operator note only");
assert.equal(splitWorkNotes("Legacy operator note only").staffProgress, null);

const root = join(import.meta.dirname, "..");
const executionRoute = readFileSync(
  join(root, "app/api/admin/staff/work/[workId]/execution/route.ts"),
  "utf8",
);
assert.match(executionRoute, /requireStaffCapabilityApi\("staff\.assigned-work\.update"\)/);
assert.match(executionRoute, /requireStaffCapabilityReadApi\("staff\.assigned-work\.read"\)/);
assert.match(executionRoute, /denyUnlessStaffAssignedWork/);

const workCollection = readFileSync(join(root, "payload/collections/Work.ts"), "utf8");
assert.match(workCollection, /name: "metadata"/);

console.log("✓ Staff work progress checks passed.\n");
