/**
 * Final Richard Rand proposal release — scope boundaries + share snapshot refresh.
 *
 * Preview (isolated Neon only):
 *   CONFIRM_PREVIEW_DRAFT=richard-rand-heritage-archive \
 *   npx tsx scripts/finalize-richard-rand-proposal-release.ts --preview
 *
 * Production content (after deploy):
 *   CONFIRM_PRODUCTION_DRAFT=richard-rand-heritage-archive \
 *   npx tsx scripts/finalize-richard-rand-proposal-release.ts --production-content
 *
 * Production approve for sharing (after content verified):
 *   CONFIRM_PRODUCTION_DRAFT=richard-rand-heritage-archive \
 *   CONFIRM_PRODUCTION_SHARE=richard-rand-heritage-archive \
 *   npx tsx scripts/finalize-richard-rand-proposal-release.ts --production-approve
 *
 * Does not accept, invoice, charge, contract, email, or modify de Bois proposal 1.
 */
import { existsSync, readFileSync } from "fs";
import { resolve } from "path";
import { assertNoInternalLeakage, buildCanonicalProposal } from "../lib/proposal-builder/canonicalize.ts";
import { normalizeProposalDocument, newId } from "../lib/proposal-builder/document.ts";
import { calculateProposalTotals, totalsToLegacyFields } from "../lib/proposal-builder/pricing.ts";
import type { ProposalDocument, ProposalScopeGroup } from "../lib/proposal-builder/types.ts";

const PROPOSAL_ID = 4;
const CLIENT_ID = 20;
const LEAD_ID = 12;
const PROPOSAL_NUMBER = "KXD-P-2026-0004";
const DE_BOIS_PROPOSAL_ID = 1;
const CONFIRM = "richard-rand-heritage-archive";
const CONFIRM_SHARE = "richard-rand-heritage-archive";
const PREVIEW_HOST = "ep-mute-king";
const PRODUCTION_HOST = "ep-twilight-math";

export const INITIAL_RELEASE_OVERVIEW =
  "The initial release will establish the core archive experience and include up to six priority property or development feature stories and up to 50 client-supplied archival media items. Final story selection and media placement will be established during discovery based on historical significance, available documentation, image quality, and the approved narrative structure.\n\nAdditional project stories, archive entries, extensive media processing, or continued content population beyond the defined initial release may be completed through a written scope adjustment or separate post-launch engagement.";

const CHANGE_REQUEST_LANGUAGE =
  "The project includes up to two consolidated revision rounds. Additional project stories, archive entries, extensive media processing, or continued content population beyond the defined initial release may be completed through a written scope adjustment or separate post-launch engagement. Major changes after direction approval, new functionality, additional chapters, or substantial scope expansion may require a written scope adjustment.";

const CLIENT_CONTEXT =
  "Richard Rand's Personal Heritage & Digital Archive will be developed as a focused first release, with completion estimated for September 22–25, 2026. The schedule is contingent on prompt approval, initial payment, delivery of source materials, factual clarification, and consolidated feedback.";

const PROPOSAL_TERMS =
  "This proposal defines the scope, investment, schedule, and responsibilities for the initial Personal Heritage & Digital Archive engagement. Acceptance authorizes Kreate by Design to prepare the formal Direct Agreement for Richard Rand's review and signature. The project begins after the agreement is signed and the required initial payment is received.";

const PRE_ACCEPTANCE =
  "Proposal acceptance authorizes Kreate by Design to prepare the formal Direct Agreement. The engagement begins after the agreement is signed and the initial payment is received.";

const ACCEPTANCE_DISCLOSURE =
  "By accepting this proposal, Richard Rand authorizes Kreate by Design to prepare the final Direct Agreement based on the scope, investment, schedule, and terms presented here. Proposal acceptance does not replace the formal agreement. Work begins only after the Direct Agreement is signed and the required initial payment is received.";

const INITIAL_RELEASE_DELIVERABLES = [
  "Editorial homepage",
  "Richard Rand biography",
  "Historical timeline",
  "Beverly Hills chapter",
  "Hawaii chapter",
  "Australia chapter",
  "California chapter",
  "Up to six priority property or development feature stories",
  "Up to 50 client-supplied photographs, documents, plans, clippings, or other archival media items prepared and placed in the initial release",
  "Historical media and document presentation",
  "Contact or inquiry pathway",
  "Analytics and technical search foundation",
  "Production launch",
  "Google Search Console submission readiness",
  "Thirty-day post-launch defect warranty",
];

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

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

function loadEnv(mode: "preview" | "production"): void {
  if (mode === "preview") {
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
  } else {
    applyEnvFile(".env.production.local");
    applyEnvFile(".env.local");
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

function assertDatabaseHost(uri: string, requiredHost: string): void {
  if (!/neon\.tech/i.test(uri)) throw new Error("Requires Neon DATABASE_URI");
  if (!uri.includes(requiredHost)) {
    throw new Error(`Refusing: expected host containing ${requiredHost}`);
  }
}

function patchInitialReleaseGroup(group: ProposalScopeGroup): ProposalScopeGroup {
  if (!/initial release/i.test(group.title)) return group;
  return {
    ...group,
    overview: INITIAL_RELEASE_OVERVIEW,
    deliverables: INITIAL_RELEASE_DELIVERABLES.map((title, index) => {
      const existing = group.deliverables.find((d) => d.title === title);
      return {
        id: existing?.id ?? newId("del"),
        title,
        description: existing?.description,
        sortOrder: index + 1,
      };
    }),
  };
}

export function patchRichardRandReleaseDocument(doc: ProposalDocument): ProposalDocument {
  const contacts = doc.contacts.map((c) =>
    c.isPrimary ? { ...c, title: "" } : c,
  );
  const scopeGroups = doc.scopeGroups.map((g) => {
    const cleared = { ...g, estimatedTimeline: undefined };
    return patchInitialReleaseGroup(cleared);
  });

  return normalizeProposalDocument({
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
      changeRequestLanguage: CHANGE_REQUEST_LANGUAGE,
      closingNote: PRE_ACCEPTANCE,
      acceptanceDisclosure: ACCEPTANCE_DISCLOSURE,
      contractRequiredDisclosure: "",
    },
  });
}

async function snapshotDeBois(payload: Awaited<ReturnType<typeof import("payload").getPayload>>) {
  const record = await payload.findByID({
    collection: "proposals" as never,
    id: DE_BOIS_PROPOSAL_ID,
    depth: 0,
    overrideAccess: true,
  });
  return String((record as Record<string, unknown>).updatedAt);
}

async function runRelease() {
  const previewMode = hasFlag("--preview");
  const productionContent = hasFlag("--production-content");
  const productionApprove = hasFlag("--production-approve");

  if (!previewMode && !productionContent && !productionApprove) {
    throw new Error("Specify --preview, --production-content, or --production-approve");
  }
  if (previewMode && (productionContent || productionApprove)) {
    throw new Error("Use one mode at a time");
  }

  const mode = previewMode ? "preview" : "production";
  if (previewMode) {
    if (process.env.CONFIRM_PREVIEW_DRAFT !== CONFIRM) {
      throw new Error(`Set CONFIRM_PREVIEW_DRAFT=${CONFIRM}`);
    }
  } else {
    if (process.env.CONFIRM_PRODUCTION_DRAFT !== CONFIRM) {
      throw new Error(`Set CONFIRM_PRODUCTION_DRAFT=${CONFIRM}`);
    }
    if (productionApprove && process.env.CONFIRM_PRODUCTION_SHARE !== CONFIRM_SHARE) {
      throw new Error(`Set CONFIRM_PRODUCTION_SHARE=${CONFIRM_SHARE}`);
    }
  }

  loadEnv(mode);
  const uri = (
    process.env.DATABASE_URI?.trim() ||
    process.env.DATABASE_URL?.trim() ||
    process.env.POSTGRES_URL?.trim() ||
    ""
  ).replace(/^["']|["']$/g, "");
  assertDatabaseHost(uri, previewMode ? PREVIEW_HOST : PRODUCTION_HOST);
  process.env.DATABASE_URI = uri;
  process.env.DATABASE_URL = uri;
  process.env.POSTGRES_URL = uri;

  const { getPayload } = await import("payload");
  const { default: config } = await import("@payload-config");
  const payload = await getPayload({ config });

  const deBoisUpdatedAt = await snapshotDeBois(payload);

  const before = (await payload.findByID({
    collection: "proposals" as never,
    id: PROPOSAL_ID,
    depth: 0,
    overrideAccess: true,
  })) as Record<string, unknown>;

  if (String(before.proposalNumber) !== PROPOSAL_NUMBER) {
    throw new Error(`Expected ${PROPOSAL_NUMBER}`);
  }
  const clientRef = before.client;
  const clientId =
    typeof clientRef === "object" && clientRef
      ? Number((clientRef as { id: number }).id)
      : Number(clientRef);
  if (clientId !== CLIENT_ID) throw new Error(`Expected client ${CLIENT_ID}`);
  if (before.acceptedAt || before.relatedContract) {
    throw new Error("Refusing to modify an accepted or contracted proposal");
  }

  const tokenBefore = String(before.publicTokenHash ?? "");
  const statusBefore = String(before.status ?? "");

  if (productionApprove) {
    if (statusBefore !== "internal-review" && statusBefore !== "approved-for-sharing") {
      throw new Error(`Unexpected status for approve: ${statusBefore}`);
    }
    const doc = patchRichardRandReleaseDocument(
      normalizeProposalDocument(before.builderDocument),
    );
    const shareCanonical = buildCanonicalProposal({
      id: PROPOSAL_ID,
      proposalNumber: PROPOSAL_NUMBER,
      title: String(before.title ?? ""),
      status: "approved-for-sharing",
      acceptanceMode: String(before.acceptanceMode ?? "accept-and-proceed-to-contract"),
      proposalDate: before.proposalDate as string,
      expiresAt: before.expiresAt as string,
      revisionNumber: Number(before.revisionNumber ?? 1),
      builderDocument: doc,
    });
    const version = Number(before.revisionNumber ?? 1) || 1;
    const existingHistory = Array.isArray(before.versionHistory)
      ? (before.versionHistory as Array<Record<string, unknown>>)
      : [];
    const versionHistory = existingHistory.map((entry) =>
      Number(entry.version) === version
        ? {
            ...entry,
            approvedForSharingAt: new Date().toISOString(),
            notes: "Approved for Richard Rand client delivery.",
            snapshot: shareCanonical,
          }
        : entry,
    );

    const after = (await payload.update({
      collection: "proposals" as never,
      id: PROPOSAL_ID,
      data: {
        status: "approved-for-sharing",
        shareSnapshot: shareCanonical,
        shareApprovedAt: new Date().toISOString(),
        shareApprovedBy: "Matt Lunger",
        versionHistory,
      } as never,
      overrideAccess: true,
    })) as Record<string, unknown>;

    assertDeBoisUnchanged(payload, deBoisUpdatedAt);
    console.log(
      JSON.stringify(
        {
          mode: "production-approve",
          host: PRODUCTION_HOST,
          statusBefore,
          statusAfter: after.status,
          tokenUnchanged: tokenBefore === String(after.publicTokenHash ?? ""),
          acceptedAt: after.acceptedAt ?? null,
          relatedContract: after.relatedContract ?? null,
          paymentStatus: after.paymentStatus ?? null,
        },
        null,
        2,
      ),
    );
    return;
  }

  const normalized = patchRichardRandReleaseDocument(
    normalizeProposalDocument(before.builderDocument),
  );
  const totals = calculateProposalTotals(normalized);
  const legacy = totalsToLegacyFields(totals);
  const shareCanonical = buildCanonicalProposal({
    id: PROPOSAL_ID,
    proposalNumber: PROPOSAL_NUMBER,
    title: String(before.title ?? ""),
    status: previewMode ? String(before.status ?? "approved-for-sharing") : "internal-review",
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
    notes: "Final release — scope boundaries and pagination-ready client copy.",
    createdAt: new Date().toISOString(),
    createdBy: "Matt Lunger",
  });

  const updateData: Record<string, unknown> = {
    builderDocument: normalized,
    shareSnapshot: shareCanonical,
    terms: normalized.terms.proposalTerms,
    timeline: normalized.terms.timelineAssumptions,
    investmentSummary:
      "Personal Heritage & Digital Archive: $6,450 one-time. 50% upon Direct Agreement signature ($3,225), 25% upon design and narrative direction approval ($1,612.50), 25% before production launch ($1,612.50). Annual platform: $314 ($299 hosting + $15 standard .com).",
    investment: legacy.investment,
    pricingSnapshot: legacy.pricingSnapshot,
    versionHistory,
  };

  if (previewMode) {
    updateData.status = "approved-for-sharing";
    if (!before.shareApprovedAt) {
      updateData.shareApprovedAt = new Date().toISOString();
      updateData.shareApprovedBy = "Matt Lunger";
    }
  }

  const after = (await payload.update({
    collection: "proposals" as never,
    id: PROPOSAL_ID,
    data: updateData as never,
    overrideAccess: true,
  })) as Record<string, unknown>;

  assertDeBoisUnchanged(payload, deBoisUpdatedAt);

  const tokenAfter = String(after.publicTokenHash ?? "");
  if (tokenBefore && tokenAfter !== tokenBefore) {
    throw new Error("Public token hash changed");
  }

  console.log(
    JSON.stringify(
      {
        mode: previewMode ? "preview" : "production-content",
        host: previewMode ? PREVIEW_HOST : PRODUCTION_HOST,
        statusBefore,
        statusAfter: after.status,
        initialReleaseOverview: INITIAL_RELEASE_OVERVIEW,
        tokenUnchanged: tokenBefore === tokenAfter,
        acceptedAt: after.acceptedAt ?? null,
        relatedContract: after.relatedContract ?? null,
        paymentStatus: after.paymentStatus ?? null,
      },
      null,
      2,
    ),
  );
}

async function assertDeBoisUnchanged(
  payload: Awaited<ReturnType<typeof import("payload").getPayload>>,
  deBoisUpdatedAt: string,
) {
  const deBoisAfter = (await payload.findByID({
    collection: "proposals" as never,
    id: DE_BOIS_PROPOSAL_ID,
    depth: 0,
    overrideAccess: true,
  })) as Record<string, unknown>;
  if (String(deBoisAfter.updatedAt) !== deBoisUpdatedAt) {
    throw new Error("de Bois proposal changed during release");
  }
}

runRelease().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
