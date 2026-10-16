/**
 * Regenerate a draft contract from the accepted proposal snapshot + optional
 * contract-only commercial amendments. Never mutates acceptedSnapshot.
 */

import { getPayload } from "payload";
import config from "@payload-config";
import { mapAcceptedProposalToContractDraft } from "../proposal-builder/contract-draft.ts";
import type { CanonicalProposal } from "../proposal-builder/types.ts";
import {
  assertContractReadyForSignature,
  assessContractSignatureReadiness,
  readLegalJurisdictionConfig,
} from "../commercial-legal/contract-signature-readiness.ts";
import {
  isContractCommercialAmendments,
  reconcileAmendedSchedule,
  type ContractCommercialAmendments,
} from "./commercial-amendments.ts";
import { assertContractTransition } from "../proposal-builder/lifecycle.ts";
import { toClientFacingContractBody } from "./client-facing-contract.ts";
import { computeDocumentHash, hashPaymentTerms, invalidateSignaturesOnMaterialEdit } from "./executed-seal.ts";
import { stableJsonHash } from "./hash.ts";
import { appendAudit, normalizeLifecyclePackage } from "./package.ts";
import { deriveStructuredPaymentTerms, reconcileInstallments } from "./structured-payment-terms.ts";
import type { ContractLifecyclePackage, TypedSignatureEvidence } from "./types.ts";

type AnyDoc = Record<string, unknown> & { id: number };

const CONTRACTS = "contracts";
const PROPOSALS = "proposals";

const MUTABLE_CONTRACT_STATUSES = new Set(["draft", "internal-review"]);

/** Correct agreement text without voiding the contract record or mutating acceptedSnapshot. */
const CORRECTABLE_CONTRACT_STATUSES = new Set([
  "draft",
  "internal-review",
  "approved-for-signature",
  "partially-signed",
]);

async function payloadClient() {
  return getPayload({ config });
}

export type RegenerateContractDraftResult = {
  proposalId: number;
  contractId: number;
  contractStatus: string;
  proposalStatus: string;
  acceptedOneTimeTotalCents: number;
  scheduleSumCents: number;
  scheduleOk: boolean;
  monthlyTotalCents: number;
  recurringStartPending: boolean;
  signatureReadiness: ReturnType<typeof assessContractSignatureReadiness>;
  dryRun: boolean;
  bodyPreview: string;
  amendmentsReason: string | null;
};

function asId(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (value && typeof value === "object" && "id" in value) {
    const id = Number((value as { id: unknown }).id);
    return Number.isFinite(id) ? id : null;
  }
  return null;
}

export async function regenerateContractDraftFromAccepted(input: {
  proposalId: number;
  amendments?: ContractCommercialAmendments | null;
  actor?: string | null;
  /** When true, compute and return without writing. */
  dryRun?: boolean;
  /** Extra safety: required client name substring. */
  requireClientNameIncludes?: string;
  /** Extra safety: required proposal number. */
  requireProposalNumber?: string;
}): Promise<RegenerateContractDraftResult> {
  const payload = await payloadClient();
  const proposal = (await payload.findByID({
    collection: PROPOSALS as never,
    id: input.proposalId,
    depth: 1,
    overrideAccess: true,
  })) as AnyDoc;

  const proposalNumber = String(proposal.proposalNumber ?? "");
  if (input.requireProposalNumber && proposalNumber !== input.requireProposalNumber) {
    throw new Error(
      `Proposal number mismatch: expected ${input.requireProposalNumber}, got ${proposalNumber}`,
    );
  }

  const accepted = proposal.acceptedSnapshot as CanonicalProposal | null | undefined;
  if (!accepted || typeof accepted !== "object") {
    throw new Error("Proposal has no acceptedSnapshot — refuse to regenerate.");
  }

  const clientName =
    typeof proposal.client === "object" && proposal.client
      ? String((proposal.client as { name?: string }).name ?? "")
      : String(accepted.primaryOrganization ?? "");
  if (
    input.requireClientNameIncludes &&
    !clientName.toLowerCase().includes(input.requireClientNameIncludes.toLowerCase())
  ) {
    throw new Error(
      `Client name safety check failed: expected to include "${input.requireClientNameIncludes}", got "${clientName}"`,
    );
  }

  let contractId = asId(proposal.relatedContract);
  if (!contractId) {
    const existing = await payload.find({
      collection: CONTRACTS as never,
      where: {
        and: [
          { proposal: { equals: input.proposalId } },
          { status: { in: ["draft", "internal-review"] } },
        ],
      },
      limit: 1,
      overrideAccess: true,
    });
    const doc = existing.docs[0] as { id?: number } | undefined;
    contractId = doc?.id != null ? Number(doc.id) : null;
  }

  if (!contractId) {
    throw new Error("No related draft/internal-review contract found for this proposal.");
  }

  const contract = (await payload.findByID({
    collection: CONTRACTS as never,
    id: contractId,
    depth: 0,
    overrideAccess: true,
  })) as AnyDoc;

  const contractStatus = String(contract.status ?? "");
  if (!MUTABLE_CONTRACT_STATUSES.has(contractStatus)) {
    throw new Error(
      `Contract status "${contractStatus}" is not editable for regeneration (must be draft or internal-review).`,
    );
  }

  const amendments = input.amendments ?? null;
  if (amendments && !isContractCommercialAmendments(amendments)) {
    throw new Error("Invalid commercial amendments payload.");
  }
  if (amendments) {
    const recon = reconcileAmendedSchedule(amendments);
    if (!recon.ok) {
      throw new Error(
        `Amended schedule sum ${recon.sumCents} does not equal project total ${amendments.projectOneTimeTotalCents}`,
      );
    }
    if (amendments.projectOneTimeTotalCents !== accepted.totals.oneTimeTotalCents) {
      throw new Error(
        `Amendments project total ${amendments.projectOneTimeTotalCents} must match accepted one-time total ${accepted.totals.oneTimeTotalCents}`,
      );
    }
  }

  const draft = mapAcceptedProposalToContractDraft(accepted, { amendments, contractId });
  const acceptanceHash =
    (proposal.acceptanceRecord as { acceptanceHash?: string } | null)?.acceptanceHash;
  const terms = deriveStructuredPaymentTerms(accepted, acceptanceHash, amendments);
  const installmentRecon = reconcileInstallments(terms);
  if (!installmentRecon.ok) {
    throw new Error(
      `Installment sum ${installmentRecon.sumCents} != one-time total ${terms.oneTimeTotalCents}`,
    );
  }

  const recurringStartPending =
    terms.recurring.startBillingDateStatus === "pending-confirmation" &&
    terms.monthlyTotalCents > 0;

  const signatureReadiness = assessContractSignatureReadiness({
    legal: draft.legal,
    body: draft.body,
    jurisdiction: readLegalJurisdictionConfig(),
    recurringStartPending,
  });

  const result: RegenerateContractDraftResult = {
    proposalId: input.proposalId,
    contractId,
    contractStatus,
    proposalStatus: String(proposal.status ?? ""),
    acceptedOneTimeTotalCents: accepted.totals.oneTimeTotalCents,
    scheduleSumCents: installmentRecon.sumCents,
    scheduleOk: installmentRecon.ok,
    monthlyTotalCents: terms.monthlyTotalCents,
    recurringStartPending,
    signatureReadiness,
    dryRun: Boolean(input.dryRun),
    bodyPreview: draft.body.slice(0, 1200),
    amendmentsReason: amendments?.reason ?? null,
  };

  if (input.dryRun) {
    return result;
  }

  let pkg = normalizeLifecyclePackage(contract.lifecyclePackage);
  pkg = {
    ...pkg,
    commercialAmendments: amendments,
    structuredPaymentTerms: terms,
    commercialSource: "proposal",
    // Clear stale billing plan so obligations rebuild from amended terms later.
    billingPlan: null,
  };
  pkg = appendAudit(pkg, {
    actor: input.actor ?? "system",
    action: "contract.regenerated-from-accepted-with-amendments",
    fromStatus: contractStatus,
    toStatus: contractStatus,
    reason: amendments?.reason ?? "Regenerated contract draft from accepted snapshot",
  });

  const monthlyDollars = terms.monthlyTotalCents / 100;
  const projectDollars = accepted.totals.oneTimeTotalCents / 100;

  await payload.update({
    collection: CONTRACTS as never,
    id: contractId,
    data: {
      title: draft.title,
      publicTitle: draft.title,
      body: draft.body,
      terms: draft.legal.draftNotice,
      executiveNotes:
        "AUTO-GENERATED DRAFT — internal review required. Not attorney-approved. Not sent.",
      monthlyAmount: monthlyDollars,
      projectAmount: projectDollars,
      contractDraftSnapshot: draft,
      legalProvisions: draft.legal,
      lifecyclePackage: pkg,
      status: "draft",
    } as never,
    overrideAccess: true,
  });

  // Proposal accepted snapshot / status intentionally untouched.
  return { ...result, dryRun: false };
}

/** Used by Approve for signature paths. */
export function assertMutableContractReadyForSignature(input: {
  body?: string | null;
  legal?: unknown;
  pkg?: ContractLifecyclePackage | null;
}): void {
  const recurringStartPending =
    input.pkg?.structuredPaymentTerms?.recurring?.startBillingDateStatus ===
      "pending-confirmation" &&
    Number(input.pkg?.structuredPaymentTerms?.monthlyTotalCents ?? 0) > 0;

  // Recurring start is a warning, not a hard block — assess separately for UI.
  assertContractReadyForSignature({
    body: input.body,
    legal: input.legal as never,
    jurisdiction: readLegalJurisdictionConfig(),
  });

  void recurringStartPending;
}

export type CorrectContractAgreementResult = RegenerateContractDraftResult & {
  previousOperatorDocumentHash: string | null;
  newClientFacingDocumentHash: string | null;
  signaturesInvalidated: boolean;
};

/**
 * Regenerate agreement body from accepted proposal, invalidate stale signatures, reset to draft.
 * Preserves contract id, proposal acceptedSnapshot, acceptanceRecord, and lifecycle audit trail.
 */
export async function correctContractAgreementFromAccepted(input: {
  contractId: number;
  actor?: string | null;
  dryRun?: boolean;
  requireProposalNumber?: string;
  requireClientNameIncludes?: string;
}): Promise<CorrectContractAgreementResult> {
  const payload = await payloadClient();
  const contract = (await payload.findByID({
    collection: CONTRACTS as never,
    id: input.contractId,
    depth: 1,
    overrideAccess: true,
  })) as AnyDoc;

  const contractStatus = String(contract.status ?? "");
  if (!CORRECTABLE_CONTRACT_STATUSES.has(contractStatus)) {
    throw new Error(
      `Contract status "${contractStatus}" cannot be corrected in place (allowed: ${[...CORRECTABLE_CONTRACT_STATUSES].join(", ")}).`,
    );
  }

  const proposalId = asId(contract.proposal);
  if (!proposalId) {
    throw new Error("Contract has no related proposal — cannot correct from accepted snapshot.");
  }

  const proposal = (await payload.findByID({
    collection: PROPOSALS as never,
    id: proposalId,
    depth: 0,
    overrideAccess: true,
  })) as AnyDoc;

  const proposalNumber = String(proposal.proposalNumber ?? "");
  if (input.requireProposalNumber && proposalNumber !== input.requireProposalNumber) {
    throw new Error(
      `Proposal number mismatch: expected ${input.requireProposalNumber}, got ${proposalNumber}`,
    );
  }

  const accepted = proposal.acceptedSnapshot as CanonicalProposal | null | undefined;
  if (!accepted || typeof accepted !== "object") {
    throw new Error("Proposal has no acceptedSnapshot — refuse to correct.");
  }

  const clientName =
    typeof proposal.client === "object" && proposal.client
      ? String((proposal.client as { name?: string }).name ?? "")
      : String(accepted.primaryOrganization ?? "");
  if (
    input.requireClientNameIncludes &&
    !clientName.toLowerCase().includes(input.requireClientNameIncludes.toLowerCase())
  ) {
    throw new Error(
      `Client name safety check failed: expected to include "${input.requireClientNameIncludes}", got "${clientName}"`,
    );
  }

  let pkg = normalizeLifecyclePackage(contract.lifecyclePackage);
  if (pkg.clientSignature) {
    throw new Error("Client signature is on file — cannot correct agreement text in place.");
  }

  const priorOperator = pkg.operatorSignature as TypedSignatureEvidence | null;
  const amendments = isContractCommercialAmendments(pkg.commercialAmendments)
    ? pkg.commercialAmendments
    : null;

  const draft = mapAcceptedProposalToContractDraft(accepted, {
    amendments,
    contractId: input.contractId,
  });
  const acceptanceHash =
    (proposal.acceptanceRecord as { acceptanceHash?: string } | null)?.acceptanceHash ??
    stableJsonHash(accepted);
  const terms = deriveStructuredPaymentTerms(accepted, acceptanceHash, amendments);
  const installmentRecon = reconcileInstallments(terms);
  if (!installmentRecon.ok) {
    throw new Error(
      `Installment sum ${installmentRecon.sumCents} != one-time total ${terms.oneTimeTotalCents}`,
    );
  }

  const recurringStartPending =
    terms.recurring.startBillingDateStatus === "pending-confirmation" &&
    terms.monthlyTotalCents > 0;

  const signatureReadiness = assessContractSignatureReadiness({
    legal: draft.legal,
    body: draft.body,
    jurisdiction: readLegalJurisdictionConfig(),
    recurringStartPending,
  });

  const clientFacingBody = toClientFacingContractBody(draft.body);
  const newDocumentHash = computeDocumentHash({
    contractId: input.contractId,
    contractBody: clientFacingBody,
    acceptedSnapshotHash: acceptanceHash,
    paymentTermsHash: hashPaymentTerms(terms),
    version: Number(contract.revisionNumber ?? 1) || 1,
  });

  const base: CorrectContractAgreementResult = {
    proposalId,
    contractId: input.contractId,
    contractStatus,
    proposalStatus: String(proposal.status ?? ""),
    acceptedOneTimeTotalCents: accepted.totals.oneTimeTotalCents,
    scheduleSumCents: installmentRecon.sumCents,
    scheduleOk: installmentRecon.ok,
    monthlyTotalCents: terms.monthlyTotalCents,
    recurringStartPending,
    signatureReadiness,
    dryRun: Boolean(input.dryRun),
    bodyPreview: clientFacingBody.slice(0, 2000),
    amendmentsReason: amendments?.reason ?? null,
    previousOperatorDocumentHash: priorOperator?.documentHash ?? null,
    newClientFacingDocumentHash: newDocumentHash,
    signaturesInvalidated: Boolean(priorOperator),
  };

  if (input.dryRun) {
    return base;
  }

  if (contractStatus !== "draft") {
    assertContractTransition(contractStatus, "draft");
  }

  pkg = invalidateSignaturesOnMaterialEdit(pkg);
  pkg = {
    ...pkg,
    commercialAmendments: amendments,
    structuredPaymentTerms: terms,
    commercialSource: "proposal",
    billingPlan: null,
  };
  pkg = appendAudit(pkg, {
    actor: input.actor ?? "operator",
    action: "contract.corrected-from-accepted",
    fromStatus: contractStatus,
    toStatus: "draft",
    reason: priorOperator
      ? `Agreement text corrected from accepted proposal. Prior operator signature invalidated (documentHash ${priorOperator.documentHash}).`
      : "Agreement text corrected from accepted proposal.",
    sourceVersion: 1,
  });

  const monthlyDollars = terms.monthlyTotalCents / 100;
  const projectDollars = accepted.totals.oneTimeTotalCents / 100;

  await payload.update({
    collection: CONTRACTS as never,
    id: input.contractId,
    data: {
      title: draft.title,
      publicTitle: draft.title,
      body: draft.body,
      terms: draft.legal.draftNotice,
      executiveNotes:
        "Agreement corrected from accepted proposal — operator re-signature required before client send.",
      monthlyAmount: monthlyDollars,
      projectAmount: projectDollars,
      contractDraftSnapshot: draft,
      legalProvisions: draft.legal,
      lifecyclePackage: pkg,
      status: "draft",
      signedAt: null,
      sentAt: null,
    } as never,
    overrideAccess: true,
  });

  return { ...base, dryRun: false, contractStatus: "draft" };
}
