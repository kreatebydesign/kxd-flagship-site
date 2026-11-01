/**
 * Navigation polish — Staff Oversight and My Time & Pay discoverability (static).
 * Run: npm run verify:navigation-staff-discoverability
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const opsNav = readFileSync(
  path.join(root, "components/admin/operations/shared/operations-nav.ts"),
  "utf8",
);
const shell = readFileSync(
  path.join(root, "components/admin/operations/shared/OperationsShell.tsx"),
  "utf8",
);
const permissions = readFileSync(path.join(root, "lib/staff/permissions.ts"), "utf8");

assert.match(
  opsNav,
  /label: "Staff Oversight"[\s\S]*href: "\/admin\/operations\/staff\/oversight"/,
);
assert.match(
  opsNav,
  /label: "Payroll review"[\s\S]*#payroll-review"/,
);
assert.match(shell, /label: "My Time & Pay"/);
assert.match(permissions, /STAFF_OVERSIGHT_PATH = "\/admin\/operations\/staff\/oversight"/);
assert.match(opsNav, /MY_TIME_PAY_NAV_ITEM[\s\S]*\/admin\/operations\/staff\/my-time-pay"/);

console.log("verify:navigation-staff-discoverability: OK");
