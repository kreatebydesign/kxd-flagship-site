/**
 * Staff documents Release A — unit checks (no DB).
 *   npx tsx scripts/verify-staff-documents.ts
 */
import assert from "node:assert/strict";
import { buildStaffAcknowledgment } from "../lib/staff-documents/acknowledgment.ts";
import { hashStaffDocumentBody, hashStaffDocumentPdfBytes } from "../lib/staff-documents/hash.ts";
import { verifyStaffDocumentIntegrity } from "../lib/staff-documents/integrity.ts";
import {
  assertReleaseAStaffDocumentKind,
  assertStaffDocumentAcknowledgeable,
  assertTemplateApprovedForAssignment,
} from "../lib/staff-documents/validate.ts";
import { assertStaffDocumentRowAccess, staffMayManageDocuments } from "../lib/staff-documents/access.ts";
import { resolveAcknowledgmentClaimAfterUpdate } from "../lib/staff-documents/acknowledge-claim-outcomes.ts";
import {
  resolveStaffDocumentsListPageAccess,
  resolveStaffDocumentsOversightPageAccess,
} from "../lib/staff-documents/page-access.ts";
import type { StaffActor } from "../lib/staff/types";

console.log("\nverify:staff-documents\n");

assert.throws(() => assertReleaseAStaffDocumentKind("employment-agreement"));
assert.throws(() => assertReleaseAStaffDocumentKind("confidentiality-nda"));
assert.equal(assertReleaseAStaffDocumentKind("policy-acknowledgment"), "policy-acknowledgment");

assert.throws(() => assertTemplateApprovedForAssignment("draft"));

const body = "Sample policy body";
const hash = hashStaffDocumentBody(body);
assert.equal(hashStaffDocumentBody(body), hash);

const pdf = Buffer.from("test-pdf-bytes");
const pdfHash = hashStaffDocumentPdfBytes(pdf);
assert.equal(verifyStaffDocumentIntegrity({ buffer: pdf, contentHash: pdfHash }).ok, true);
assert.equal(
  verifyStaffDocumentIntegrity({ buffer: pdf, contentHash: "wrong" }).ok,
  false,
);

const ack = buildStaffAcknowledgment({
  legalName: "Tyler Example",
  email: "tyler@example.com",
  typedAcknowledgment: "Tyler Example",
  electronicRecordsConsent: true,
  reviewedConfirmed: true,
  documentContentHash: hash,
});

assert.equal(ack.legalName, "Tyler Example");
assert.ok(ack.acknowledgmentHash.length > 10);

const ack2 = buildStaffAcknowledgment({
  legalName: "Tyler Example",
  email: "tyler@example.com",
  typedAcknowledgment: "Tyler Example",
  electronicRecordsConsent: true,
  reviewedConfirmed: true,
  documentContentHash: hash,
});
assert.notEqual(ack.acknowledgedAt, ack2.acknowledgedAt);

const staffActor: StaffActor = {
  userId: 2,
  email: "staff@example.com",
  displayName: "Staff",
  role: "editor",
  staffRole: "operations_coordinator",
  onboardingCompletedAt: "2026-01-01T00:00:00.000Z",
};

assert.throws(() => assertStaffDocumentRowAccess(staffActor, 99));

assert.throws(() => assertStaffDocumentAcknowledgeable("revoked"));
assert.throws(() => assertStaffDocumentAcknowledgeable("draft"));
assert.doesNotThrow(() => assertStaffDocumentAcknowledgeable("assigned"));
assert.doesNotThrow(() => assertStaffDocumentAcknowledgeable("acknowledged"));

assert.equal(staffMayManageDocuments(staffActor), false);
assert.equal(
  staffMayManageDocuments({ ...staffActor, role: "admin", staffRole: "none" }),
  true,
);

assert.equal(resolveAcknowledgmentClaimAfterUpdate({ rowsUpdated: 1, hasAcknowledgment: false }), "claimed");
assert.equal(
  resolveAcknowledgmentClaimAfterUpdate({
    rowsUpdated: 0,
    statusAfter: "acknowledged",
    hasAcknowledgment: true,
  }),
  "already_acknowledged",
);
assert.equal(
  resolveAcknowledgmentClaimAfterUpdate({
    rowsUpdated: 0,
    statusAfter: "assigned",
    hasAcknowledgment: false,
  }),
  "not_claimable",
);
assert.equal(
  resolveAcknowledgmentClaimAfterUpdate({
    rowsUpdated: 0,
    statusAfter: null,
    hasAcknowledgment: false,
  }),
  "not_found",
);

const mattAdmin: StaffActor = {
  ...staffActor,
  userId: 1,
  email: "matt@kreatebydesign.com",
  role: "admin",
  staffRole: "none",
};
const mattList = resolveStaffDocumentsListPageAccess(mattAdmin);
assert.equal(mattList.kind, "redirect");
assert.equal(resolveStaffDocumentsListPageAccess(staffActor).kind, "render");
assert.equal(resolveStaffDocumentsOversightPageAccess(mattAdmin).kind, "render");
assert.equal(resolveStaffDocumentsOversightPageAccess(staffActor).kind, "redirect");

console.log("  ✓ staff documents release A checks passed\n");
