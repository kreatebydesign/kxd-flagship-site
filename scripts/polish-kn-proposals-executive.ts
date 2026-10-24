/**
 * Executive copy polish for K&N proposals 11 (Option A) and 12 (Option B).
 *
 * Dry run (no DB write, export HTML/PDF to .cache/):
 *   KXD_SERVER_ONLY_SHIM=1 npx tsx --import ./scripts/shims/register-server-only.mjs --env-file=.env.production.local scripts/polish-kn-proposals-executive.ts
 *
 * Apply to database (auditable update + version history note):
 *   CONFIRM_POLISH=kn-proposals-11-12 KXD_SERVER_ONLY_SHIM=1 npx tsx --import ./scripts/shims/register-server-only.mjs --env-file=.env.production.local scripts/polish-kn-proposals-executive.ts
 *
 * Does not change status, share links, invoices, agreements, or send email.
 */
import { mkdirSync, writeFileSync } from "fs";
import { resolve } from "path";
import {
  assertNoInternalLeakage,
  buildCanonicalProposal,
} from "../lib/proposal-builder/canonicalize.ts";
import { normalizeProposalDocument } from "../lib/proposal-builder/document.ts";
import { renderProposalPreviewHtml } from "../lib/proposal-builder/export-html.ts";
import {
  assertKnPaymentScheduleUnchanged,
  KN_PROPOSAL_IDS,
  KN_PROPOSAL_NUMBERS,
  patchKnProposalExecutivePolish,
} from "../lib/proposal-builder/kn-proposals-executive-polish.ts";
import { calculateProposalTotals, totalsToLegacyFields } from "../lib/proposal-builder/pricing.ts";

const CONFIRM = "kn-proposals-11-12";
const LEAD_ID = 24;
const CACHE_DIR = resolve(process.cwd(), ".cache");
const MATT_DELIVERABLE_DIR = resolve(
  process.cwd(),
  "deliverables/kn-proposals-for-matt-approval",
);
const MATT_FINAL_PDF_NAMES: Record<11 | 12, string> = {
  11: "KXD-P-2026-0009-KN-Option-A-Enterprise-UX-UI-FINAL.pdf",
  12: "KXD-P-2026-0010-KN-Option-B-Interactive-Code-First-FINAL.pdf",
};

const FORBIDDEN_CLIENT = [
  "internal — not for client",
  "matt approval before share",
  "kxd preferred recommendation",
  "unresolved:",
  "working prices",
];

function assertForbiddenClientCopy(text: string): void {
  const lower = text.toLowerCase();
  const hits = FORBIDDEN_CLIENT.filter((term) => lower.includes(term));
  if (hits.length) {
    throw new Error(`Client-facing copy contains forbidden terms: ${hits.join(", ")}`);
  }
}

async function exportArtifacts(
  id: 11 | 12,
  proposalNumber: string,
  normalized: ReturnType<typeof normalizeProposalDocument>,
  before: Record<string, unknown>,
): Promise<void> {
  mkdirSync(CACHE_DIR, { recursive: true });
  mkdirSync(MATT_DELIVERABLE_DIR, { recursive: true });
  const canonical = buildCanonicalProposal({
    id,
    proposalNumber,
    title: String(before.title ?? ""),
    status: String(before.status ?? "internal-review"),
    acceptanceMode: String(before.acceptanceMode ?? "accept-and-proceed-to-contract"),
    proposalDate: before.proposalDate as string,
    expiresAt: before.expiresAt as string,
    revisionNumber: Number(before.revisionNumber ?? 1),
    builderDocument: normalized,
  });
  const leaks = assertNoInternalLeakage(canonical);
  if (leaks.length) throw new Error(`Proposal ${id} leakage: ${leaks.join("; ")}`);

  const html = renderProposalPreviewHtml(canonical);
  assertForbiddenClientCopy(html);

  const htmlPath = resolve(CACHE_DIR, `kn-proposal-${id}-polished-preview.html`);
  writeFileSync(htmlPath, html, "utf8");

  const { resolveKxdReportLogoAsset } = await import("../lib/kxd-report-engine/logos.ts");
  const logo = resolveKxdReportLogoAsset();

  const { renderProposalPdf } = await import("../lib/proposal-builder/export-pdf.tsx");
  const { buffer, filename } = await renderProposalPdf(canonical);
  const pdfPath = resolve(CACHE_DIR, filename);
  writeFileSync(pdfPath, buffer);

  const mattPdfPath = resolve(MATT_DELIVERABLE_DIR, MATT_FINAL_PDF_NAMES[id]);
  writeFileSync(mattPdfPath, buffer);
  const mattHtmlPath = resolve(
    MATT_DELIVERABLE_DIR,
    MATT_FINAL_PDF_NAMES[id].replace(/\.pdf$/i, ".html"),
  );
  const htmlForMatt = html.replace(
    'src="/migrated-assets/brand/kxd-logo-transparent.png"',
    'src="../../public/migrated-assets/brand/kxd-logo-transparent.png"',
  );
  writeFileSync(mattHtmlPath, htmlForMatt, "utf8");

  console.log(
    JSON.stringify({
      proposalId: id,
      proposalNumber,
      htmlPath,
      pdfPath,
      mattPdfPath,
      mattHtmlPath,
      htmlChars: html.length,
      pdfBytes: buffer.length,
      kxdLogoPresent: logo.exists,
      kxdLogoPath: logo.absolutePath,
    }),
  );
}

async function polishOne(payload: Awaited<ReturnType<typeof import("payload").getPayload>>, id: 11 | 12, apply: boolean): Promise<void> {
  const proposalNumber = KN_PROPOSAL_NUMBERS[id];
  const before = (await payload.findByID({
    collection: "proposals" as never,
    id,
    depth: 0,
    overrideAccess: true,
  })) as Record<string, unknown>;

  if (String(before.proposalNumber) !== proposalNumber) {
    throw new Error(`Proposal ${id}: expected number ${proposalNumber}`);
  }
  const lead = before.lead;
  const leadId = typeof lead === "object" && lead && "id" in lead ? Number((lead as { id: number }).id) : Number(lead);
  if (leadId !== LEAD_ID) {
    throw new Error(`Proposal ${id}: expected lead ${LEAD_ID}, got ${leadId}`);
  }
  if (before.acceptedAt || before.acceptanceRecord || before.relatedContract) {
    throw new Error(`Proposal ${id}: refusing accepted/contracted proposal`);
  }

  const beforeDoc = normalizeProposalDocument(before.builderDocument);
  const patched = patchKnProposalExecutivePolish(beforeDoc, id);
  const normalized = normalizeProposalDocument(patched);
  assertKnPaymentScheduleUnchanged(beforeDoc, normalized, id);

  const totals = calculateProposalTotals(normalized);
  const legacy = totalsToLegacyFields(totals);
  const expectedInvestment = id === 11 ? 39500 : 49500;
  if (legacy.investment !== expectedInvestment) {
    throw new Error(`Proposal ${id}: investment ${legacy.investment} !== ${expectedInvestment}`);
  }

  await exportArtifacts(id, proposalNumber, normalized, before);

  if (!apply) {
    console.log(JSON.stringify({ proposalId: id, mode: "dry-run", applied: false }));
    return;
  }

  const tokenBefore = String(before.publicTokenHash ?? "");
  const shareCanonical = buildCanonicalProposal({
    id,
    proposalNumber,
    title: String(before.title ?? ""),
    status: String(before.status ?? "internal-review"),
    acceptanceMode: String(before.acceptanceMode ?? "accept-and-proceed-to-contract"),
    proposalDate: before.proposalDate as string,
    expiresAt: before.expiresAt as string,
    revisionNumber: Number(before.revisionNumber ?? 1),
    builderDocument: normalized,
  });

  const versionHistory = Array.isArray(before.versionHistory)
    ? (before.versionHistory as Array<Record<string, unknown>>).map((entry) => ({ ...entry }))
    : [];
  versionHistory.push({
    version: Number(before.revisionNumber ?? 1) || 1,
    notes:
      "Executive presentation polish — K&N Option A/B copy, roadmap readability, exclusions, and dual-proposal CTA (Matt approval).",
    createdAt: new Date().toISOString(),
    createdBy: "KXD OS polish script",
  });

  const after = (await payload.update({
    collection: "proposals" as never,
    id,
    data: {
      builderDocument: normalized,
      shareSnapshot: shareCanonical,
      terms: normalized.terms.proposalTerms,
      timeline: normalized.terms.timelineAssumptions,
      investment: legacy.investment,
      pricingSnapshot: legacy.pricingSnapshot,
      versionHistory,
    } as never,
    overrideAccess: true,
  })) as Record<string, unknown>;

  const tokenAfter = String(after.publicTokenHash ?? "");
  if (tokenBefore && tokenAfter !== tokenBefore) {
    throw new Error(`Proposal ${id}: public token hash changed`);
  }

  console.log(
    JSON.stringify({
      proposalId: id,
      mode: "applied",
      status: after.status,
      updatedAt: after.updatedAt,
      tokenUnchanged: tokenBefore === tokenAfter,
    }),
  );
}

async function main(): Promise<void> {
  const apply = process.env.CONFIRM_POLISH === CONFIRM;
  if (!apply) {
    console.log(`Dry run — set CONFIRM_POLISH=${CONFIRM} to write database.`);
  }

  const { getPayload } = await import("payload");
  const { default: config } = await import("@payload-config");
  const payload = await getPayload({ config });
  for (const id of KN_PROPOSAL_IDS) {
    await polishOne(payload, id, apply);
  }
}

main().catch((err) => {
  console.error("polish-kn-proposals-executive: FAILED");
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
