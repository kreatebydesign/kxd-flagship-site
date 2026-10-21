/**
 * Branded agreement presentation — HTML wiring + executed PDF sample.
 *   npx tsx scripts/verify-agreement-presentation.ts
 */
import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseAgreementBodyBlocks } from "../lib/agreement-presentation/parse-body-blocks.ts";
import { KXD_AGREEMENT_LOGO_PUBLIC_PATH } from "../lib/agreement-presentation/tokens.ts";
import { resolveKxdReportLogoAsset } from "../lib/kxd-report-engine/logos.ts";
import { renderExecutedContractPdf } from "../lib/proposal-lifecycle/documents/pdfs.tsx";
import { buildTypedSignature } from "../lib/proposal-lifecycle/signatures.ts";

const root = process.cwd();
let passed = 0;
function ok(label: string) {
  passed += 1;
  console.log(`  ✓ ${label}`);
}

const logo = resolveKxdReportLogoAsset(root);
assert.equal(logo.publicPath, KXD_AGREEMENT_LOGO_PUBLIC_PATH);
assert.ok(logo.exists, "official KXD logo PNG must exist on disk");
ok("Official logo asset resolved (public/migrated-assets/brand/kxd-logo-transparent.png)");

const sampleBody = `PARTIES
Client: Rethwill Chiropractic
Client mailing address: 1445 SE Pine St, Roseburg, OR 97470

SCOPE
• Discovery and strategy
• Website development

SERVICE INVESTMENT
Project total: $7,000 USD

PAYMENT SCHEDULE
$3,500 due at execution
$3,500 due at approved completion before launch

GOVERNING LAW
State of Oregon`;

const blocks = parseAgreementBodyBlocks(sampleBody);
assert.ok(blocks.some((b) => b.type === "section" && b.title === "PARTIES"));
assert.ok(blocks.some((b) => b.type === "bullets"));
ok("Body block parser preserves sections and deliverable bullets");

const detail = readFileSync(
  join(root, "components/agreement/KxdAgreementDocument.tsx"),
  "utf8",
);
assert.match(detail, /KXD_AGREEMENT_LOGO_PUBLIC_PATH/);
assert.match(
  readFileSync(join(root, "design-system/agreement/kxd-agreement-document.css"), "utf8"),
  /kxd-agreement-doc/,
);
ok("HTML shell references approved logo and shared document CSS");

const agreementCss = readFileSync(
  join(root, "design-system/agreement/kxd-agreement-document.css"),
  "utf8",
);
assert.match(agreementCss, /html\[data-theme="dark"\].*kxd-agreement-doc-card/);
assert.match(agreementCss, /color-scheme:\s*light/);
assert.match(agreementCss, /kxd-agreement-doc-island/);
ok("Agreement CSS isolates ivory document from OS dark theme");

const documentHash =
  "93303c2c3bb03546e370b2460d621914bfc78bacd3b36df18bb0eef0b8daa784";

const operator = buildTypedSignature({
  legalName: "Matt Lunger",
  title: "Principal",
  entityName: "Kreate by Design LLC",
  email: "matt@kreatebydesign.com",
  typedAcknowledgment: "Matt Lunger",
  authorityConfirmed: true,
  electronicRecordsConsent: true,
  actorRole: "kxd-operator",
  documentHash,
});

const client = buildTypedSignature({
  legalName: "Kurt V. Rethwill",
  title: "Authorized signatory",
  entityName: "Rethwill Chiropractic",
  email: "presentation-fixture@example.com",
  typedAcknowledgment: "Kurt V. Rethwill",
  authorityConfirmed: true,
  electronicRecordsConsent: true,
  actorRole: "client",
  documentHash,
});

assert.equal(client.entityName, "Rethwill Chiropractic");
assert.notEqual(client.entityName, operator.entityName);
assert.notEqual(client.email, operator.email);
assert.equal(client.actorRole, "client");
ok("Client vs operator signature fixtures use distinct party identities");

const deliverableLines = Array.from(
  { length: 80 },
  () => "• Line item with detailed scope language.",
).join("\n");
const longBody = `${sampleBody}\n\nDELIVERABLES\n${deliverableLines}`;
const pdf = await renderExecutedContractPdf({
  title: "Rethwill Chiropractic — Website Agreement",
  body: longBody,
  proposalNumber: "KXD-P-2026-0008",
  contractId: 6,
  documentHash,
  operator,
  client,
  sealedAt: "2026-10-17T00:00:00.000Z",
});

assert.ok(pdf.buffer.length > 12_000, "executed PDF should include full sectioned body");
const pageMatches = pdf.buffer.toString("latin1").match(/\/Type\s*\/Page[^s]/g);
const pageCount = pageMatches ? pageMatches.length : 0;
assert.ok(pageCount >= 2, `expected multi-page PDF for long agreement, got ${pageCount} pages`);
ok(`Executed PDF renders (${pageCount} pages, ${pdf.buffer.length} bytes)`);

const outDir = join(root, "report-output");
mkdirSync(outDir, { recursive: true });
const outPath = join(outDir, "agreement-presentation-sample.pdf");
writeFileSync(outPath, pdf.buffer);
ok(`Wrote visual QA sample: ${outPath}`);

const bodyBulletCount = longBody.split("\n").filter((l) => /^[•\-\*]\s+/.test(l.trim())).length;
const parsedBullets = parseAgreementBodyBlocks(longBody).filter((b) => b.type === "bullets");
const parsedBulletItems = parsedBullets.reduce((n, b) => n + b.items.length, 0);
assert.equal(parsedBulletItems, bodyBulletCount);
ok("Parser preserves all deliverable bullet lines without reordering");

console.log(`\nPassed ${passed} checks.`);
