/**
 * Staff documents page access matrix (no DB).
 *   npx tsx scripts/verify-staff-documents-page-access.ts
 */
import assert from "node:assert/strict";
import {
  resolveStaffDocumentsListPageAccess,
  resolveStaffDocumentsOversightPageAccess,
} from "../lib/staff-documents/page-access.ts";
import { isStaffAllowedPagePath } from "../lib/staff/permissions.ts";
import type { StaffActor } from "../lib/staff/types";

const tyler: StaffActor = {
  userId: 3,
  email: "tyler@kreatebydesign.com",
  displayName: "Tyler Rethwill",
  role: "editor",
  staffRole: "business_development_specialist",
  onboardingCompletedAt: "2026-01-01T00:00:00.000Z",
};

const matt: StaffActor = {
  userId: 1,
  email: "matt@kreatebydesign.com",
  displayName: "Matt Lunger",
  role: "admin",
  staffRole: "none",
  onboardingCompletedAt: "2026-01-01T00:00:00.000Z",
};

const coordinator: StaffActor = {
  userId: 2,
  email: "heather@kreatebydesign.com",
  displayName: "Heather",
  role: "editor",
  staffRole: "operations_coordinator",
  onboardingCompletedAt: "2026-01-01T00:00:00.000Z",
};

console.log("\nverify:staff-documents-page-access\n");

assert.equal(resolveStaffDocumentsListPageAccess(tyler).kind, "render");
assert.equal(
  isStaffAllowedPagePath("/admin/operations/staff/documents", tyler),
  true,
);
assert.equal(
  isStaffAllowedPagePath("/admin/operations/staff/documents/12", tyler),
  true,
);
assert.equal(
  isStaffAllowedPagePath("/admin/operations/staff/oversight/documents", tyler),
  true,
);
assert.equal(
  isStaffAllowedPagePath("/admin/operations/today", tyler),
  false,
);

const coordinatorList = resolveStaffDocumentsListPageAccess(coordinator);
assert.equal(coordinatorList.kind, "render");

const mattList = resolveStaffDocumentsListPageAccess(matt);
assert.equal(mattList.kind, "redirect");
if (mattList.kind === "redirect") {
  assert.equal(
    mattList.href,
    "/admin/operations/staff/oversight/documents",
  );
}

assert.equal(resolveStaffDocumentsOversightPageAccess(matt).kind, "render");
assert.equal(resolveStaffDocumentsOversightPageAccess(tyler).kind, "redirect");
assert.equal(resolveStaffDocumentsOversightPageAccess(coordinator).kind, "redirect");

const tylerOversight = resolveStaffDocumentsOversightPageAccess(tyler);
if (tylerOversight.kind === "redirect") {
  assert.equal(tylerOversight.href, "/admin/operations/staff");
}

console.log("  ✓ staff documents page access checks passed\n");
