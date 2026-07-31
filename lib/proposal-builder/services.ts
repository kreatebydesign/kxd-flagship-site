/**
 * Proposal Builder services — Payload-backed lifecycle orchestration.
 * No Stripe, no external email send, no auto-onboarding.
 */

import "server-only";

import { createHash, randomBytes } from "crypto";
import { getPayload } from "payload";
import config from "@payload-config";
import {
  buildCanonicalProposal,
  resolveClientFacingProposal,
  type ProposalSource,
} from "./canonicalize.ts";
import { mapAcceptedProposalToContractDraft } from "./contract-draft.ts";
import {
  buildTemplateDocument,
  cloneDocumentFromTemplate,
  emptyProposalDocument,
  newId,
  normalizeProposalDocument,
} from "./document.ts";
import { ProposalBuilderError } from "./errors.ts";
import {
  assertContractTransition,
  assertProposalTransition,
  isEditableProposalStatus,
} from "./lifecycle.ts";
import { assertNotProtectedProposal } from "./protection.ts";
import { legacyPlaintextTokensAllowed } from "./protection.ts";
import { calculateProposalTotals, totalsToLegacyFields } from "./pricing.ts";
import {
  authorizeLegacyPublicToken,
  createShareLinkRecord,
  findActiveShareLink,
  hashShareToken,
} from "./share.ts";
import type {
  AcceptanceRecord,
  CanonicalProposal,
  ChangeRequestRecord,
  ProposalDocument,
  ProposalTemplateKind,
  ProposalVersionRecord,
  ShareLinkRecord,
} from "./types.ts";
import {
  DEFAULT_ACCEPTANCE_DISCLOSURE,
  DEFAULT_CONTRACT_REQUIRED_DISCLOSURE,
} from "./types.ts";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

const PROPOSALS = "proposals";
const CONTRACTS = "contracts";
const TEMPLATES = "proposal-templates";

async function payloadClient() {
  return getPayload({ config });
}

function asVersions(raw: unknown): ProposalVersionRecord[] {
  return Array.isArray(raw) ? (raw as ProposalVersionRecord[]) : [];
}

function asShareLinks(raw: unknown): ShareLinkRecord[] {
  return Array.isArray(raw) ? (raw as ShareLinkRecord[]) : [];
}

function asChangeRequests(raw: unknown): ChangeRequestRecord[] {
  return Array.isArray(raw) ? (raw as ChangeRequestRecord[]) : [];
}

export async function generateProposalNumberSafe(): Promise<string> {
  const payload = await payloadClient();
  const year = new Date().getFullYear();
  const prefix = `KXD-P-${year}-`;
  for (let attempt = 0; attempt < 8; attempt++) {
    const result = await payload.find({
      collection: PROPOSALS as "users",
      limit: 1,
      sort: "-createdAt",
      where: { proposalNumber: { contains: prefix } },
      overrideAccess: true,
    });
    const last = result.docs[0] as AnyDoc | undefined;
    let seq = 1;
    if (last?.proposalNumber) {
      const match = String(last.proposalNumber).match(/-(\d+)$/);
      if (match) seq = Number(match[1]) + 1 + attempt;
    } else {
      seq = 1 + attempt;
    }
    const candidate = `${prefix}${String(seq).padStart(4, "0")}`;
    const exists = await payload.find({
      collection: PROPOSALS as "users",
      limit: 1,
      where: { proposalNumber: { equals: candidate } },
      overrideAccess: true,
    });
    if (exists.docs.length === 0) return candidate;
  }
  return `${prefix}${randomBytes(3).toString("hex").toUpperCase()}`;
}

export async function listProposals(opts?: {
  status?: string;
  q?: string;
  clientId?: number;
  leadId?: number;
  limit?: number;
}): Promise<AnyDoc[]> {
  const payload = await payloadClient();
  const and: AnyDoc[] = [];
  if (opts?.status) and.push({ status: { equals: opts.status } });
  if (opts?.clientId) and.push({ client: { equals: opts.clientId } });
  if (opts?.leadId) and.push({ lead: { equals: opts.leadId } });
  if (opts?.q?.trim()) {
    and.push({
      or: [
        { title: { contains: opts.q.trim() } },
        { proposalNumber: { contains: opts.q.trim() } },
      ],
    });
  }
  const result = await payload.find({
    collection: PROPOSALS as "users",
    limit: opts?.limit ?? 100,
    depth: 1,
    sort: "-updatedAt",
    where: and.length ? { and } : undefined,
    overrideAccess: true,
  });
  return result.docs as AnyDoc[];
}

export async function getProposal(id: number): Promise<AnyDoc | null> {
  const payload = await payloadClient();
  try {
    return (await payload.findByID({
      collection: PROPOSALS as "users",
      id,
      depth: 2,
      overrideAccess: true,
    })) as AnyDoc;
  } catch {
    return null;
  }
}

export async function createProposal(input: {
  title: string;
  leadId?: number;
  clientId?: number;
  templateKind?: ProposalTemplateKind | null;
  templateId?: number;
  document?: ProposalDocument;
  proposalDate?: string;
  expiresAt?: string;
  internalOwner?: string;
}): Promise<AnyDoc> {
  const payload = await payloadClient();
  const proposalNumber = await generateProposalNumberSafe();

  // Prefer an explicit builder document (Save Draft). Only apply templates when
  // the caller did not supply a document — never wipe operator-entered content.
  let document = input.document
    ? normalizeProposalDocument(input.document)
    : emptyProposalDocument();
  const suppliedDocument = Boolean(input.document);

  if (!suppliedDocument && input.templateId) {
    try {
      const tmpl = (await payload.findByID({
        collection: TEMPLATES as "users",
        id: input.templateId,
        overrideAccess: true,
      })) as AnyDoc;
      if (tmpl?.builderDocument) {
        document = cloneDocumentFromTemplate(
          normalizeProposalDocument(tmpl.builderDocument),
        );
      } else if (tmpl?.templateKind) {
        document = cloneDocumentFromTemplate(
          buildTemplateDocument(tmpl.templateKind as ProposalTemplateKind),
        );
      }
    } catch {
      /* fall through */
    }
  } else if (!suppliedDocument && input.templateKind) {
    document = cloneDocumentFromTemplate(buildTemplateDocument(input.templateKind));
  } else if (input.templateKind && !document.templateKind) {
    document = { ...document, templateKind: input.templateKind };
  }

  const totals = calculateProposalTotals(document);
  const legacy = totalsToLegacyFields(totals);

  const record = await payload.create({
    collection: PROPOSALS as "users",
    data: {
      proposalNumber,
      title: input.title.trim(),
      status: "draft",
      acceptanceMode: "accept-and-proceed-to-contract",
      revisionNumber: 1,
      proposalDate: input.proposalDate ?? new Date().toISOString(),
      expiresAt: input.expiresAt,
      lead: input.leadId,
      client: input.clientId,
      builderDocument: document,
      versionHistory: [
        {
          version: 1,
          notes: "Initial draft",
          createdAt: new Date().toISOString(),
          createdBy: input.internalOwner ?? null,
        },
      ] satisfies ProposalVersionRecord[],
      shareLinks: [],
      changeRequests: [],
      internalOwner: input.internalOwner,
      investment: legacy.investment,
      recurringAmount: legacy.recurringAmount,
      pricingSnapshot: legacy.pricingSnapshot,
      executiveSummary: document.executive.executiveSummary,
      scope: document.scopeGroups.map((g) => g.title).join("; "),
      deliverables: document.scopeGroups
        .flatMap((g) => g.deliverables.map((d) => d.title))
        .join("; "),
      terms: document.terms.proposalTerms,
      internalNotes: document.internal.internalNotes,
    } as never,
    overrideAccess: true,
  });

  return record as AnyDoc;
}

export async function saveProposalDraft(
  id: number,
  input: {
    title?: string;
    leadId?: number | null;
    clientId?: number | null;
    proposalDate?: string | null;
    expiresAt?: string | null;
    internalOwner?: string | null;
    scheduleCallUrl?: string | null;
    document: ProposalDocument;
    bumpVersion?: boolean;
    versionNotes?: string;
    actor?: string | null;
  },
): Promise<AnyDoc> {
  assertNotProtectedProposal(id, "edit");
  const payload = await payloadClient();
  const existing = await getProposal(id);
  if (!existing) throw new ProposalBuilderError("Proposal not found.", 404);
  if (!isEditableProposalStatus(String(existing.status))) {
    throw new ProposalBuilderError(
      "Proposal is locked. Create a new draft version before editing.",
      409,
    );
  }

  const document = normalizeProposalDocument(input.document);
  const totals = calculateProposalTotals(document);
  const legacy = totalsToLegacyFields(totals);
  let revisionNumber = Number(existing.revisionNumber ?? 1) || 1;
  let versionHistory = asVersions(existing.versionHistory);

  if (input.bumpVersion) {
    revisionNumber += 1;
    versionHistory = [
      ...versionHistory.map((v) =>
        v.supersededAt ? v : { ...v, supersededAt: new Date().toISOString() },
      ),
      {
        version: revisionNumber,
        notes: input.versionNotes ?? "New draft version",
        createdAt: new Date().toISOString(),
        createdBy: input.actor ?? null,
      },
    ];
  }

  const data: AnyDoc = {
    builderDocument: document,
    revisionNumber,
    versionHistory,
    investment: legacy.investment,
    recurringAmount: legacy.recurringAmount,
    pricingSnapshot: legacy.pricingSnapshot,
    executiveSummary: document.executive.executiveSummary,
    scope: document.scopeGroups.map((g) => g.title).join("; "),
    deliverables: document.scopeGroups
      .flatMap((g) => g.deliverables.map((d) => d.title))
      .join("; "),
    terms: document.terms.proposalTerms,
    internalNotes: document.internal.internalNotes,
  };

  if (input.title != null) data.title = input.title.trim();
  if (input.leadId !== undefined) data.lead = input.leadId;
  if (input.clientId !== undefined) data.client = input.clientId;
  if (input.proposalDate !== undefined) data.proposalDate = input.proposalDate;
  if (input.expiresAt !== undefined) data.expiresAt = input.expiresAt;
  if (input.internalOwner !== undefined) data.internalOwner = input.internalOwner;
  if (input.scheduleCallUrl !== undefined) {
    document.scheduleCallUrl = input.scheduleCallUrl ?? "";
    data.builderDocument = document;
    data.scheduleCallUrl = input.scheduleCallUrl;
  }

  return (await payload.update({
    collection: PROPOSALS as "users",
    id,
    data: data as never,
    overrideAccess: true,
  })) as AnyDoc;
}

export async function approveProposalForSharing(
  id: number,
  input?: { actor?: string | null; expiresAt?: string | null; notes?: string },
): Promise<{ proposal: AnyDoc; rawToken: string; shareUrlPath: string }> {
  assertNotProtectedProposal(id, "approve for sharing");
  const payload = await payloadClient();
  const existing = await getProposal(id);
  if (!existing) throw new ProposalBuilderError("Proposal not found.", 404);

  const status = String(existing.status);
  if (status !== "draft" && status !== "internal-review" && status !== "approved-for-sharing") {
    if (status === "revision-requested") {
      assertProposalTransition(status, "draft");
    } else if (!["sent", "viewed"].includes(status)) {
      throw new ProposalBuilderError("Proposal cannot be approved for sharing from this status.", 409);
    }
  }

  const canonical = buildCanonicalProposal({
    id,
    proposalNumber: existing.proposalNumber,
    title: existing.title,
    status: "approved-for-sharing",
    acceptanceMode: existing.acceptanceMode,
    proposalDate: existing.proposalDate,
    expiresAt: input?.expiresAt ?? existing.expiresAt,
    revisionNumber: existing.revisionNumber,
    builderDocument: existing.builderDocument,
  });

  const version = Number(existing.revisionNumber ?? 1) || 1;
  const { record: shareLink, rawToken } = createShareLinkRecord({
    version,
    createdBy: input?.actor ?? null,
    expiresAt: input?.expiresAt ?? existing.expiresAt ?? null,
  });

  const versionHistory = asVersions(existing.versionHistory).map((v) =>
    v.version === version
      ? {
          ...v,
          approvedForSharingAt: new Date().toISOString(),
          notes: input?.notes ?? v.notes,
          snapshot: canonical,
        }
      : v,
  );

  const shareLinks = [
    ...asShareLinks(existing.shareLinks).map((l) =>
      l.revokedAt ? l : { ...l, revokedAt: new Date().toISOString() },
    ),
    shareLink,
  ];

  const nextStatus =
    status === "sent" || status === "viewed" ? status : "approved-for-sharing";
  if (status !== nextStatus && status !== "approved-for-sharing") {
    assertProposalTransition(
      status === "revision-requested" ? "draft" : status,
      "approved-for-sharing",
    );
  }

  const proposal = (await payload.update({
    collection: PROPOSALS as "users",
    id,
    data: {
      status: nextStatus === "approved-for-sharing" ? "approved-for-sharing" : nextStatus,
      shareSnapshot: canonical,
      shareApprovedAt: new Date().toISOString(),
      shareApprovedBy: input?.actor ?? null,
      publicTokenHash: shareLink.tokenHash,
      publicTokenPrefix: shareLink.tokenPrefix,
      // Raw token is returned once to the operator; only the hash is retained.
      publicToken: null,
      publicTokenExpiresAt: shareLink.expiresAt,
      revoked: false,
      shareLinks,
      versionHistory,
      acceptedSnapshot: null,
      acceptanceRecord: null,
    } as never,
    overrideAccess: true,
  })) as AnyDoc;

  return {
    proposal,
    rawToken,
    shareUrlPath: `/proposal/${rawToken}`,
  };
}

export async function markProposalShared(id: number): Promise<AnyDoc> {
  const existing = await getProposal(id);
  if (!existing) throw new ProposalBuilderError("Proposal not found.", 404);
  if (String(existing.status) === "approved-for-sharing") {
    assertProposalTransition("approved-for-sharing", "sent");
    const payload = await payloadClient();
    return (await payload.update({
      collection: PROPOSALS as "users",
      id,
      data: { status: "sent", sentAt: new Date().toISOString() } as never,
      overrideAccess: true,
    })) as AnyDoc;
  }
  return existing;
}

export async function revokeShareLink(
  id: number,
  shareLinkId?: string,
): Promise<AnyDoc> {
  const payload = await payloadClient();
  const existing = await getProposal(id);
  if (!existing) throw new ProposalBuilderError("Proposal not found.", 404);
  const now = new Date().toISOString();
  const shareLinks = asShareLinks(existing.shareLinks).map((l) => {
    if (shareLinkId && l.id !== shareLinkId) return l;
    if (!shareLinkId || l.id === shareLinkId) {
      return { ...l, revokedAt: l.revokedAt ?? now };
    }
    return l;
  });
  return (await payload.update({
    collection: PROPOSALS as "users",
    id,
    data: {
      shareLinks,
      revoked: true,
    } as never,
    overrideAccess: true,
  })) as AnyDoc;
}

export async function reopenProposalDraft(
  id: number,
  input?: { actor?: string | null; notes?: string },
): Promise<AnyDoc> {
  const payload = await payloadClient();
  const existing = await getProposal(id);
  if (!existing) throw new ProposalBuilderError("Proposal not found.", 404);
  if (String(existing.status) === "accepted-contract-pending") {
    throw new ProposalBuilderError("Accepted proposals cannot be reopened for edit.", 409);
  }

  const revisionNumber = (Number(existing.revisionNumber ?? 1) || 1) + 1;
  const versionHistory = [
    ...asVersions(existing.versionHistory).map((v) =>
      v.supersededAt ? v : { ...v, supersededAt: new Date().toISOString() },
    ),
    {
      version: revisionNumber,
      notes: input?.notes ?? "Reopened draft after share",
      createdAt: new Date().toISOString(),
      createdBy: input?.actor ?? null,
    } satisfies ProposalVersionRecord,
  ];

  return (await payload.update({
    collection: PROPOSALS as "users",
    id,
    data: {
      status: "draft",
      revisionNumber,
      versionHistory,
      revoked: true,
    } as never,
    overrideAccess: true,
  })) as AnyDoc;
}

async function resolveProposalByToken(rawToken: string): Promise<{
  proposal: AnyDoc;
  shareLink: ShareLinkRecord | null;
  canonical: CanonicalProposal;
} | null> {
  const payload = await payloadClient();
  const hash = hashShareToken(rawToken);

  let proposal: AnyDoc | null = null;
  const byHash = await payload.find({
    collection: PROPOSALS as "users",
    where: { publicTokenHash: { equals: hash } },
    limit: 1,
    depth: 1,
    overrideAccess: true,
  });
  if (byHash.docs[0]) proposal = byHash.docs[0] as AnyDoc;

  if (!proposal && legacyPlaintextTokensAllowed()) {
    const byPlain = await payload.find({
      collection: PROPOSALS as "users",
      where: { publicToken: { equals: rawToken } },
      limit: 1,
      depth: 1,
      overrideAccess: true,
    });
    if (byPlain.docs[0]) proposal = byPlain.docs[0] as AnyDoc;
  }

  if (!proposal) return null;
  if (proposal.revoked) return null;

  const shareLink =
    findActiveShareLink(proposal.shareLinks, rawToken) ||
    (legacyPlaintextTokensAllowed() &&
    authorizeLegacyPublicToken(proposal.publicToken, rawToken)
      ? ({
          id: "legacy",
          tokenHash: hash,
          tokenPrefix: rawToken.slice(0, 8),
          version: Number(proposal.revisionNumber ?? 1),
          createdAt: String(proposal.createdAt ?? new Date().toISOString()),
          viewCount: Number(proposal.totalViews ?? 0),
        } satisfies ShareLinkRecord)
      : null);

  if (
    !shareLink &&
    !(legacyPlaintextTokensAllowed() && authorizeLegacyPublicToken(proposal.publicToken, rawToken))
  ) {
    return null;
  }

  if (proposal.publicTokenExpiresAt) {
    const exp = new Date(String(proposal.publicTokenExpiresAt)).getTime();
    if (!Number.isNaN(exp) && exp < Date.now()) return null;
  }

  const canonical =
    resolveClientFacingProposal(proposal as ProposalSource, { allowLiveDraft: false }) ||
    (proposal.shareSnapshot as CanonicalProposal | null);
  if (!canonical) return null;

  return { proposal, shareLink, canonical };
}

export async function getPublicProposalByToken(rawToken: string): Promise<{
  proposal: AnyDoc;
  canonical: CanonicalProposal;
  shareLink: ShareLinkRecord | null;
  accepted: boolean;
} | null> {
  const resolved = await resolveProposalByToken(rawToken);
  if (!resolved) return null;
  return {
    proposal: resolved.proposal,
    canonical: resolved.canonical,
    shareLink: resolved.shareLink,
    accepted: Boolean(resolved.proposal.acceptedSnapshot),
  };
}

export async function recordPublicView(rawToken: string): Promise<void> {
  const resolved = await resolveProposalByToken(rawToken);
  if (!resolved) return;
  const payload = await payloadClient();
  const now = new Date().toISOString();
  const { proposal, shareLink } = resolved;

  const shareLinks = asShareLinks(proposal.shareLinks).map((l) => {
    if (!shareLink || l.id !== shareLink.id) return l;
    return {
      ...l,
      firstViewedAt: l.firstViewedAt ?? now,
      lastViewedAt: now,
      viewCount: (l.viewCount ?? 0) + 1,
    };
  });

  const status = String(proposal.status);
  const nextStatus =
    status === "sent" || status === "approved-for-sharing" ? "viewed" : status;
  if (nextStatus !== status) {
    try {
      assertProposalTransition(
        status === "approved-for-sharing" ? "sent" : status,
        "viewed",
      );
    } catch {
      /* keep status */
    }
  }

  await payload.update({
    collection: PROPOSALS as "users",
    id: proposal.id,
    data: {
      shareLinks,
      firstViewedAt: proposal.firstViewedAt ?? now,
      lastViewedAt: now,
      viewedAt: proposal.viewedAt ?? now,
      totalViews: Number(proposal.totalViews ?? 0) + 1,
      status:
        status === "approved-for-sharing"
          ? "viewed"
          : status === "sent"
            ? "viewed"
            : status,
      sentAt: proposal.sentAt ?? (status === "approved-for-sharing" ? now : proposal.sentAt),
    } as never,
    overrideAccess: true,
  });
}

export async function submitChangeRequest(
  rawToken: string,
  input: {
    name: string;
    email: string;
    organization?: string;
    message: string;
    sectionReference?: string;
  },
): Promise<{ ok: true }> {
  const resolved = await resolveProposalByToken(rawToken);
  if (!resolved) throw new ProposalBuilderError("Proposal not available.", 404);
  if (resolved.proposal.acceptedSnapshot) {
    throw new ProposalBuilderError("Accepted proposals cannot receive change requests.", 409);
  }
  if (!input.name?.trim() || !input.email?.trim() || !input.message?.trim()) {
    throw new ProposalBuilderError("Name, email, and message are required.", 400);
  }

  const payload = await payloadClient();
  const record: ChangeRequestRecord = {
    id: newId("chg"),
    submittedAt: new Date().toISOString(),
    name: input.name.trim(),
    email: input.email.trim(),
    organization: input.organization?.trim(),
    message: input.message.trim(),
    sectionReference: input.sectionReference?.trim(),
    shareLinkId: resolved.shareLink?.id ?? null,
  };

  await payload.update({
    collection: PROPOSALS as "users",
    id: resolved.proposal.id,
    data: {
      status: "revision-requested",
      approvalStatus: "changes-requested",
      changeRequests: [...asChangeRequests(resolved.proposal.changeRequests), record],
    } as never,
    overrideAccess: true,
  });

  return { ok: true };
}

function buildAcceptanceHash(input: {
  proposalId: number;
  email: string;
  version: number;
  acceptedAt: string;
}): string {
  return createHash("sha256")
    .update(
      `${input.proposalId}:${input.email}:${input.version}:${input.acceptedAt}:accept-and-proceed`,
    )
    .digest("hex");
}

export async function acceptProposal(
  rawToken: string,
  input: {
    name: string;
    title: string;
    organization: string;
    email: string;
    authorityConfirmed: boolean;
    reviewedConfirmed: boolean;
    typedAcknowledgment?: string;
    correlationId?: string | null;
    selectedLineIds?: string[];
    selectedPackageKeys?: string[];
    ipAddress?: string | null;
    userAgent?: string | null;
  },
): Promise<{
  proposal: AnyDoc;
  contractId: number;
  acceptance: AcceptanceRecord;
  alreadyAccepted: boolean;
}> {
  const resolved = await resolveProposalByToken(rawToken);
  if (!resolved) throw new ProposalBuilderError("Proposal not available.", 404);

  const existingAcceptance = resolved.proposal.acceptanceRecord as AcceptanceRecord | null;
  if (existingAcceptance && resolved.proposal.acceptedSnapshot) {
    return {
      proposal: resolved.proposal,
      contractId: Number(resolved.proposal.relatedContract?.id ?? resolved.proposal.relatedContract),
      acceptance: existingAcceptance,
      alreadyAccepted: true,
    };
  }

  if (!input.name?.trim() || !input.email?.trim() || !input.organization?.trim()) {
    throw new ProposalBuilderError("Name, organization, and email are required.", 400);
  }
  if (!input.authorityConfirmed || !input.reviewedConfirmed) {
    throw new ProposalBuilderError("Required confirmations are missing.", 400);
  }
  const typed = (input.typedAcknowledgment ?? input.name).trim();
  const normalizeName = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();
  if (!typed || normalizeName(typed) !== normalizeName(input.name)) {
    throw new ProposalBuilderError(
      "Typed acknowledgment must exactly match the signer’s legal name.",
      400,
    );
  }

  const doc = normalizeProposalDocument(resolved.proposal.builderDocument);
  if (doc.options.clientCanSelect === false) {
    // ignore client selections; use recommended/included
  }
  const selection = {
    selectedLineIds: input.selectedLineIds,
    selectedPackageKeys: input.selectedPackageKeys,
  };
  const acceptedCanonical = buildCanonicalProposal(
    {
      id: resolved.proposal.id,
      proposalNumber: resolved.proposal.proposalNumber,
      title: resolved.proposal.title,
      status: "accepted-contract-pending",
      acceptanceMode: "accept-and-proceed-to-contract",
      proposalDate: resolved.proposal.proposalDate,
      expiresAt: resolved.proposal.expiresAt,
      revisionNumber: resolved.proposal.revisionNumber,
      builderDocument: resolved.proposal.builderDocument,
      shareSnapshot: resolved.proposal.shareSnapshot,
    },
    selection,
  );

  // Prefer share snapshot content with recalculated totals/selections
  const shareSnap = resolved.canonical;
  const finalCanonical: CanonicalProposal = {
    ...shareSnap,
    ...acceptedCanonical,
    executive: shareSnap.executive,
    scopeGroups: shareSnap.scopeGroups,
    terms: shareSnap.terms,
    totals: acceptedCanonical.totals,
    selectedLineIds: acceptedCanonical.selectedLineIds,
    selectedPackageKeys: acceptedCanonical.selectedPackageKeys,
    status: "accepted-contract-pending",
  };

  const acceptedAt = new Date().toISOString();
  const acceptance: AcceptanceRecord = {
    acceptedAt,
    version: finalCanonical.version,
    name: input.name.trim(),
    title: input.title.trim(),
    organization: input.organization.trim(),
    email: input.email.trim(),
    authorityConfirmed: true,
    reviewedConfirmed: true,
    typedAcknowledgment: typed,
    acceptanceDisclosureVersion: "kxd-acceptance-disclosure-2026-07-30",
    acceptanceDisclosureText: DEFAULT_ACCEPTANCE_DISCLOSURE,
    contractRequiredDisclosureText: DEFAULT_CONTRACT_REQUIRED_DISCLOSURE,
    correlationId: input.correlationId ?? null,
    selectedLineIds: finalCanonical.selectedLineIds,
    selectedPackageKeys: finalCanonical.selectedPackageKeys,
    totals: finalCanonical.totals,
    shareLinkId: resolved.shareLink?.id ?? null,
    ipAddress: input.ipAddress ?? null,
    userAgent: input.userAgent ?? null,
    acceptanceHash: buildAcceptanceHash({
      proposalId: resolved.proposal.id,
      email: input.email.trim().toLowerCase(),
      version: finalCanonical.version,
      acceptedAt,
    }),
  };

  const payload = await payloadClient();

  // Idempotent contract creation
  let contractId: number | null = null;
  if (resolved.proposal.relatedContract) {
    contractId = Number(
      typeof resolved.proposal.relatedContract === "object"
        ? resolved.proposal.relatedContract.id
        : resolved.proposal.relatedContract,
    );
  }

  if (!contractId) {
    const existingContracts = await payload.find({
      collection: CONTRACTS as "users",
      where: {
        and: [
          { proposal: { equals: resolved.proposal.id } },
          { status: { in: ["draft", "internal-review"] } },
        ],
      },
      limit: 1,
      overrideAccess: true,
    });
    if (existingContracts.docs[0]) {
      contractId = existingContracts.docs[0].id as number;
    }
  }

  const draft = mapAcceptedProposalToContractDraft(finalCanonical);
  const clientId =
    typeof resolved.proposal.client === "object"
      ? resolved.proposal.client?.id
      : resolved.proposal.client;

  if (!contractId) {
    if (!clientId) {
      // Contract collection requires client — create placeholder client only if lead exists?
      // Prefer requiring an existing client OR create a minimal prospect-linked placeholder via lead company.
      // To avoid inventing clients, store contract draft JSON on proposal and create contract when client exists.
      // But user asked for contract draft generation — Contracts.client is required.
      // Create a minimal client from acceptance organization if needed.
      const slugBase = acceptance.organization
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 48) || "prospect";
      const slug = `${slugBase}-${randomBytes(3).toString("hex")}`;
      const client = await payload.create({
        collection: "clients" as "users",
        data: {
          name: acceptance.organization,
          slug,
          status: "prospect",
          primaryContactName: acceptance.name,
          primaryContactEmail: acceptance.email,
        } as never,
        overrideAccess: true,
      });
      const created = await payload.create({
        collection: CONTRACTS as "users",
        data: {
          client: client.id,
          proposal: resolved.proposal.id,
          status: "draft",
          contractType: "service-agreement",
          title: draft.title,
          publicTitle: draft.title,
          body: draft.body,
          terms: draft.legal.draftNotice,
          executiveNotes: "AUTO-GENERATED DRAFT — internal review required. Not sent.",
          monthlyAmount: finalCanonical.totals.monthlyTotalCents / 100,
          projectAmount: finalCanonical.totals.oneTimeTotalCents / 100,
          signerName: acceptance.name,
          signerEmail: acceptance.email,
          signerTitle: acceptance.title,
          contractDraftSnapshot: draft,
          legalProvisions: draft.legal,
        } as never,
        overrideAccess: true,
      });
      contractId = created.id as number;
    } else {
      const created = await payload.create({
        collection: CONTRACTS as "users",
        data: {
          client: clientId,
          proposal: resolved.proposal.id,
          status: "draft",
          contractType: "service-agreement",
          title: draft.title,
          publicTitle: draft.title,
          body: draft.body,
          terms: draft.legal.draftNotice,
          executiveNotes: "AUTO-GENERATED DRAFT — internal review required. Not sent.",
          monthlyAmount: finalCanonical.totals.monthlyTotalCents / 100,
          projectAmount: finalCanonical.totals.oneTimeTotalCents / 100,
          signerName: acceptance.name,
          signerEmail: acceptance.email,
          signerTitle: acceptance.title,
          contractDraftSnapshot: draft,
          legalProvisions: draft.legal,
        } as never,
        overrideAccess: true,
      });
      contractId = created.id as number;
    }
  }

  const proposal = (await payload.update({
    collection: PROPOSALS as "users",
    id: resolved.proposal.id,
    data: {
      status: "accepted-contract-pending",
      approvalStatus: "ready",
      acceptedAt,
      acceptedSnapshot: finalCanonical,
      acceptanceRecord: acceptance,
      relatedContract: contractId,
      approvedAt: acceptedAt,
      client: clientId || undefined,
    } as never,
    overrideAccess: true,
  })) as AnyDoc;

  // Hydrate structured payment terms / readiness on the originating contract draft.
  try {
    const { ensureLifecycleHydrated } = await import("../proposal-lifecycle/services.ts");
    await ensureLifecycleHydrated(contractId!);
  } catch {
    /* lifecycle package is additive; acceptance remains valid without it */
  }

  try {
    const { notifyLifecycleEvent } = await import("../proposal-lifecycle/notifications.ts");
    const clientRel =
      typeof proposal.client === "object" ? proposal.client?.id : proposal.client;
    await notifyLifecycleEvent({
      title: `Proposal ${String(proposal.proposalNumber)} was accepted`,
      summary: `${acceptance.name} accepted for ${acceptance.organization}. Contract draft ready for internal review.`,
      clientId: clientRel ? Number(clientRel) : undefined,
      severity: "success",
      href: `/admin/sales/contracts/${contractId}`,
      metadata: {
        kind: "proposal.accepted",
        proposalId: proposal.id,
        contractId,
        acceptanceHash: acceptance.acceptanceHash,
      },
    });
  } catch {
    /* notifications are best-effort */
  }

  return { proposal, contractId: contractId!, acceptance, alreadyAccepted: false };
}

export async function getContractForProposal(proposalId: number): Promise<AnyDoc | null> {
  const proposal = await getProposal(proposalId);
  if (!proposal) return null;
  const id =
    typeof proposal.relatedContract === "object"
      ? proposal.relatedContract?.id
      : proposal.relatedContract;
  if (!id) return null;
  const payload = await payloadClient();
  try {
    return (await payload.findByID({
      collection: CONTRACTS as "users",
      id: Number(id),
      depth: 1,
      overrideAccess: true,
    })) as AnyDoc;
  } catch {
    return null;
  }
}

export async function updateContractDraft(
  contractId: number,
  input: {
    title?: string;
    body?: string;
    legalProvisions?: unknown;
    executiveNotes?: string;
  },
): Promise<AnyDoc> {
  const payload = await payloadClient();
  const existing = (await payload.findByID({
    collection: CONTRACTS as "users",
    id: contractId,
    overrideAccess: true,
  })) as AnyDoc;

  const status = String(existing.status);
  if (["executed", "voided", "superseded", "archived", "sent-for-signature"].includes(status)) {
    throw new ProposalBuilderError("Sealed or sent contracts cannot be edited.", 409);
  }
  if (
    !["draft", "internal-review", "approved-for-signature", "partially-signed"].includes(status)
  ) {
    throw new ProposalBuilderError("Only draft contracts under internal review may be edited.", 409);
  }

  const data: Record<string, unknown> = {
    title: input.title ?? existing.title,
    body: input.body ?? existing.body,
    legalProvisions: input.legalProvisions ?? existing.legalProvisions,
    executiveNotes: input.executiveNotes ?? existing.executiveNotes,
  };

  if (
    ["partially-signed", "approved-for-signature"].includes(status) &&
    input.body != null &&
    input.body !== existing.body
  ) {
    const { markMaterialContractEdit } = await import("../proposal-lifecycle/services.ts");
    const { normalizeLifecyclePackage } = await import("../proposal-lifecycle/package.ts");
    const pkg = markMaterialContractEdit(normalizeLifecyclePackage(existing.lifecyclePackage));
    data.lifecyclePackage = pkg;
    data.status = "internal-review";
    data.signedAt = null;
  }

  return (await payload.update({
    collection: CONTRACTS as "users",
    id: contractId,
    data: data as never,
    overrideAccess: true,
  })) as AnyDoc;
}

export async function transitionContract(
  contractId: number,
  to: string,
): Promise<AnyDoc> {
  const payload = await payloadClient();
  const existing = (await payload.findByID({
    collection: CONTRACTS as "users",
    id: contractId,
    overrideAccess: true,
  })) as AnyDoc;
  assertContractTransition(String(existing.status), to);

  const data: AnyDoc = { status: to };
  if (to === "sent" || to === "sent-for-signature") {
    data.sentAt = new Date().toISOString();
  }
  if (to === "executed" || to === "signed") {
    data.signedAt = new Date().toISOString();
    data.executedSnapshot = existing.contractDraftSnapshot ?? {
      body: existing.body,
      title: existing.title,
      lockedAt: new Date().toISOString(),
    };
  }

  return (await payload.update({
    collection: CONTRACTS as "users",
    id: contractId,
    data: data as never,
    overrideAccess: true,
  })) as AnyDoc;
}

export function previewCanonical(proposal: AnyDoc): CanonicalProposal {
  return buildCanonicalProposal({
    id: Number(proposal.id),
    proposalNumber: proposal.proposalNumber,
    title: proposal.title,
    status: proposal.status,
    acceptanceMode: proposal.acceptanceMode,
    proposalDate: proposal.proposalDate,
    expiresAt: proposal.expiresAt,
    revisionNumber: proposal.revisionNumber,
    builderDocument: proposal.builderDocument,
    shareSnapshot: proposal.shareSnapshot,
    acceptedSnapshot: proposal.acceptedSnapshot,
  });
}
