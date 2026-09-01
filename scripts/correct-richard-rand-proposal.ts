/**
 * Correct Richard Rand proposal ID 4 client-facing copy and return to internal review.
 * Preserves proposal number, client, lead, and existing public token hash/links.
 *
 *   CONFIRM_PRODUCTION_DRAFT=richard-rand-heritage-archive \
 *   npx tsx scripts/correct-richard-rand-proposal.ts
 *
 * Does not accept, contract, invoice, charge, email, or modify de Bois proposal 1.
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

const NEXT_STEPS =
  "1. Review the proposed scope, investment, schedule, and terms.\n2. Accept the proposal when ready to move forward.\n3. Kreate by Design will prepare the formal Direct Agreement for review and signature.\n4. The project will begin once the Direct Agreement is signed and the initial payment is received.\n5. Discovery and archival-material collection will then be scheduled.";

const ACCEPTANCE_DISCLOSURE =
  "By accepting this proposal, Richard Rand authorizes Kreate by Design to prepare the final Direct Agreement based on the scope, investment, schedule, and terms presented here. Proposal acceptance does not replace the formal agreement. Work begins only after the Direct Agreement is signed and the required initial payment is received.";

const FORBIDDEN = [
  "kxd os",
  "operator",
  "agreement preparation",
  "internal review",
  "database",
  "record id",
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

function loadProductionEnv(): void {
  applyEnvFile(".env.vercel.local");
  applyEnvFile(".env.production.local");
  delete process.env.VERCEL;
  delete process.env.VERCEL_ENV;
  delete process.env.MEDIA_BLOB_READ_WRITE_TOKEN;
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN?.trim() ?? "";
  if (blobToken && !/^vercel_blob_rw_[a-z0-9]+_[a-z0-9]+$/i.test(blobToken)) {
    delete process.env.BLOB_READ_WRITE_TOKEN;
  }
  const neonUri =
    process.env.DATABASE_URI?.trim() ||
    process.env.DATABASE_URL?.trim() ||
    process.env.POSTGRES_URL?.trim() ||
    "";
  if (!process.env.PAYLOAD_SECRET || process.env.PAYLOAD_SECRET === "[SENSITIVE]") {
    applyEnvFile(".env.local");
    if (neonUri) {
      const cleaned = neonUri.replace(/^["']|["']$/g, "");
      process.env.DATABASE_URI = cleaned;
      process.env.DATABASE_URL = cleaned;
      process.env.POSTGRES_URL = cleaned;
    }
    if (!process.env.PAYLOAD_SECRET || process.env.PAYLOAD_SECRET === "[SENSITIVE]") {
      process.env.PAYLOAD_SECRET = "kxd-dev-secret-change-in-production";
    }
  }
  if (neonUri) {
    const cleaned = neonUri.replace(/^["']|["']$/g, "");
    process.env.DATABASE_URI = cleaned;
    process.env.DATABASE_URL = cleaned;
    process.env.POSTGRES_URL = cleaned;
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
  return {
    ...doc,
    terms: {
      ...doc.terms,
      nextSteps: NEXT_STEPS,
      acceptanceDisclosure: ACCEPTANCE_DISCLOSURE,
      closingNote:
        "Acceptance authorizes Kreate by Design to prepare the Direct Agreement only. It does not charge the client, create or mark an invoice as paid, activate the project, replace the formal agreement, or serve as the final legal signature.",
    },
  };
}

async function runCorrectRichardRandProposal() {
  if (process.env.CONFIRM_PRODUCTION_DRAFT !== CONFIRM) {
    throw new Error(`Set CONFIRM_PRODUCTION_DRAFT=${CONFIRM}`);
  }
  loadProductionEnv();
  const uri = process.env.DATABASE_URI?.trim() || "";
  if (!/neon\.tech/i.test(uri)) throw new Error("Requires Neon production DATABASE_URI");

  const { getPayload } = await import("payload");
  const { default: config } = await import("@payload-config");
  const payload = await getPayload({ config });

  const deBoisBefore = (await payload.findByID({
    collection: "proposals" as never,
    id: DE_BOIS_PROPOSAL_ID,
    depth: 0,
    overrideAccess: true,
  })) as Record<string, unknown>;
  if (String(deBoisBefore.title) !== "de Bois Entertainment Website Rebuild") {
    throw new Error("Safety: proposal 1 is not de Bois");
  }
  const deBoisUpdatedAt = String(deBoisBefore.updatedAt);

  const before = (await payload.findByID({
    collection: "proposals" as never,
    id: PROPOSAL_ID,
    depth: 0,
    overrideAccess: true,
  })) as Record<string, unknown>;

  if (String(before.proposalNumber) !== PROPOSAL_NUMBER) {
    throw new Error(`Expected ${PROPOSAL_NUMBER}, got ${String(before.proposalNumber)}`);
  }
  if (Number(before.client) !== CLIENT_ID && (before.client as { id?: number })?.id !== CLIENT_ID) {
    throw new Error(`Expected client ${CLIENT_ID}`);
  }
  if (Number(before.lead) !== LEAD_ID && (before.lead as { id?: number })?.id !== LEAD_ID) {
    throw new Error(`Expected lead ${LEAD_ID}`);
  }
  if (before.acceptedAt || before.acceptanceRecord || before.relatedContract) {
    throw new Error("Refusing to modify an accepted or contracted proposal");
  }

  const tokenBefore = String(before.publicTokenHash ?? "");
  const shareLinksBefore = JSON.stringify(before.shareLinks ?? []);
  const statusBefore = String(before.status ?? "");

  const patched = patchDocument(normalizeProposalDocument(before.builderDocument));
  const normalized = normalizeProposalDocument(patched);
  const totals = calculateProposalTotals(normalized);
  const legacy = totalsToLegacyFields(totals);

  const clientFacing = [
    normalized.executive.clientFacingIntro,
    normalized.executive.executiveSummary,
    normalized.executive.currentSituation,
    normalized.executive.objectives,
    normalized.executive.recommendedDirection,
    normalized.executive.desiredOutcomes,
    normalized.executive.clientContext,
    ...normalized.scopeGroups.flatMap((g) => [g.title, g.overview, ...g.deliverables.map((d) => d.title)]),
    ...normalized.pricingLines.map((l) => l.title),
    ...normalized.paymentSchedule.map((p) => p.label),
    normalized.terms.proposalTerms,
    normalized.terms.paymentAssumptions,
    normalized.terms.timelineAssumptions,
    normalized.terms.expirationLanguage,
    normalized.terms.changeRequestLanguage,
    normalized.terms.clientResponsibilities,
    normalized.terms.exclusions,
    normalized.terms.nextSteps,
    normalized.terms.closingNote,
    normalized.terms.acceptanceDisclosure,
    normalized.terms.contractRequiredDisclosure,
  ]
    .filter(Boolean)
    .join("\n");
  assertForbiddenClientCopy(clientFacing);

  const version = Number(before.revisionNumber ?? 1) || 1;
  const versionHistory = Array.isArray(before.versionHistory)
    ? (before.versionHistory as Array<Record<string, unknown>>).map((entry) => ({ ...entry }))
    : [];
  versionHistory.push({
    version,
    notes:
      "Returned to internal review for final client-facing copy and presentation QA. Public token preserved.",
    createdAt: new Date().toISOString(),
    createdBy: "Matt Lunger",
  });

  const sharedFields = {
    builderDocument: normalized,
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
  };

  // Transition approved-for-sharing → draft → internal-review when needed.
  let currentStatus = statusBefore;
  if (currentStatus === "approved-for-sharing") {
    await payload.update({
      collection: "proposals" as never,
      id: PROPOSAL_ID,
      data: { status: "draft", ...sharedFields } as never,
      overrideAccess: true,
    });
    currentStatus = "draft";
  }

  const shareCanonical = buildCanonicalProposal({
    id: PROPOSAL_ID,
    proposalNumber: PROPOSAL_NUMBER,
    title: String(before.title ?? ""),
    status: "internal-review",
    acceptanceMode: String(before.acceptanceMode ?? "accept-and-proceed-to-contract"),
    proposalDate: before.proposalDate as string,
    expiresAt: before.expiresAt as string,
    revisionNumber: version,
    builderDocument: normalized,
  });
  const leaks = assertNoInternalLeakage(shareCanonical);
  if (leaks.length) throw new Error(`Canonical leakage: ${leaks.join("; ")}`);
  assertForbiddenClientCopy(JSON.stringify(shareCanonical));

  const after = (await payload.update({
    collection: "proposals" as never,
    id: PROPOSAL_ID,
    data: {
      status: "internal-review",
      ...sharedFields,
      shareSnapshot: shareCanonical,
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
    throw new Error("de Bois proposal changed during correction");
  }

  const tokenAfter = String(after.publicTokenHash ?? "");
  const shareLinksAfter = JSON.stringify(after.shareLinks ?? []);
  if (tokenBefore && tokenAfter !== tokenBefore) {
    throw new Error("Public token hash changed");
  }
  if (shareLinksBefore && shareLinksAfter !== shareLinksBefore) {
    throw new Error("Share links changed");
  }

  console.log(
    JSON.stringify(
      {
        proposalId: PROPOSAL_ID,
        proposalNumber: PROPOSAL_NUMBER,
        clientId: CLIENT_ID,
        leadId: LEAD_ID,
        statusBefore,
        statusAfter: after.status,
        tokenUnchanged: tokenBefore === tokenAfter,
        nextSteps: normalized.terms.nextSteps,
        acceptanceDisclosure: normalized.terms.acceptanceDisclosure,
        acceptedAt: after.acceptedAt ?? null,
        relatedContract: after.relatedContract ?? null,
        paymentStatus: after.paymentStatus ?? null,
        deBoisUntouched: {
          id: deBoisAfter.id,
          status: deBoisAfter.status,
          updatedAt: deBoisAfter.updatedAt,
        },
      },
      null,
      2,
    ),
  );
}

runCorrectRichardRandProposal().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
