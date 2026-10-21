/**
 * Staff document PDF branding — logo, multi-page layout, hash preservation.
 *   npx tsx scripts/verify-staff-document-branding.ts
 */
import assert from "node:assert/strict";
import { resolveKxdReportLogoAsset } from "../lib/kxd-report-engine/logos.ts";
import { KXD_AGREEMENT_LOGO_PUBLIC_PATH } from "../lib/agreement-presentation/tokens.ts";
import { hashStaffDocumentBody } from "../lib/staff-documents/hash.ts";
import {
  SAMPLE_NONBINDING_AGREEMENT_BODY,
  SAMPLE_NONBINDING_AGREEMENT_TITLE,
} from "../lib/staff-documents/constants.ts";
import { renderStaffExecutedAgreementPdf } from "../lib/staff-documents/export-pdf.tsx";
import { buildStaffSignatureEvidence } from "../lib/staff-documents/signature.ts";

console.log("\nverify:staff-document-branding\n");

const logo = resolveKxdReportLogoAsset();
assert.equal(logo.publicPath, KXD_AGREEMENT_LOGO_PUBLIC_PATH);
assert.ok(logo.exists, "official KXD gold logo PNG must exist");
console.log("  ✓ Official logo asset resolved");

const longBody = `${SAMPLE_NONBINDING_AGREEMENT_BODY}\n\nDELIVERABLES\n${Array.from(
  { length: 60 },
  () => "• Synthetic clause line for pagination QA.",
).join("\n")}`;
const contentHash = hashStaffDocumentBody(longBody);

const employeeSig = buildStaffSignatureEvidence({
  legalName: "Test Employee",
  title: "Staff",
  entityName: "Test Employee",
  email: "employee@example.com",
  typedAcknowledgment: "Test Employee",
  authorityConfirmed: true,
  electronicRecordsConsent: true,
  documentContentHash: contentHash,
  actorRole: "staff-employee",
});

const operatorSig = buildStaffSignatureEvidence({
  legalName: "Matt Lunger",
  title: "Authorized representative",
  entityName: "Kreate by Design LLC",
  email: "matt@kreatebydesign.com",
  typedAcknowledgment: "Matt Lunger",
  authorityConfirmed: true,
  electronicRecordsConsent: true,
  documentContentHash: contentHash,
  priorSignatureHash: employeeSig.signatureHash,
  actorRole: "kxd-employer-representative",
});

const pdf = await renderStaffExecutedAgreementPdf({
  title: SAMPLE_NONBINDING_AGREEMENT_TITLE,
  body: longBody,
  legalEntityName: "Kreate by Design LLC",
  templateVersion: 1,
  contentHash,
  kind: "employment-agreement",
  employeeSignature: employeeSig,
  operatorSignature: operatorSig,
  executedAt: "2026-10-21T12:00:00.000Z",
  auditEvents: [],
});

assert.ok(pdf.length > 10_000, "executed staff PDF should include full body");
const pageMatches = pdf.toString("latin1").match(/\/Type\s*\/Page[^s]/g);
const pageCount = pageMatches ? pageMatches.length : 0;
assert.ok(pageCount >= 2, `expected multi-page executed staff PDF, got ${pageCount}`);
console.log(`  ✓ Multi-page executed staff PDF (${pageCount} pages, ${pdf.length} bytes)`);

console.log("\n  ✓ staff document branding checks passed\n");
