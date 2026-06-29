import "server-only";

export type {
  EstimateItemInput,
  EstimateItemType,
  ExecutiveProposalStatus,
  ExecutiveProposalType,
  ExecutiveProposalsWidget,
  ExecutiveProposalsWidgetItem,
  PricingTotals,
  ProposalDoc,
  ProposalIntelligenceSignal,
  ProposalIntelligenceSnapshot,
  WorkspaceProposalApprovalRow,
  WorkspaceProposalRow,
  WorkspaceProposalsSnapshot,
} from "./types";

export {
  loadClientProposalsSnapshot,
  loadProposalsForClientIds,
} from "./data";

export { loadExecutiveProposalsWidget } from "./dashboard";
export { buildProposalIntelligence } from "./intelligence";

export { syncProposalPricing, loadEstimateItemsForProposal } from "./sync-pricing";
export {
  logProposalActivityRecord,
  publishExecutiveProposalEvent,
} from "./timeline-publish";

export {
  calculateEstimateTotals,
  mergePricingIntoProposalFields,
} from "./pricing";
export type { PricingOptions } from "./pricing";

export {
  displayProposalStatus,
  isOpenProposalStatus,
  needsProposalFollowUp,
  normalizeProposalStatus,
  statusToTimelineEvent,
} from "./lifecycle";
