/**
 * Server-authoritative proposal and contract status allowlists.
 */

import type { ContractBuilderStatus, ProposalBuilderStatus } from "./types.ts";

const PROPOSAL_TRANSITIONS: Record<ProposalBuilderStatus, ProposalBuilderStatus[]> = {
  draft: ["internal-review", "approved-for-sharing", "archived"],
  "internal-review": ["draft", "approved-for-sharing", "archived"],
  "approved-for-sharing": ["sent", "draft", "archived"],
  sent: ["viewed", "revision-requested", "questions", "expired", "declined", "accepted-contract-pending"],
  viewed: ["revision-requested", "questions", "expired", "declined", "accepted-contract-pending", "sent"],
  questions: ["viewed", "revision-requested", "sent", "draft", "accepted-contract-pending"],
  "revision-requested": ["draft", "internal-review", "approved-for-sharing", "sent"],
  "accepted-contract-pending": ["approved", "archived"],
  approved: ["archived"],
  declined: ["draft", "archived"],
  rejected: ["draft", "archived"],
  expired: ["draft", "archived"],
  archived: [],
};

const CONTRACT_TRANSITIONS: Record<ContractBuilderStatus, ContractBuilderStatus[]> = {
  draft: ["internal-review", "voided", "superseded"],
  "internal-review": ["draft", "approved-for-signature", "voided"],
  // Operator may sign before client delivery → partially-signed, then send.
  "approved-for-signature": ["sent-for-signature", "sent", "partially-signed", "voided"],
  sent: ["viewed", "partially-signed", "signed", "executed", "declined", "expired", "voided"],
  "sent-for-signature": ["viewed", "partially-signed", "signed", "executed", "declined", "expired", "voided"],
  viewed: ["partially-signed", "signed", "executed", "declined", "expired", "voided"],
  // After KXD signs, contract may be sent for client signature or sealed when both signed.
  "partially-signed": [
    "sent-for-signature",
    "sent",
    "executed",
    "signed",
    "voided",
    "superseded",
  ],
  signed: ["executed", "voided", "superseded"],
  executed: ["archived", "superseded"],
  declined: ["voided", "superseded", "draft"],
  expired: ["voided", "superseded", "draft"],
  voided: ["superseded"],
  superseded: [],
  archived: [],
};

export function canTransitionProposal(
  from: string,
  to: string,
): boolean {
  const allowed = PROPOSAL_TRANSITIONS[from as ProposalBuilderStatus];
  if (!allowed) return false;
  return allowed.includes(to as ProposalBuilderStatus);
}

export function canTransitionContract(from: string, to: string): boolean {
  const allowed = CONTRACT_TRANSITIONS[from as ContractBuilderStatus];
  if (!allowed) return false;
  return allowed.includes(to as ContractBuilderStatus);
}

export function assertProposalTransition(from: string, to: string): void {
  if (from === to) return;
  if (!canTransitionProposal(from, to)) {
    throw new Error(`Invalid proposal transition: ${from} → ${to}`);
  }
}

export function assertContractTransition(from: string, to: string): void {
  if (from === to) return;
  if (!canTransitionContract(from, to)) {
    throw new Error(`Invalid contract transition: ${from} → ${to}`);
  }
}

export function isEditableProposalStatus(status: string): boolean {
  return status === "draft" || status === "internal-review" || status === "revision-requested";
}

export function isShareableProposalStatus(status: string): boolean {
  return (
    status === "approved-for-sharing" ||
    status === "sent" ||
    status === "viewed" ||
    status === "questions" ||
    status === "accepted-contract-pending"
  );
}
