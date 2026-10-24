/**
 * PR #110 / Staff Documents V1 — security regression gate (no DB).
 *   npm run verify:staff-documents-security-gate
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { buildStaffAcknowledgment } from "../lib/staff-documents/acknowledgment.ts";
import {
  resolveStaffDocumentsListPageAccess,
  resolveStaffDocumentsOversightPageAccess,
} from "../lib/staff-documents/page-access.ts";
import { assertStaffDocumentRowAccess } from "../lib/staff-documents/access.ts";
import { trustedLayoutReturnPath } from "../lib/admin/trusted-layout-return-path.ts";
import { resolveStaffAwarePathname } from "../lib/staff/aware-pathname.ts";
import { isStaffAllowedPagePath } from "../lib/staff/permissions.ts";
import { resolveStudioOperationsGuardPath } from "../lib/staff/studio-operations-path.ts";
import type { StaffActor } from "../lib/staff/types";

const root = path.resolve(import.meta.dirname, "..");

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

const matt: StaffActor = {
  userId: 1,
  email: "matt@kreatebydesign.com",
  displayName: "Matt Lunger",
  role: "admin",
  staffRole: "none",
  onboardingCompletedAt: "2026-01-01T00:00:00.000Z",
};

console.log("\nverify:staff-documents-security-gate\n");

// ── 1. Layout pathname trust ───────────────────────────────────────────────
assert.equal(
  resolveStaffAwarePathname(
    "/admin/operations/staff/documents",
    "/admin/operations/today",
  ),
  "/admin/operations/today",
);
assert.equal(
  resolveStaffAwarePathname(
    "/admin/operations/staff/oversight/documents",
    "/admin/operations/staff/oversight/documents",
  ),
  "/admin/operations/staff/oversight/documents",
);
assert.equal(
  trustedLayoutReturnPath(
    "https://evil.example/admin/operations/staff",
    "/admin/operations",
    "/admin/operations",
  ),
  "/admin/operations",
);
assert.equal(
  trustedLayoutReturnPath(
    "/admin/collections/staff-documents",
    "/admin/operations",
    "/admin/operations",
  ),
  "/admin/operations",
);

const middleware = read("middleware.ts");
assert.match(middleware, /requestHeaders\.set\("x-kxd-pathname", pathname\)/);

const opsLayout = read("app/admin/operations/layout.tsx");
assert.match(opsLayout, /requirePayloadAdminPage/);
assert.doesNotMatch(opsLayout, /requireStaffAwarePage/);

const studioLayout = read("app/admin/operations/(studio)/layout.tsx");
assert.match(studioLayout, /requireStaffAwarePage/);
assert.match(studioLayout, /resolveStudioOperationsGuardPath/);

// SEC-001 — studio fail-closed when pathname headers missing
assert.equal(
  isStaffAllowedPagePath(resolveStudioOperationsGuardPath(""), tyler),
  false,
);
assert.equal(
  isStaffAllowedPagePath(
    resolveStudioOperationsGuardPath("/admin/operations/money-moves"),
    tyler,
  ),
  false,
);

const guard = read("lib/staff/guard.ts");
const awarePath = read("lib/staff/aware-pathname.ts");
assert.match(guard, /resolveStaffAwarePathname/);
assert.match(awarePath, /returnPath\?\.trim\(\)/);

// ── 2. Restricted staff — sensitive operations routes denied ───────────────
const deniedForTyler = [
  "/admin/operations/today",
  "/admin/operations/accounts",
  "/admin/operations/money-moves",
  "/admin/operations/commercial-agreements",
  "/admin/operations/executive",
  "/admin/operations/founder",
  "/admin/collections/staff-documents",
  "/admin/globals",
];
for (const route of deniedForTyler) {
  assert.equal(
    isStaffAllowedPagePath(route, tyler),
    false,
    `expected deny: ${route}`,
  );
}

assert.equal(
  isStaffAllowedPagePath("/admin/operations/staff/documents", tyler),
  true,
);
assert.equal(
  isStaffAllowedPagePath("/admin/operations/staff/documents/99", tyler),
  true,
);

// Staff prefix allowlist permits /staff/oversight URLs; document oversight pages
// must still fail closed in page-access (second layer).
assert.equal(
  isStaffAllowedPagePath("/admin/operations/staff/oversight/documents", tyler),
  true,
);

// ── 3. Document page access matrix (oversight / list) ──────────────────────
assert.equal(resolveStaffDocumentsOversightPageAccess(tyler).kind, "redirect");
assert.equal(resolveStaffDocumentsOversightPageAccess(matt).kind, "render");
assert.equal(resolveStaffDocumentsListPageAccess(tyler).kind, "render");
const mattList = resolveStaffDocumentsListPageAccess(matt);
assert.equal(mattList.kind, "redirect");

// ── 4. Row-level identity (another employee's document) ────────────────────
assert.throws(() => assertStaffDocumentRowAccess(tyler, 99));

// ── 5. Acknowledgment requires explicit user consent (no silent ack) ─────────
assert.throws(() =>
  buildStaffAcknowledgment({
    legalName: "Tyler Example",
    email: "tyler@example.com",
    typedAcknowledgment: "Tyler Example",
    electronicRecordsConsent: false,
    reviewedConfirmed: true,
    documentContentHash: "abc",
  }),
);
assert.throws(() =>
  buildStaffAcknowledgment({
    legalName: "Tyler Example",
    email: "tyler@example.com",
    typedAcknowledgment: "Tyler Example",
    electronicRecordsConsent: true,
    reviewedConfirmed: false,
    documentContentHash: "abc",
  }),
);

// ── 6. API routes gate on capabilities (static) ────────────────────────────
const ackRoute = read(
  "app/api/admin/staff/documents/[documentId]/acknowledge/route.ts",
);
const signRoute = read("app/api/admin/staff/documents/[documentId]/sign/route.ts");
const assignRoute = read("app/api/admin/staff/documents/operator/assign/route.ts");
assert.match(ackRoute, /requireStaffCapabilityApi\("staff\.documents\.acknowledge"\)/);
assert.match(signRoute, /requireStaffCapabilityApi\("staff\.documents\.sign"\)/);
assert.match(assignRoute, /requireStaffCapabilityApi\("admin\.staff-documents\.manage"\)/);

const detailPage = read("app/admin/operations/staff/documents/[documentId]/page.tsx");
assert.match(detailPage, /getStaffDocumentDetail/);
assert.match(detailPage, /resolveStaffDocumentsListPageAccess/);

console.log("  ✓ staff documents security gate passed\n");
