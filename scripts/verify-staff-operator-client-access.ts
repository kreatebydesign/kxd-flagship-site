/**
 * Staff operator client data — authorization regression (no DB).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  actorHasStaffCapability,
  isStaffAllowedApiPath,
  isStaffAllowedPagePath,
} from "../lib/staff/permissions";
import { staffActorFromUser } from "../lib/staff/actor";
import { restrictedStaffBlocksClientData } from "../lib/staff/client-scope";
import { evaluateBulkClientActionAuthorization } from "../lib/staff/bulk-client-action-access";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

console.log("\nStaff operator client access — verify:staff-operator-client-access\n");

const tyler = staffActorFromUser({
  id: 3,
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

const matt = staffActorFromUser({
  id: 1,
  email: "matt@kreatebydesign.com",
  displayName: "Matt",
  role: "admin",
  staffRole: "none",
});
assert.ok(matt);

const twistedCreekId = 22;

assert.equal(restrictedStaffBlocksClientData(tyler, false), true);
assert.equal(restrictedStaffBlocksClientData(tyler, true), false);
assert.equal(restrictedStaffBlocksClientData(matt!, false), false);
assert.equal(restrictedStaffBlocksClientData(heather!, false), false);

assert.equal(
  isStaffAllowedPagePath("/admin/operations/client-command/22", tyler),
  false,
);
assert.equal(
  isStaffAllowedPagePath("/admin/operations/clients/22", tyler),
  false,
);
assert.equal(
  isStaffAllowedPagePath("/admin/operations/upgrade-requests", tyler),
  false,
);
assert.equal(isStaffAllowedPagePath("/admin/operations/onboarding", tyler), false);
assert.equal(actorHasStaffCapability(tyler, "staff.onboarding.assist"), false);
assert.equal(isStaffAllowedPagePath("/admin/operations/onboarding", heather!), true);
assert.equal(
  isStaffAllowedPagePath("/admin/operations/staff/my-work", tyler),
  true,
);

assert.equal(
  isStaffAllowedApiPath("/api/admin/client-command/activity", tyler),
  false,
);
assert.equal(
  isStaffAllowedApiPath("/api/admin/client-command/actions", tyler),
  false,
);
assert.equal(
  isStaffAllowedApiPath("/api/admin/executive-notes", tyler),
  false,
);
assert.equal(
  isStaffAllowedApiPath("/api/admin/upgrade-requests", tyler),
  false,
);
assert.equal(isStaffAllowedApiPath("/api/admin/review-inbox/summary", tyler), true);
assert.equal(isStaffAllowedApiPath("/api/admin/client-requests/1/notes", tyler), true);

const authSrc = readFileSync(path.join(repoRoot, "lib/admin/auth.ts"), "utf8");
assert.match(
  authSrc,
  /Staff permission evaluation failed/,
  "requirePayloadAdminApi must fail closed on staff evaluation errors",
);
assert.doesNotMatch(
  authSrc,
  /fail open only if staff modules fail to load/,
  "removed fail-open staff API path",
);

const workspaceLoader = readFileSync(
  path.join(repoRoot, "lib/client-command/workspace-data.ts"),
  "utf8",
);
assert.match(workspaceLoader, /isCurrentSessionDeniedClientData/);

const fetchWorkspace = readFileSync(
  path.join(repoRoot, "lib/executive-client-workspace/fetch-client-workspace.ts"),
  "utf8",
);
assert.match(fetchWorkspace, /isCurrentSessionDeniedClientData/);

const activityRoute = readFileSync(
  path.join(repoRoot, "app/api/admin/client-command/activity/route.ts"),
  "utf8",
);
assert.match(activityRoute, /denyUnlessOperatorClientAccess/);

const clientCommandPage = readFileSync(
  path.join(repoRoot, "app/admin/operations/client-command/[clientId]/page.tsx"),
  "utf8",
);
assert.match(clientCommandPage, /requireOperatorClientPageAccess/);

const executiveClientPage = readFileSync(
  path.join(repoRoot, "app/admin/operations/clients/[id]/page.tsx"),
  "utf8",
);
assert.match(executiveClientPage, /requireOperatorClientPageAccess/);

void twistedCreekId;

const assignedOnly = [10];
const mixedBatch = evaluateBulkClientActionAuthorization(
  tyler,
  [
    { actionId: 1, clientId: 10 },
    { actionId: 2, clientId: twistedCreekId },
  ],
  assignedOnly,
);
assert.equal(mixedBatch.ok, false);
if (!mixedBatch.ok) {
  assert.equal(mixedBatch.reason, "unauthorized-client");
  assert.equal(mixedBatch.clientId, twistedCreekId);
}

const sameClientBatch = evaluateBulkClientActionAuthorization(
  tyler,
  [
    { actionId: 1, clientId: 10 },
    { actionId: 2, clientId: 10 },
  ],
  assignedOnly,
);
assert.equal(sameClientBatch.ok, true);

const mattBulk = evaluateBulkClientActionAuthorization(
  matt!,
  [
    { actionId: 1, clientId: twistedCreekId },
    { actionId: 2, clientId: 99 },
  ],
  [],
);
assert.equal(mattBulk.ok, true);

const bulkRoute = readFileSync(
  path.join(repoRoot, "app/api/admin/client-command/actions/bulk/route.ts"),
  "utf8",
);
assert.match(bulkRoute, /denyUnlessOperatorBulkClientActions/);
assert.doesNotMatch(
  bulkRoute,
  /resolveClientIdForClientAction\(body\.ids\[0\]/,
  "bulk must not authorize only the first action id",
);

console.log("✓ Bulk client-action API rejects mixed-client unauthorized batches");
console.log("✓ BDS blocked from operator client pages and client-command APIs");
console.log("✓ Coordinator retains onboarding assist page");
console.log("✓ Loaders and routes wired for operator client access gates");
console.log("\nverify:staff-operator-client-access — OK\n");
