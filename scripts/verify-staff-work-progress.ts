/**
 * Staff guided work — progress notes, checklist metadata, assignment deliverables.
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
import {
  isAuthenticated,
  isRestrictedStaffPayloadUser,
} from "../payload/access/index.ts";
import {
  parseStudioNotesAndOutcome,
  resolveGuidedWorkBrief,
  splitLegacySummaryBody,
} from "../lib/staff/guided-work-content.ts";
import {
  allRequiredDeliverablesComplete,
  applyDeliverableToggles,
  buildAcceptanceCriteriaProgressPatch,
  buildDeliverableProgressPatch,
  buildDeliverablesDefinitionPatch,
  formatInstructionBlocks,
  mergeAcceptanceCriteriaViews,
  mergeDeliverableViews,
  parseAcceptanceCriteriaDefinition,
  parseAcceptanceCriteriaProgress,
  parseDeliverablesDefinition,
  parseDeliverableProgress,
  pruneDeliverableCompletionsForDefinition,
  sanitizeDeliverableTogglePayload,
  sanitizeDeliverablesInput,
} from "../lib/staff/work-deliverables.ts";

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
assert.match(workCollection, /update:\s*isAuthenticated/);

const tylerPayloadUser = {
  collection: "users",
  role: "editor",
  id: 99,
  staffRole: "business_development_specialist",
};
const studioAdminUser = { collection: "users", role: "admin", id: 1 };
assert.equal(isRestrictedStaffPayloadUser(tylerPayloadUser as never), true);
assert.equal(
  isAuthenticated({ req: { user: tylerPayloadUser } } as never),
  false,
);
assert.equal(
  isAuthenticated({ req: { user: studioAdminUser } } as never),
  true,
);

const deliverablesSanitized = sanitizeDeliverablesInput([
  { id: "step-1", title: "Install Tailscale", required: true },
  { id: "step-2", title: "Verify Screen Sharing", required: false },
]);
assert.ok(Array.isArray(deliverablesSanitized));

const defPatch = buildDeliverablesDefinitionPatch({}, deliverablesSanitized as never, "matt@kxd.test");
const metaWithDef = defPatch as Record<string, unknown>;
const definition = parseDeliverablesDefinition(metaWithDef);
assert.equal(definition?.items.length, 2);

const toggles = sanitizeDeliverableTogglePayload(definition, { "step-1": true });
assert.ok(!("error" in toggles));

const completed = applyDeliverableToggles(
  definition!,
  null,
  (toggles as { toggles: Record<string, boolean> }).toggles,
  "2026-01-01T00:00:00.000Z",
);
const progressPatch = buildDeliverableProgressPatch(metaWithDef, 42, completed);
const progress = parseDeliverableProgress(progressPatch, 42);
const views = mergeDeliverableViews(definition, progress);
assert.equal(views[0]?.completed, true);
assert.equal(allRequiredDeliverablesComplete(views), true);

const blocks = formatInstructionBlocks("Line one\nLine two\n\nSecond paragraph");
assert.equal(blocks.length, 2);

const multilineSteps = formatInstructionBlocks("Before you start:\n- item A\n- item B");
assert.ok(multilineSteps.length >= 3);

const legacySummary =
  "Set up your home Mac for remote studio work.\n1. Install Tailscale\n2. Enable Screen Sharing";
const legacySplit = splitLegacySummaryBody(legacySummary, true);
assert.match(legacySplit.lead ?? "", /Set up your home Mac/);
assert.equal(legacySplit.tailForInstructions, null);

const legacyBrief = resolveGuidedWorkBrief({
  summary: legacySummary,
  description: null,
  expectedOutcomeFromNotes: "You can securely reach studio systems from home.",
  hasStructuredDeliverables: true,
});
assert.equal(legacyBrief.expectedOutcome, "You can securely reach studio systems from home.");
assert.ok(legacyBrief.instructionBlocks.some((b) => /Set up your home Mac/.test(b)));

const notesParsed = parseStudioNotesAndOutcome(
  "[Expected outcome]\nSecure remote access verified.\n\n[Staff progress]\nStarted install.",
);
assert.equal(notesParsed.expectedOutcomeFromNotes, "Secure remote access verified.");
assert.match(notesParsed.staffProgress ?? "", /Started install/);

const acDef = parseAcceptanceCriteriaDefinition(
  "- [ ] Hostname recorded in studio inventory\n- [x] Tailscale connected",
);
assert.equal(acDef?.items.length, 2);
assert.equal(acDef?.items[0]?.id, "ac-0");

const acCompleted = applyDeliverableToggles(
  acDef!,
  null,
  { "ac-0": true },
  "2026-03-01T00:00:00.000Z",
);
const acMeta = buildAcceptanceCriteriaProgressPatch({}, 3, acCompleted);
const acProgress = parseAcceptanceCriteriaProgress(acMeta, 3);
const acViews = mergeAcceptanceCriteriaViews(acDef, acProgress);
assert.equal(acViews[0]?.completed, true);
assert.equal(allRequiredDeliverablesComplete(acViews), false);

const deliverablesRoute = readFileSync(
  join(root, "app/api/admin/work/[id]/deliverables/route.ts"),
  "utf8",
);
assert.match(deliverablesRoute, /isRestrictedStaff/);

const submitReview = readFileSync(
  join(root, "app/api/admin/staff/work/[workId]/submit-review/route.ts"),
  "utf8",
);
assert.match(submitReview, /assertStaffGuidedChecklistReadyForSubmit/);

const completeRoute = readFileSync(
  join(root, "app/api/admin/staff/work/[workId]/complete/route.ts"),
  "utf8",
);
assert.match(completeRoute, /assertStaffGuidedChecklistReadyForSubmit/);

const workFieldPolicy = readFileSync(join(root, "lib/staff/work-field-policy.ts"), "utf8");
assert.match(workFieldPolicy, /assignmentDeliverables/);

const metaWithChecklist = {
  workNumber: "WK-000099",
  staffGuidedExecution: {
    v: 1,
    assigneeUserId: 3,
    checked: { understood: true },
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
};
const defOnly = buildDeliverablesDefinitionPatch(metaWithChecklist, [
  { id: "a", title: "Step A", instructions: null, required: true },
]);
assert.equal(
  (defOnly as { staffGuidedExecution?: { checked?: { understood?: boolean } } })
    .staffGuidedExecution?.checked?.understood,
  true,
);

const progressOnly = buildDeliverableProgressPatch(defOnly, 3, {
  a: { completedAt: "2026-01-02T00:00:00.000Z" },
});
assert.equal((progressOnly as { workNumber?: string }).workNumber, "WK-000099");
assert.ok((progressOnly as { staffAssignmentDeliverables?: unknown }).staffAssignmentDeliverables);

const unknownToggle = sanitizeDeliverableTogglePayload(definition, { "not-real": true });
assert.ok("error" in unknownToggle);

const wrongAssignee = parseDeliverableProgress(progressOnly, 99);
assert.equal(wrongAssignee, null);

const pruned = pruneDeliverableCompletionsForDefinition(definition!, {
  v: 1,
  assigneeUserId: 42,
  completed: {
    "step-1": { completedAt: "2026-01-01T00:00:00.000Z" },
    removed: { completedAt: "2026-01-01T00:00:00.000Z" },
  },
  updatedAt: "2026-01-01T00:00:00.000Z",
});
assert.equal(pruned["step-1"] != null, true);
assert.equal("removed" in pruned, false);

const workExecution = readFileSync(join(root, "lib/staff/work-execution-service.ts"), "utf8");
assert.match(workExecution, /buildDeliverableProgressPatch/);
assert.match(workExecution, /buildAcceptanceCriteriaProgressPatch/);
assert.match(workExecution, /buildStaffGuidedExecutionPatch/);

const guidedScreen = readFileSync(
  join(root, "components/admin/operations/staff/StaffGuidedWorkScreen.tsx"),
  "utf8",
);
assert.match(guidedScreen, /Expected outcome/);
assert.match(guidedScreen, /Acceptance criteria/);
assert.doesNotMatch(guidedScreen, /Assignment overview/);

assert.match(executionRoute, /acceptanceCriteria/);

const timeClockScreen = readFileSync(
  join(root, "components/admin/operations/staff/StaffTimeClockScreen.tsx"),
  "utf8",
);
assert.match(timeClockScreen, /Assigned work/);
assert.doesNotMatch(timeClockScreen, /Work item ID/);
assert.match(timeClockScreen, /eligibleWork/);

console.log("✓ Staff work progress checks passed.\n");
