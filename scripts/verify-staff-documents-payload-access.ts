/**
 * Staff HR Payload access — studio operators read-only; mutations denied.
 *   npx tsx scripts/verify-staff-documents-payload-access.ts
 */
import assert from "node:assert/strict";
import {
  denyAll,
  isStudioPayloadOperator,
} from "../payload/access/index.ts";
import { staffHrDocumentReadAccess } from "../payload/access/staff-hr-documents.ts";

console.log("\nverify:staff-documents-payload-access\n");

const adminUser = { collection: "users", role: "admin", id: 1 };
const editorUser = { collection: "users", role: "editor", id: 2 };
const portalUser = { collection: "portal-users", id: 3 };

assert.equal(isStudioPayloadOperator(adminUser as never), true);
assert.equal(isStudioPayloadOperator(editorUser as never), false);
assert.equal(isStudioPayloadOperator(portalUser as never), false);

assert.equal(
  staffHrDocumentReadAccess({ req: { user: adminUser } } as never),
  true,
);
assert.equal(
  staffHrDocumentReadAccess({ req: { user: editorUser } } as never),
  false,
);
assert.equal(denyAll({ req: { user: adminUser } } as never), false);

console.log("  ✓ staff documents payload access checks passed\n");
