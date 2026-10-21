/**
 * Staff document PDF branding — logo, multi-page layout, hash preservation.
 *   npx tsx scripts/verify-staff-document-branding.ts
 */
import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { resolveKxdReportLogoAsset } from "../lib/kxd-report-engine/logos.ts";
import { KXD_AGREEMENT_LOGO_PUBLIC_PATH } from "../lib/agreement-presentation/tokens.ts";
import { hashStaffDocumentBody } from "../lib/staff-documents/hash.ts";
import {
  SAMPLE_NONBINDING_AGREEMENT_BODY,
  SAMPLE_NONBINDING_AGREEMENT_TITLE,
  SAMPLE_NONBINDING_POLICY_BODY,
  SAMPLE_NONBINDING_POLICY_TITLE,
} from "../lib/staff-documents/constants.ts";
import {
  renderStaffExecutedAgreementPdf,
  renderStaffPolicyPdf,
} from "../lib/staff-documents/export-pdf.tsx";
import { buildStaffSignatureEvidence } from "../lib/staff-documents/signature.ts";

async function assertRenderedPdfFooterBandHasNoTealOrRed(pdf: Buffer): Promise<void> {
  const dir = mkdtempSync(join(tmpdir(), "kxd-pdf-color-"));
  const pdfPath = join(dir, "sample.pdf");
  const pngPath = join(dir, "page.png");
  writeFileSync(pdfPath, pdf);
  execSync(
    `gs -dSAFER -dBATCH -dNOPAUSE -sDEVICE=png16m -r150 -dFirstPage=1 -dLastPage=1 -sOutputFile="${pngPath}" "${pdfPath}"`,
    { stdio: "pipe" },
  );
  const image = sharp(pngPath);
  const meta = await image.metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
  const xPositions = [0.12, 0.35, 0.55, 0.78].map((f) => Math.floor(width * f));
  for (let y = Math.floor(height * 0.84); y <= Math.floor(height * 0.93); y += 2) {
    for (const x of xPositions) {
      const idx = (y * info.width + x) * info.channels;
      const r = data[idx] ?? 0;
      const g = data[idx + 1] ?? 0;
      const b = data[idx + 2] ?? 0;
      assert.ok(!(g > r + 35 && b > r + 10), `unexpected teal/cyan at y=${y} rgb(${r},${g},${b})`);
      assert.ok(!(r > g + 70 && g < 130), `unexpected red at y=${y} rgb(${r},${g},${b})`);
    }
  }
  rmSync(dir, { recursive: true });
}

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

const policyHash = hashStaffDocumentBody(SAMPLE_NONBINDING_POLICY_BODY);
const policyPdf = await renderStaffPolicyPdf({
  title: SAMPLE_NONBINDING_POLICY_TITLE,
  body: SAMPLE_NONBINDING_POLICY_BODY,
  legalEntityName: "Kreate by Design LLC",
  templateVersion: 1,
  contentHash: policyHash,
});
await assertRenderedPdfFooterBandHasNoTealOrRed(policyPdf);
console.log("  ✓ Rendered PDF footer band has no teal/red divider artifacts");

console.log("\n  ✓ staff document branding checks passed\n");
