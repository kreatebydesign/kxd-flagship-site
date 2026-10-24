/**
 * Pure lead-scoped mutual acceptance rules (no server imports).
 */

export const LEAD_ACCEPTANCE_BLOCKING_STATUSES = [
  "accepted-contract-pending",
  "approved",
] as const;

export type LeadAcceptanceEligibility = {
  canAccept: boolean;
  reason: string | null;
  acceptedSiblingProposalId: number | null;
  acceptedSiblingProposalNumber: string | null;
};

export type ProposalAcceptanceRow = {
  id: number;
  proposalNumber?: string | null;
  status?: string | null;
  acceptedSnapshot?: unknown;
  acceptanceRecord?: unknown;
};

export function isProposalAcceptanceComplete(row: ProposalAcceptanceRow): boolean {
  if (row.acceptedSnapshot && row.acceptanceRecord) return true;
  const status = String(row.status ?? "");
  return (LEAD_ACCEPTANCE_BLOCKING_STATUSES as readonly string[]).includes(status);
}

export function findLeadSiblingAcceptanceBlock(
  currentProposalId: number,
  siblings: ProposalAcceptanceRow[],
): LeadAcceptanceEligibility {
  for (const sibling of siblings) {
    if (Number(sibling.id) === currentProposalId) continue;
    if (!isProposalAcceptanceComplete(sibling)) continue;
    const number = String(sibling.proposalNumber ?? "").trim() || null;
    return {
      canAccept: false,
      reason: number
        ? `Proposal ${number} has already been accepted for this engagement. This option is no longer available for acceptance.`
        : "Another proposal option for this engagement has already been accepted. This option is no longer available for acceptance.",
      acceptedSiblingProposalId: Number(sibling.id),
      acceptedSiblingProposalNumber: number,
    };
  }
  return {
    canAccept: true,
    reason: null,
    acceptedSiblingProposalId: null,
    acceptedSiblingProposalNumber: null,
  };
}

export function evaluateLeadAcceptanceEligibility(input: {
  proposalId: number;
  alreadyAccepted: boolean;
  siblings: ProposalAcceptanceRow[];
}): LeadAcceptanceEligibility {
  if (input.alreadyAccepted) {
    return {
      canAccept: false,
      reason: null,
      acceptedSiblingProposalId: null,
      acceptedSiblingProposalNumber: null,
    };
  }
  return findLeadSiblingAcceptanceBlock(input.proposalId, input.siblings);
}
