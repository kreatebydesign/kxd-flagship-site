/**
 * Phase 2A — My Clients routes, permissions, and note policy.
 * Pure assertions — no database mutations.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  actorHasStaffCapability,
  isStaffAllowedApiPath,
  isStaffAllowedPagePath,
} from "../lib/staff/permissions";
import { staffActorFromUser } from "../lib/staff/actor";
import {
  staffMayCreateClientNote,
  staffMayReadClientNotesForClient,
  validateStaffClientNoteInput,
} from "../lib/staff/client-notes/policy";
import { buildStaffSafeClientSummary } from "../lib/staff/client-context/safe-projection";

const root = join(import.meta.dirname, "..");

console.log("\nStaff My Clients — verify:staff-my-clients\n");

const tyler = staffActorFromUser({
  id: 99,
  email: "tyler@kreatebydesign.com",
  displayName: "Tyler",
  role: "editor",
  staffRole: "business_development_specialist",
  staffOnboardingCompletedAt: "2026-07-01T00:00:00.000Z",
});
assert.ok(tyler);

assert.equal(actorHasStaffCapability(tyler!, "staff.client-context.limited"), true);
assert.equal(
  isStaffAllowedPagePath("/admin/operations/staff/my-clients", tyler!),
  true,
);
assert.equal(
  isStaffAllowedPagePath("/admin/operations/staff/my-clients/22", tyler!),
  true,
);
assert.equal(
  isStaffAllowedPagePath("/admin/operations/client-command/22", tyler!),
  false,
);
assert.equal(
  isStaffAllowedApiPath("/api/admin/staff/client-notes", tyler!),
  true,
);
assert.equal(
  isStaffAllowedApiPath("/api/admin/client-command/actions", tyler!),
  false,
);

assert.equal(staffMayReadClientNotesForClient(tyler!, true), true);
assert.equal(staffMayReadClientNotesForClient(tyler!, false), false);
assert.equal(staffMayCreateClientNote(tyler!, true), true);
assert.equal(staffMayCreateClientNote(tyler!, false), false);

assert.equal(validateStaffClientNoteInput({ body: "hi", kind: "note" }).ok, false);
assert.equal(validateStaffClientNoteInput({ body: "Ready for review.", kind: "note" }).ok, true);

const safe = buildStaffSafeClientSummary({
  client: {
    id: 22,
    name: "Twisted Creek Logistics, LLC",
    slug: "twisted-creek",
    status: "active",
    relationshipStatus: "healthy",
    companyWebsite: "https://example.com",
    primaryContactName: "Contact",
    primaryContactEmail: "contact@example.com",
    monthlyRetainerAmount: 5000,
    commercialNotes: "secret",
  },
  profile: {
    currentMonthlyRevenue: 9000,
    activeProjectsSummary: "Website refresh",
    productionUrl: "https://live.example.com",
  },
  contactDocs: [],
  projectDocs: [],
  assignedWork: [],
  portalHref: null,
});

assert.equal(safe.name, "Twisted Creek Logistics, LLC");
assert.equal(safe.clientId, 22);
assert.ok(!JSON.stringify(safe).includes("monthlyRetainerAmount"));
assert.ok(!JSON.stringify(safe).includes("commercialNotes"));
assert.ok(!JSON.stringify(safe).includes("currentMonthlyRevenue"));

const clientNotesRoute = readFileSync(
  join(root, "app/api/admin/staff/client-notes/route.ts"),
  "utf8",
);
assert.match(clientNotesRoute, /staffMayAccessClient/);

const execFetch = readFileSync(
  join(root, "lib/executive-client-workspace/fetch-client-workspace.ts"),
  "utf8",
);
assert.match(execFetch, /listStaffClientNotesForClient/);

const workspaceTabs = readFileSync(
  join(root, "components/admin/operations/client-workspace/WorkspaceTabs.tsx"),
  "utf8",
);
assert.match(workspaceTabs, /Staff notes & questions/);
assert.match(workspaceTabs, /StaffClientNotesSection/);

const workspaceTabNav = readFileSync(
  join(root, "components/admin/operations/client-workspace/WorkspaceTabNav.tsx"),
  "utf8",
);
assert.match(workspaceTabNav, /client-command\/\$\{clientId\}\?tab=notes/);

console.log("✓ All staff My Clients checks passed.\n");
