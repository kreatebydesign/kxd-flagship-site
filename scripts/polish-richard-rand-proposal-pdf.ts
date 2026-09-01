/**
 * Client-facing PDF polish for Richard Rand proposal ID 4 on the isolated preview database.
 *
 *   CONFIRM_PREVIEW_DRAFT=richard-rand-heritage-archive \
 *   DATABASE_URI='postgresql://…ep-mute-king…' \
 *   npx tsx scripts/polish-richard-rand-proposal-pdf.ts
 *
 * Refuses production host ep-twilight-math. Does not accept, invoice, charge, email, or modify de Bois.
 */
import { existsSync, readFileSync } from "fs";
import { resolve } from "path";
import { assertNoInternalLeakage, buildCanonicalProposal } from "../lib/proposal-builder/canonicalize.ts";
import { normalizeProposalDocument } from "../lib/proposal-builder/document.ts";
import { calculateProposalTotals, totalsToLegacyFields } from "../lib/proposal-builder/pricing.ts";
import type { ProposalDocument } from "../lib/proposal-builder/types.ts";

const PROPOSAL_ID = 4;
const CLIENT_ID = 20;
const LEAD_ID = 12;
const PROPOSAL_NUMBER = "KXD-P-2026-0004";
const DE_BOIS_PROPOSAL_ID = 1;
const CONFIRM = "richard-rand-heritage-archive";
const PREVIEW_HOST_PREFIX = "ep-mute-king";
const PRODUCTION_HOST_PREFIX = "ep-twilight-math";

const CLIENT_CONTEXT =
  "Richard Rand's Personal Heritage & Digital Archive will be developed as a focused first release, with completion estimated for September 22–25, 2026. The schedule is contingent on prompt approval, initial payment, delivery of source materials, factual clarification, and consolidated feedback.";

const PROPOSAL_TERMS =
  "This proposal defines the scope, investment, schedule, and responsibilities for the initial Personal Heritage & Digital Archive engagement. Acceptance authorizes Kreate by Design to prepare the formal Direct Agreement for Richard Rand's review and signature. The project begins after the agreement is signed and the required initial payment is received.";

const PRE_ACCEPTANCE =
  "Proposal acceptance authorizes Kreate by Design to prepare the formal Direct Agreement. The engagement begins after the agreement is signed and the initial payment is received.";

const ACCEPTANCE_DISCLOSURE =
  "By accepting this proposal, Richard Rand authorizes Kreate by Design to prepare the final Direct Agreement based on the scope, investment, schedule, and terms presented here. Proposal acceptance does not replace the formal agreement. Work begins only after the Direct Agreement is signed and the required initial payment is received.";

const FORBIDDEN = [
  "kxd os",
  "operator",
  "agreement preparation",
  "internal review",
  "database",
  "record id",
  "client type:",
  "no company name",
  "does not charge the client",
  "create or mark an invoice",
  "activate the project",
  "phase 1 inside the september",
  "phase 2 inside the september",
  "phases 2-3 inside the september",
  "phases 3-4 inside the september",
];

function applyEnvFile(relativePath: string): boolean {
  const full = resolve(process.cwd(), relativePath);
  if (!existsSync(full)) return false;
  const text = readFileSync(full, "utf8");
  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
  return true;
}

function loadPreviewEnv(): void {
  applyEnvFile(".env.preview.local");
  const previewUri =
    process.env.DATABASE_URI?.trim() ||
    process.env.DATABASE_URL?.trim() ||
    process.env.POSTGRES_URL?.trim() ||
    "";
  applyEnvFile(".env.local");
  if (previewUri) {
    process.env.DATABASE_URI = previewUri;
    process.env.DATABASE_URL = previewUri;
    process.env.POSTGRES_URL = previewUri;
  }
  delete process.env.VERCEL;
  delete process.env.VERCEL_ENV;
  delete process.env.MEDIA_BLOB_READ_WRITE_TOKEN;
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN?.trim() ?? "";
  if (blobToken && !/^vercel_blob_rw_[a-z0-9]+_[a-z0-9]+$/i.test(blobToken)) {
    delete process.env.BLOB_READ_WRITE_TOKEN;
  }
  if (!process.env.PAYLOAD_SECRET || process.env.PAYLOAD_SECRET === "[SENSITIVE]") {
    process.env.PAYLOAD_SECRET = "kxd-dev-secret-change-in-production";
  }
}

function assertPreviewDatabase(uri: string): void {
  if (!/neon\.tech/i.test(uri)) throw new Error("Requires Neon DATABASE_URI");
  if (uri.includes(PRODUCTION_HOST_PREFIX)) {
    throw new Error("Refusing production database host");
  }
  if (!uri.includes(PREVIEW_HOST_PREFIX)) {
    throw new Error(`Requires isolated preview host prefix ${PREVIEW_HOST_PREFIX}`);
  }
}

function assertForbiddenClientCopy(text: string): void {
  const lower = text.toLowerCase();
  const hits = FORBIDDEN.filter((term) => lower.includes(term));
  if (hits.length) {
    throw new Error(`Client-facing copy still contains forbidden terms: ${hits.join(", ")}`);
  }
}

function patchDocument(doc: ProposalDocument): ProposalDocument {
  const contacts = doc.contacts.map((c) =>
    c.isPrimary ? { ...c, title: "" } : c,
  );
  const scopeGroups = doc.scopeGroups.map((g) => ({
    ...g,
    estimatedTimeline: undefined,
  }));

  return {
    ...doc,
    contacts,
    executive: {
      ...doc.executive,
      clientContext: CLIENT_CONTEXT,
    },
    scopeGroups,
    terms: {
      ...doc.terms,
      proposalTerms: PROPOSAL_TERMS,
      closingNote: PRE_ACCEPTANCE,
      acceptanceDisclosure: ACCEPTANCE_DISCLOSURE,
      contractRequiredDisclosure: "",
    },
  };
}

async function runPolishRichardRandProposalPdf() {
  if (process.env.CONFIRM_PREVIEW_DRAFT !== CONFIRM) {
    throw new Error(`Set CONFIRM_PREVIEW_DRAFT=${CONFIRM}`);
  }
  loadPreviewEnv();
  const uri = (
    process.env.DATABASE_URI?.trim() ||
    process.env.DATABASE_URL?.trim() ||
    process.env.POSTGRES_URL?.trim() ||
    ""
  ).replace(/^["']|["']$/g, "");
  assertPreviewDatabase(uri);
  process.env.DATABASE_URI = uri;
  process.env.DATABASE_URL = uri;
  process.env.POSTGRES_URL = uri;

  const { getPayload } = await import("payload");
  const { default: config } = await import("@payload-config");
  const payload = await getPayload({ config });

  const deBoisBefore = (await payload.findByID({
    collection: "proposals" as never,
    id: DE_BOIS_PROPOSAL_ID,
    depth: 0,
    overrideAccess: true,
  })) as Record<string, unknown>;
  const deBoisUpdatedAt = String(deBoisBefore.updatedAt);

  const before = (await payload.findByID({
    collection: "proposals" as never,
    id: PROPOSAL_ID,
    depth: 0,
    overrideAccess: true,
  })) as Record<string, unknown>;

  if (String(before.proposalNumber) !== PROPOSAL_NUMBER) {
    throw new Error(`Expected ${PROPOSAL_NUMBER}`);
  }
  if (Number(before.client) !== CLIENT_ID && (before.client as { id?: number })?.id !== CLIENT_ID) {
    throw new Error(`Expected client ${CLIENT_ID}`);
  }
  if (before.acceptedAt || before.acceptanceRecord || before.relatedContract) {
    throw new Error("Refusing to modify an accepted or contracted proposal");
  }

  const tokenBefore = String(before.publicTokenHash ?? "");
  const patched = patchDocument(normalizeProposalDocument(before.builderDocument));
  const normalized = normalizeProposalDocument(patched);
  const totals = calculateProposalTotals(normalized);
  const legacy = totalsToLegacyFields(totals);

  const clientFacing = JSON.stringify(
    buildCanonicalProposal({
      id: PROPOSAL_ID,
      proposalNumber: PROPOSAL_NUMBER,
      title: String(before.title ?? ""),
      status: "internal-review",
      proposalDate: before.proposalDate as string,
      expiresAt: before.expiresAt as string,
      revisionNumber: Number(before.revisionNumber ?? 1),
      builderDocument: normalized,
    }),
  );
  assertForbiddenClientCopy(clientFacing);

  const shareCanonical = buildCanonicalProposal({
    id: PROPOSAL_ID,
    proposalNumber: PROPOSAL_NUMBER,
    title: String(before.title ?? ""),
    status: "internal-review",
    acceptanceMode: String(before.acceptanceMode ?? "accept-and-proceed-to-contract"),
    proposalDate: before.proposalDate as string,
    expiresAt: before.expiresAt as string,
    revisionNumber: Number(before.revisionNumber ?? 1),
    builderDocument: normalized,
  });
  const leaks = assertNoInternalLeakage(shareCanonical);
  if (leaks.length) throw new Error(`Canonical leakage: ${leaks.join("; ")}`);

  const versionHistory = Array.isArray(before.versionHistory)
    ? (before.versionHistory as Array<Record<string, unknown>>).map((entry) => ({ ...entry }))
    : [];
  versionHistory.push({
    version: Number(before.revisionNumber ?? 1) || 1,
    notes: "Client-facing PDF polish — editorial and layout pass for Richard Rand preview QA.",
    createdAt: new Date().toISOString(),
    createdBy: "Matt Lunger",
  });

  const after = (await payload.update({
    collection: "proposals" as never,
    id: PROPOSAL_ID,
    data: {
      status: "internal-review",
      builderDocument: normalized,
      shareSnapshot: shareCanonical,
      terms: normalized.terms.proposalTerms,
      timeline: normalized.terms.timelineAssumptions,
      investmentSummary:
        "Personal Heritage & Digital Archive: $6,450 one-time. 50% upon Direct Agreement signature ($3,225), 25% upon design and narrative direction approval ($1,612.50), 25% before production launch ($1,612.50). Annual platform: $314 ($299 hosting + $15 standard .com).",
      investment: legacy.investment,
      pricingSnapshot: legacy.pricingSnapshot,
      versionHistory,
      approvalStatus: "none",
      shareApprovedAt: null,
      shareApprovedBy: null,
    } as never,
    overrideAccess: true,
  })) as Record<string, unknown>;

  const deBoisAfter = (await payload.findByID({
    collection: "proposals" as never,
    id: DE_BOIS_PROPOSAL_ID,
    depth: 0,
    overrideAccess: true,
  })) as Record<string, unknown>;
  if (String(deBoisAfter.updatedAt) !== deBoisUpdatedAt) {
    throw new Error("de Bois proposal changed during polish");
  }

  const tokenAfter = String(after.publicTokenHash ?? "");
  if (tokenBefore && tokenAfter !== tokenBefore) {
    throw new Error("Public token hash changed");
  }

  console.log(
    JSON.stringify(
      {
        proposalId: PROPOSAL_ID,
        previewHostPrefix: PREVIEW_HOST_PREFIX,
        status: after.status,
        clientContext: normalized.executive.clientContext,
        proposalTerms: normalized.terms.proposalTerms,
        closingNote: normalized.terms.closingNote,
        acceptanceDisclosure: normalized.terms.acceptanceDisclosure,
        scopeTimelineFieldsCleared: normalized.scopeGroups.every((g) => !g.estimatedTimeline),
        tokenUnchanged: tokenBefore === tokenAfter,
      },
      null,
      2,
    ),
  );
}

runPolishRichardRandProposalPdf().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
