/**
 * Focused permission verification for private junior shift correction audits
 * and admin mutation gatekeeping.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

import { isPayloadAdminUser, studioOperatorFieldAccess } from "../payload/access/index.ts";
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

function canUpdateAs(user: TestUser | null): boolean {
  const updateAccess = JuniorCreatorShifts.access?.update;
  assert.equal(typeof updateAccess, "function", "shift updates must be access-controlled");
  return updateAccess!({
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

assert.equal(JuniorCreatorShifts.access?.update, isPayloadAdminUser);
assert.equal(canUpdateAs(null), false, "anonymous updates must be denied");
assert.equal(
  canUpdateAs({ collection: "junior-creator-users", id: 1 }),
  false,
  "junior creator updates must be denied",
);
assert.equal(
  canUpdateAs({ collection: "users", id: 4, role: "admin" }),
  true,
  "admin updates must be allowed",
);

const route = readFileSync(
  path.join(process.cwd(), "app/api/admin/junior-creator-shifts/route.ts"),
  "utf8",
);
assert.match(route, /requirePayloadAdminApi/);
assert.match(route, /withJuniorShiftCorrectionTransaction/);

console.log("Junior shift correction audit permission verification passed.");
