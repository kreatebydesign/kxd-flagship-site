/**
 * Staff review-inbox attachment authorization — validation + route wiring.
 * Run: npm run verify:staff-review-attachment-auth
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  STAFF_REVIEW_MEDIA_NOT_FOUND_BODY,
  validateStaffClientReviewMediaAccess,
} from "../lib/staff/client-review-media-access-validation";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

console.log("\nStaff review attachment auth — verify:staff-review-attachment-auth\n");

// Coordinator / operator — no assignment scope
assert.equal(
  validateStaffClientReviewMediaAccess({
    usesAssignmentScope: false,
    allowedClientIds: [],
    mediaClientId: 99,
  }),
  true,
);

// BDS — no assignments
assert.equal(
  validateStaffClientReviewMediaAccess({
    usesAssignmentScope: true,
    allowedClientIds: [],
    mediaClientId: 5,
  }),
  false,
);

// BDS — assigned client
assert.equal(
  validateStaffClientReviewMediaAccess({
    usesAssignmentScope: true,
    allowedClientIds: [5, 6],
    mediaClientId: 5,
  }),
  true,
);

// BDS — unassigned client
assert.equal(
  validateStaffClientReviewMediaAccess({
    usesAssignmentScope: true,
    allowedClientIds: [5],
    mediaClientId: 99,
  }),
  false,
);

// Missing / invalid client on media row
assert.equal(
  validateStaffClientReviewMediaAccess({
    usesAssignmentScope: true,
    allowedClientIds: [5],
    mediaClientId: null,
  }),
  false,
);

assert.equal(
  validateStaffClientReviewMediaAccess({
    usesAssignmentScope: true,
    allowedClientIds: [5],
    mediaClientId: undefined,
  }),
  false,
);

assert.deepEqual(STAFF_REVIEW_MEDIA_NOT_FOUND_BODY, {
  ok: false,
  message: "Not found.",
});

const attachmentRoute = readFileSync(
  path.join(repoRoot, "app/api/admin/review-inbox/attachments/[id]/route.ts"),
  "utf8",
);
assert.match(attachmentRoute, /denyUnlessStaffClientReviewMedia/);
assert.ok(
  attachmentRoute.indexOf("denyUnlessStaffClientReviewMedia") <
    attachmentRoute.indexOf("streamClientReviewAttachment"),
  "attachment auth runs before streaming",
);
assert.match(attachmentRoute, /staffReviewMediaNotFoundResponse/);
assert.doesNotMatch(
  attachmentRoute,
  /Staff permission denied.*attachment/i,
  "no explicit permission denial in attachment route",
);

console.log("✓ All staff review attachment auth checks passed.\n");
