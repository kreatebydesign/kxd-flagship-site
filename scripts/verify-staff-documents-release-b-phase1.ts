/**
 * Staff documents Release B Phase 1 — foundation checks (no DB).
 *   npx tsx scripts/verify-staff-documents-release-b-phase1.ts
 */
import assert from "node:assert/strict";
import { buildStaffSignatureEvidence } from "../lib/staff-documents/signature.ts";
import { hashStaffDocumentBody } from "../lib/staff-documents/hash.ts";
import {
  assertImmutableStaffDocumentPatch,
  assertStaffDocumentStatusTransition,
  documentExpiredAtSigningTime,
} from "../lib/staff-documents/state-machine.ts";
import {
  defaultSigningModeForKind,
  parseStaffDocumentKind,
  resolveSigningModeForTemplate,
  assertStaffDocumentDeclinable,
  assertStaffDocumentEmployeeSignable,
  assertStaffDocumentRevocable,
} from "../lib/staff-documents/validate.ts";
import { resolveEmployeeSignClaimAfterUpdate } from "../lib/staff-documents/employee-sign-claim-outcomes.ts";
import { resolveOperatorCountersignClaimAfterUpdate } from "../lib/staff-documents/operator-countersign-claim-outcomes.ts";
import { resolveExecutionFinalizeAfterUpdate } from "../lib/staff-documents/execution-finalize-outcomes.ts";
import {
  staffMayCountersignDocuments,
  staffMayManageDocuments,
} from "../lib/staff-documents/access.ts";
import type { StaffActor } from "../lib/staff/types";

console.log("\nverify:staff-documents-release-b-phase1\n");

assert.equal(parseStaffDocumentKind("employment-agreement"), "employment-agreement");
assert.equal(defaultSigningModeForKind("employment-agreement"), "dual-signature");
assert.equal(defaultSigningModeForKind("staff-policy"), "acknowledgment");
assert.equal(
  resolveSigningModeForTemplate({ kind: "confidentiality-nda", signingMode: null }),
  "dual-signature",
);
assert.throws(() =>
  resolveSigningModeForTemplate({ kind: "employment-agreement", signingMode: "acknowledgment" }),
);

assert.throws(() =>
  assertStaffDocumentStatusTransition({
    signingMode: "acknowledgment",
    from: "assigned",
    to: "executed",
  }),
);
assert.doesNotThrow(() =>
  assertStaffDocumentStatusTransition({
    signingMode: "dual-signature",
    from: "assigned",
    to: "awaiting-operator-signature",
  }),
);
assert.doesNotThrow(() =>
  assertStaffDocumentStatusTransition({
    signingMode: "dual-signature",
    from: "awaiting-operator-signature",
    to: "executing",
  }),
);
assert.doesNotThrow(() =>
  assertStaffDocumentStatusTransition({
    signingMode: "dual-signature",
    from: "executing",
    to: "executed",
  }),
);

assert.throws(() =>
  assertImmutableStaffDocumentPatch(
    { bodySnapshot: "a", templateContentHash: "h" },
    { bodySnapshot: "b" },
  ),
);
assert.throws(() =>
  assertImmutableStaffDocumentPatch(
    { acknowledgment: { hash: "a" } },
    { acknowledgment: { hash: "b" } },
  ),
);

const body = "Agreement body v1";
const docHash = hashStaffDocumentBody(body);

const employee = buildStaffSignatureEvidence({
  legalName: "Tyler Example",
  title: "Designer",
  entityName: "Tyler Example",
  email: "tyler@example.com",
  typedAcknowledgment: "Tyler Example",
  authorityConfirmed: true,
  electronicRecordsConsent: true,
  actorRole: "staff-employee",
  documentContentHash: docHash,
});

const operator = buildStaffSignatureEvidence({
  legalName: "Matt Lunger",
  title: "Founder",
  entityName: "Kreate by Design LLC",
  email: "matt@kreatebydesign.com",
  typedAcknowledgment: "Matt Lunger",
  authorityConfirmed: true,
  electronicRecordsConsent: true,
  actorRole: "kxd-employer-representative",
  documentContentHash: docHash,
  priorSignatureHash: employee.signatureHash,
});

assert.equal(employee.actorRole, "staff-employee");
assert.notEqual(employee.signatureHash, operator.signatureHash);
assert.throws(() =>
  buildStaffSignatureEvidence({
    legalName: "Matt Lunger",
    title: "Founder",
    entityName: "Kreate by Design LLC",
    email: "matt@kreatebydesign.com",
    typedAcknowledgment: "Matt Lunger",
    authorityConfirmed: true,
    electronicRecordsConsent: true,
    actorRole: "kxd-employer-representative",
    documentContentHash: docHash,
  }),
);

assert.doesNotThrow(() =>
  assertStaffDocumentEmployeeSignable({
    status: "assigned",
    signingMode: "dual-signature",
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
  }),
);
assert.throws(() =>
  assertStaffDocumentEmployeeSignable({
    status: "assigned",
    signingMode: "dual-signature",
    expiresAt: new Date(Date.now() - 60_000).toISOString(),
  }),
);
assert.equal(documentExpiredAtSigningTime(new Date(Date.now() - 1000).toISOString()), true);

assert.doesNotThrow(() =>
  assertStaffDocumentDeclinable({ status: "assigned", signingMode: "dual-signature" }),
);
assert.doesNotThrow(() =>
  assertStaffDocumentRevocable({
    status: "awaiting-operator-signature",
    signingMode: "dual-signature",
  }),
);

assert.equal(resolveEmployeeSignClaimAfterUpdate({ rowsUpdated: 1, hasEmployeeSignature: true }).kind, "claimed");
assert.equal(
  resolveEmployeeSignClaimAfterUpdate({
    rowsUpdated: 0,
    statusAfter: "awaiting-operator-signature",
    hasEmployeeSignature: true,
  }).kind,
  "already_signed",
);
assert.equal(
  resolveOperatorCountersignClaimAfterUpdate({
    rowsUpdated: 0,
    statusAfter: "executing",
    hasOperatorSignature: true,
  }).kind,
  "already_executing",
);
assert.equal(
  resolveExecutionFinalizeAfterUpdate({ rowsUpdated: 0, statusAfter: "executed" }).kind,
  "already_executed",
);

const staffActor: StaffActor = {
  userId: 2,
  email: "staff@example.com",
  displayName: "Staff",
  role: "editor",
  staffRole: "operations_coordinator",
  onboardingCompletedAt: "2026-01-01T00:00:00.000Z",
};
assert.equal(staffMayCountersignDocuments(staffActor), false);

const mattAdmin: StaffActor = {
  ...staffActor,
  userId: 1,
  email: "matt@kreatebydesign.com",
  role: "admin",
  staffRole: "none",
};
assert.equal(staffMayManageDocuments(mattAdmin), true);
assert.equal(staffMayCountersignDocuments(mattAdmin), true);

console.log("  ✓ staff documents release B phase 1 checks passed\n");
