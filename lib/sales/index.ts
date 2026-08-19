export * from "./types";
export * from "./automation";
export * from "./public-core";
export * from "./analytics";
export * from "./contracts";
export * from "./timeline-events";
export { getPipelineBoard, getLeadsList, updateLeadPipelineStatus } from "./pipeline";
export { getSalesWorkspace, getCommercialAttentionItems, type SalesWorkspaceData, type SalesOpportunityCard } from "./workspace";
export { promoteResearchLeadToSales, type PromoteResearchLeadResult } from "./promote-research-lead";
export {
  promoteInquiryToSales,
  promoteProjectInquiryToSales,
  promoteWebsiteAuditToSales,
} from "./promote-inbound";
export {
  isInquiryEligibleForPromotion,
  isProjectInquiryEligibleForPromotion,
  isWebsiteAuditEligibleForPromotion,
} from "./promote-helpers";
export { NEXT_ACTIONS, NEXT_ACTION_LABEL, isNextAction, type NextAction } from "./next-action";
export {
  SALES_FOLLOW_UP_POLICY,
  FIRST_PARTY_INQUIRY_SOURCES,
  isFirstPartyInquirySource,
  LOST_REASONS,
  isLostReason,
  initialResponseDueAt,
  type LostReason,
  type OutreachKind,
} from "./follow-up-policy";
export { WORKSPACE_SECTIONS, WORKSPACE_MOVES, STATUS_TO_SECTION } from "./workspace-stages";
export {
  generateProposalNumber,
  getProposalsList,
  getProposalById,
  getSectionTemplates,
  createProposalRecord,
  updateProposalRecord,
  getClientsForProposalPicker,
  getLeadsForProposalPicker,
  type CreateProposalInput,
} from "./proposals";
export { getForecastDashboard } from "./forecast";
export { getSalesActivities, getLeadActivities, logSalesActivity, type LogActivityInput } from "./activities";
export {
  executeProposalConversion,
  getConversionWizardData,
  conversionDraftToWizard,
  type ConversionExecutionResult,
  type ConversionWizardDraft,
} from "./acquisition";
export { getProposalByPublicToken, getProposalByIdForAdmin, markProposalSent } from "./public";
export { createProposalCheckoutSession, handleProposalPaymentSuccess, isStripeEnabled } from "./payments";
export { signProposalAgreement, getLatestAgreement, validateApprovalRequirements } from "./contracts";
export { formatAnalyticsDisplay, recordProposalViewEvent } from "./analytics";
