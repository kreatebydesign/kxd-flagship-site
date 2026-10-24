/**
 * Operations route-group guards — staff documents + studio fail-closed paths.
 *   npm run verify:operations-layout-return-path
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { trustedLayoutReturnPath } from "../lib/admin/trusted-layout-return-path.ts";
import { isStaffAllowedPagePath } from "../lib/staff/permissions.ts";
import {
  resolveStudioOperationsGuardPath,
  STUDIO_OPERATIONS_GUARD_FALLBACK,
} from "../lib/staff/studio-operations-path.ts";
import type { StaffActor } from "../lib/staff/types";

const root = path.resolve(import.meta.dirname, "..");
const fallback = "/admin/operations";

function read(rel: string): string {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

const tyler: StaffActor = {
  userId: 3,
  email: "tyler@kreatebydesign.com",
  displayName: "Tyler Rethwill",
  role: "editor",
  staffRole: "business_development_specialist",
  onboardingCompletedAt: "2026-01-01T00:00:00.000Z",
};

console.log("\nOperations layout return path — verify:operations-layout-return-path\n");

assert.equal(
  trustedLayoutReturnPath(
    "/admin/operations/staff/documents",
    fallback,
    "/admin/operations",
  ),
  "/admin/operations/staff/documents",
);
assert.equal(
  trustedLayoutReturnPath(
    "/admin/operations/staff/documents/42",
    fallback,
    "/admin/operations",
  ),
  "/admin/operations/staff/documents/42",
);
assert.equal(trustedLayoutReturnPath("", fallback, "/admin/operations"), fallback);
assert.equal(
  trustedLayoutReturnPath("//evil.example/phish", fallback, "/admin/operations"),
  fallback,
);

// SEC-001 — missing headers fail closed on studio (founder) routes
assert.equal(resolveStudioOperationsGuardPath(""), STUDIO_OPERATIONS_GUARD_FALLBACK);
assert.equal(
  resolveStudioOperationsGuardPath("   "),
  STUDIO_OPERATIONS_GUARD_FALLBACK,
);
assert.equal(
  isStaffAllowedPagePath(resolveStudioOperationsGuardPath(""), tyler),
  false,
);
assert.equal(
  resolveStudioOperationsGuardPath("/admin/operations/accounts"),
  "/admin/operations/accounts",
);
assert.equal(
  isStaffAllowedPagePath(resolveStudioOperationsGuardPath("/admin/operations/accounts"), tyler),
  false,
);

assert.equal(
  isStaffAllowedPagePath("/admin/operations/staff/documents", tyler),
  true,
);

const opsLayout = read("app/admin/operations/layout.tsx");
assert.match(opsLayout, /requirePayloadAdminPage/);
assert.doesNotMatch(opsLayout, /requireStaffAwarePage/);

const studioLayout = read("app/admin/operations/(studio)/layout.tsx");
assert.match(studioLayout, /requireStaffAwarePage/);
assert.match(studioLayout, /resolveStudioOperationsGuardPath/);

assert.ok(
  fs.existsSync(path.join(root, "app/admin/operations/(studio)/accounts/page.tsx")),
);
assert.ok(
  fs.existsSync(path.join(root, "app/admin/operations/staff/documents/page.tsx")),
);
assert.ok(
  !fs.existsSync(path.join(root, "app/admin/operations/accounts/page.tsx")),
);

const staffLayout = read("app/admin/operations/staff/layout.tsx");
assert.match(staffLayout, /trustedLayoutReturnPath/);
assert.match(staffLayout, /requireStaffAwarePage\(returnPath\)/);

console.log("verify:operations-layout-return-path: OK\n");
