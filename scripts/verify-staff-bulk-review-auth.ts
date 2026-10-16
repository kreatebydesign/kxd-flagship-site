/**
 * Staff bulk review-inbox authorization — pure validation tests.
 * Run: npm run verify:staff-bulk-review-auth
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateBulkClientRequestAccess } from "../lib/staff/bulk-client-request-validation";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

console.log("\nStaff bulk review auth — verify:staff-bulk-review-auth\n");

// Coordinator / operator — no assignment scope
assert.equal(
  validateBulkClientRequestAccess({
    usesAssignmentScope: false,
    allowedClientIds: [],
    requestedIds: [1, 2, 999],
    resolvedClients: new Map([[1, 1]]),
  }),
  true,
);

// BDS — empty assignments
assert.equal(
  validateBulkClientRequestAccess({
    usesAssignmentScope: true,
    allowedClientIds: [],
    requestedIds: [10],
    resolvedClients: new Map([[10, 5]]),
  }),
  false,
);

// BDS — authorized client
assert.equal(
  validateBulkClientRequestAccess({
    usesAssignmentScope: true,
    allowedClientIds: [5, 6],
    requestedIds: [10, 11],
    resolvedClients: new Map([[10, 5], [11, 6]]),
  }),
  true,
);

// Mixed authorized / unauthorized — reject all
assert.equal(
  validateBulkClientRequestAccess({
    usesAssignmentScope: true,
    allowedClientIds: [5],
    requestedIds: [10, 11],
    resolvedClients: new Map([[10, 5], [11, 99]]),
  }),
  false,
);

// Nonexistent id (missing from resolved map)
assert.equal(
  validateBulkClientRequestAccess({
    usesAssignmentScope: true,
    allowedClientIds: [5],
    requestedIds: [10, 404],
    resolvedClients: new Map([[10, 5]]),
  }),
  false,
);

// Duplicate ids — deduped in server; validation uses unique set size vs map
assert.equal(
  validateBulkClientRequestAccess({
    usesAssignmentScope: true,
    allowedClientIds: [5],
    requestedIds: [10, 10, 10],
    resolvedClients: new Map([[10, 5]]),
  }),
  true,
);

// Empty request — allowed (normalizeBulkCompleteIds handles API empty separately)
assert.equal(
  validateBulkClientRequestAccess({
    usesAssignmentScope: true,
    allowedClientIds: [5],
    requestedIds: [],
    resolvedClients: new Map(),
  }),
  true,
);

const bulkRoute = readFileSync(
  path.join(repoRoot, "app/api/admin/review-inbox/bulk-complete/route.ts"),
  "utf8",
);
const reconcileRoute = readFileSync(
  path.join(repoRoot, "app/api/admin/review-inbox/reconcile-linked-work/route.ts"),
  "utf8",
);
assert.match(bulkRoute, /denyUnlessStaffBulkClientRequests/);
assert.match(reconcileRoute, /denyUnlessStaffBulkClientRequests/);
assert.ok(
  bulkRoute.indexOf("denyUnlessStaffBulkClientRequests") <
    bulkRoute.indexOf("bulkCompleteReviewRequests"),
  "bulk auth runs before mutation",
);
assert.ok(
  bulkRoute.indexOf("denyUnlessStaffBulkClientRequests") <
    bulkRoute.indexOf("previewLinkedWorkForReviews"),
  "bulk auth runs before preview",
);

console.log("✓ All staff bulk review auth checks passed.\n");
