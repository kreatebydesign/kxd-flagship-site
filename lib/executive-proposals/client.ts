/**
 * Client-safe exports for executive proposals.
 * Use in Client Components — types, labels, and display helpers only.
 */

export type {
  EstimateItemInput,
  EstimateItemType,
  ExecutiveProposalStatus,
  ExecutiveProposalType,
  ExecutiveProposalsWidget,
  ExecutiveProposalsWidgetItem,
  PricingTotals,
  ProposalIntelligenceSignal,
  ProposalIntelligenceSnapshot,
  WorkspaceProposalApprovalRow,
  WorkspaceProposalRow,
  WorkspaceProposalsSnapshot,
} from "./types";

export {
  ESTIMATE_ITEM_TYPES,
  EXECUTIVE_PROPOSAL_STATUSES,
  EXECUTIVE_PROPOSAL_TYPES,
} from "./types";

export {
  NEEDS_FOLLOW_UP_STATUSES,
  OPEN_PIPELINE_STATUSES,
  STATUS_LABELS,
  displayProposalStatus,
  isOpenProposalStatus,
  needsProposalFollowUp,
  normalizeProposalStatus,
} from "./lifecycle";

export function formatProposalActionLabel(action: string): string {
  return action.replace(/-/g, " ");
}

export function formatProposalTypeLabel(type: string | null): string {
  if (!type) return "—";
  return type.replace(/-/g, " ");
}
