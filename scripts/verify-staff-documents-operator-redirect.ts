/**
 * Staff documents operator navigation — redirect matrix (no DB).
 *   npm run verify:staff-documents-operator-redirect
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { trustedLayoutReturnPath } from "../lib/admin/trusted-layout-return-path.ts";
import {
  resolveStaffDocumentsListPageAccess,
  resolveStaffDocumentsOversightPageAccess,
} from "../lib/staff-documents/page-access.ts";
import { operatorStaffDocumentsPath } from "../lib/staff-documents/access.ts";
import { resolveStaffAwarePathname } from "../lib/staff/aware-pathname.ts";
import type { StaffActor } from "../lib/staff/types";

const root = path.resolve(import.meta.dirname, "..");

function read(rel: string): string {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

const matt: StaffActor = {
  userId: 1,
  email: "matt@kreatebydesign.com",
  displayName: "Matt Lunger",
  role: "admin",
  staffRole: "none",
  onboardingCompletedAt: "2026-01-01T00:00:00.000Z",
};

const tyler: StaffActor = {
  userId: 3,
  email: "tyler@kreatebydesign.com",
  displayName: "Tyler Rethwill",
  role: "editor",
  staffRole: "business_development_specialist",
  onboardingCompletedAt: "2026-01-01T00:00:00.000Z",
};

const oversight = operatorStaffDocumentsPath();
const template4 = `${oversight}/templates/4`;

console.log("\nverify:staff-documents-operator-redirect\n");

// Deep-link login return path must survive operations layout (not collapse to /admin/operations → Today).
assert.equal(
  trustedLayoutReturnPath(oversight, "/admin/operations", "/admin/operations"),
  oversight,
);
assert.equal(
  trustedLayoutReturnPath(template4, "/admin/operations", "/admin/operations"),
  template4,
);

// Canonical returnPath wins over stale request headers during staff-aware checks.
assert.equal(
  resolveStaffAwarePathname("/admin/operations/today", oversight),
  oversight,
);

const mattOversight = resolveStaffDocumentsOversightPageAccess(matt);
assert.equal(mattOversight.kind, "render");

const mattList = resolveStaffDocumentsListPageAccess(matt);
assert.equal(mattList.kind, "redirect");
if (mattList.kind === "redirect") {
  assert.equal(mattList.href, oversight);
  assert.notEqual(mattList.href, "/admin/operations/today");
}

const tylerOversight = resolveStaffDocumentsOversightPageAccess(tyler);
assert.equal(tylerOversight.kind, "redirect");
if (tylerOversight.kind === "redirect") {
  assert.equal(tylerOversight.href, "/admin/operations/staff");
}

const guard = read("lib/staff/guard.ts");
assert.doesNotMatch(guard, /h\.get\("next-url"\)/);

console.log("  ✓ staff documents operator redirect checks passed\n");
