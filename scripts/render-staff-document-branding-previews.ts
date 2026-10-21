/**
 * Visual QA — staff document PDF branding (non-production, synthetic content).
 *
 *   npx tsx scripts/render-staff-document-branding-previews.ts
 *
 * Writes representative PDFs for Matt's approval. Does not touch production records.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  SAMPLE_NONBINDING_AGREEMENT_BODY,
  SAMPLE_NONBINDING_AGREEMENT_TITLE,
  SAMPLE_NONBINDING_POLICY_BODY,
  SAMPLE_NONBINDING_POLICY_TITLE,
  STAFF_ACKNOWLEDGMENT_CONSENT_TEXT,
} from "../lib/staff-documents/constants.ts";
import { hashStaffDocumentBody } from "../lib/staff-documents/hash.ts";
import {
  renderStaffAcknowledgmentRecordPdf,
  renderStaffExecutedAgreementPdf,
  renderStaffPolicyPdf,
} from "../lib/staff-documents/export-pdf.tsx";
import { buildStaffAcknowledgment } from "../lib/staff-documents/acknowledgment.ts";
import { buildStaffSignatureEvidence } from "../lib/staff-documents/signature.ts";

const root = process.cwd();
const outDir = join(root, "storage/qa-previews/staff-documents-branding");
mkdirSync(outDir, { recursive: true });

const runTag = new Date().toISOString().slice(0, 10);
const policyBody = `${SAMPLE_NONBINDING_POLICY_BODY}\n\n[Visual QA run ${runTag} — not for assignment]`;
const policyHash = hashStaffDocumentBody(policyBody);

const agreementBody = `${SAMPLE_NONBINDING_AGREEMENT_BODY}\n\nEXTENDED TERMS (QA)\n${Array.from(
  { length: 48 },
  (_, i) => `Section ${i + 1}\nThis paragraph exercises multi-page layout, margins, and section breaks for staff agreement PDFs. It is synthetic test content only.`,
).join("\n\n")}`;

const agreementHash = hashStaffDocumentBody(agreementBody);

async function main() {
  const policyPdf = await renderStaffPolicyPdf({
    title: SAMPLE_NONBINDING_POLICY_TITLE,
    body: policyBody,
    legalEntityName: "Kreate by Design LLC",
    templateVersion: 1,
    contentHash: policyHash,
  });
  writeFileSync(join(outDir, "01-staff-policy-preview.pdf"), policyPdf);

  const ack = buildStaffAcknowledgment({
    legalName: "Preview Staff Member",
    email: "preview-staff@example.com",
    typedAcknowledgment: "Preview Staff Member",
    electronicRecordsConsent: true,
    reviewedConfirmed: true,
    documentContentHash: policyHash,
  });
  ack.consentText = STAFF_ACKNOWLEDGMENT_CONSENT_TEXT;

  const ackPdf = await renderStaffAcknowledgmentRecordPdf({
    title: SAMPLE_NONBINDING_POLICY_TITLE,
    legalEntityName: "Kreate by Design LLC",
    templateVersion: 1,
    contentHash: policyHash,
    acknowledgment: ack,
  });
  writeFileSync(join(outDir, "02-policy-acknowledgment-record-preview.pdf"), ackPdf);

  const employeeSig = buildStaffSignatureEvidence({
    legalName: "Preview Staff Member",
    title: "Business Development Specialist",
    entityName: "Preview Staff Member",
    email: "preview-staff@example.com",
    typedAcknowledgment: "Preview Staff Member",
    authorityConfirmed: true,
    electronicRecordsConsent: true,
    documentContentHash: agreementHash,
    actorRole: "staff-employee",
    ipAddress: "127.0.0.1",
    userAgent: "staff-branding-preview",
  });

  const operatorSig = buildStaffSignatureEvidence({
    legalName: "Matt Lunger",
    title: "Authorized representative",
    entityName: "Kreate by Design LLC",
    email: "matt@kreatebydesign.com",
    typedAcknowledgment: "Matt Lunger",
    authorityConfirmed: true,
    electronicRecordsConsent: true,
    documentContentHash: agreementHash,
    priorSignatureHash: employeeSig.signatureHash,
    actorRole: "kxd-employer-representative",
    ipAddress: "127.0.0.1",
    userAgent: "staff-branding-preview",
  });

  const executedPdf = await renderStaffExecutedAgreementPdf({
    title: SAMPLE_NONBINDING_AGREEMENT_TITLE,
    body: agreementBody,
    legalEntityName: "Kreate by Design LLC",
    templateVersion: 1,
    contentHash: agreementHash,
    kind: "employment-agreement",
    employeeSignature: employeeSig,
    operatorSignature: operatorSig,
    executedAt: new Date().toISOString(),
    auditEvents: [
      { id: "1", at: new Date().toISOString(), action: "assigned", actor: "matt@kreatebydesign.com" },
      { id: "2", at: new Date().toISOString(), action: "employee-signed", actor: "preview-staff@example.com" },
      { id: "3", at: new Date().toISOString(), action: "operator-countersigned", actor: "matt@kreatebydesign.com" },
      { id: "4", at: new Date().toISOString(), action: "executed", actor: "system" },
    ],
  });
  writeFileSync(join(outDir, "03-executed-staff-agreement-multipage-preview.pdf"), executedPdf);

  console.log("\nStaff document branding previews written:\n");
  console.log(`  ${join(outDir, "01-staff-policy-preview.pdf")}`);
  console.log(`  ${join(outDir, "02-policy-acknowledgment-record-preview.pdf")}`);
  console.log(`  ${join(outDir, "03-executed-staff-agreement-multipage-preview.pdf")}\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
