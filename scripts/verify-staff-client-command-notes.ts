/**
 * Phase 2A correction — staff notes visible in Client Command Notes tab.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { isStaffAllowedPagePath } from "../lib/staff/permissions";
import { staffActorFromUser } from "../lib/staff/actor";

const root = join(import.meta.dirname, "..");

console.log("\nverify:staff-client-command-notes\n");

const tyler = staffActorFromUser({
  id: 3,
  email: "tyler@kreatebydesign.com",
  displayName: "Tyler",
  role: "editor",
  staffRole: "business_development_specialist",
  staffOnboardingCompletedAt: "2026-01-01T00:00:00.000Z",
});
assert.ok(tyler);
assert.equal(isStaffAllowedPagePath("/admin/operations/client-command/22", tyler!), false);

const workspaceData = readFileSync(
  join(root, "lib/client-command/workspace-data.ts"),
  "utf8",
);
assert.match(workspaceData, /listStaffClientNotesForClient/);

const types = readFileSync(join(root, "lib/client-command/workspace-types.ts"), "utf8");
assert.match(types, /staffClientNotes: StaffClientNoteRecord\[\]/);

const panel = readFileSync(
  join(root, "components/admin/operations/client-command/CommandWorkspaceTabPanel.tsx"),
  "utf8",
);
assert.match(panel, /StaffClientNotesSection/);
assert.match(panel, /#staff-notes/);
assert.match(panel, /Executive notes/);

const section = readFileSync(
  join(root, "components/admin/operations/client-command/StaffClientNotesSection.tsx"),
  "utf8",
);
assert.match(section, /Staff notes & questions/);
assert.match(section, /authorDisplayName/);

console.log("✓ Staff client command notes wiring verified.\n");
