/**
 * Focused permission verification for private junior shift correction audits.
 */
import assert from "node:assert/strict";

import { studioOperatorFieldAccess } from "../payload/access/index.ts";
import { JuniorCreatorShifts } from "../payload/collections/JuniorCreatorShifts.ts";

type TestUser = {
  collection: string;
  id: number;
  role?: string;
  staffRole?: string;
};

function canReadAs(user: TestUser | null): boolean {
  return studioOperatorFieldAccess({
    req: { user },
  } as never) === true;
}

const correctionAuditField = JuniorCreatorShifts.fields.find(
  (field) => "name" in field && field.name === "correctionAudit",
);
assert.ok(correctionAuditField && "access" in correctionAuditField);
assert.equal(
  correctionAuditField.access?.read,
  studioOperatorFieldAccess,
  "correctionAudit must use the admin-only field read gate",
);

assert.equal(canReadAs(null), false, "anonymous reads must be denied");
assert.equal(
  canReadAs({ collection: "junior-creator-users", id: 1 }),
  false,
  "junior creator reads must be denied",
);
assert.equal(
  canReadAs({ collection: "portal-users", id: 2 }),
  false,
  "portal user reads must be denied",
);
assert.equal(
  canReadAs({
    collection: "users",
    id: 3,
    role: "staff",
    staffRole: "operations_coordinator",
  }),
  false,
  "restricted staff reads must be denied",
);
assert.equal(
  canReadAs({ collection: "users", id: 4, role: "admin" }),
  true,
  "authenticated Payload admins must be allowed",
);

console.log("Junior shift correction audit permission verification passed.");
