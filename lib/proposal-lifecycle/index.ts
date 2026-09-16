/**
 * Universal Proposal → Acceptance → Contract → Dual E-Sign → Billing lifecycle.
 * Server-only orchestration — import concrete paths from client components.
 */

export * from "./types.ts";
export * from "./progression.ts";
export * from "./hash.ts";
export * from "./delivery-preview.ts";
export * from "./structured-payment-terms.ts";
export * from "./billing-readiness.ts";
export * from "./signatures.ts";
export * from "./billing-plan.ts";
export * from "./mock-stripe-billing.ts";
export * from "./package.ts";
export * from "./executed-seal.ts";
export * from "./notifications.ts";
export * from "./transitions.ts";
export * from "./billing-identity.ts";
export * from "./email-templates.ts";
export * from "./mock-webhook.ts";
export * from "./commercial-amendments.ts";
export * from "./external-obligation-payment.ts";
export * from "./client-facing-contract.ts";
export {
  getContractLifecycle,
  ensureLifecycleHydrated,
  simulateLocalProposalSend,
  signContractAsOperator,
  sendContractForClientSignature,
  signContractAsClient,
  simulateVerifiedInitialPayment,
  summarizeProgression,
  markMaterialContractEdit,
  resolveClientBillingIdentity,
  voidContract,
  prepareMockStripeDraftsForContract,
  processLifecycleMockPaymentWebhook,
} from "./services.ts";
export {
  regenerateContractDraftFromAccepted,
  assertMutableContractReadyForSignature,
} from "./regenerate-contract-draft.ts";
export {
  recordObligationExternalPaymentOnContract,
  recordAllocatedExternalPaymentOnContract,
  ensureRecurringDueOccurrenceOnContract,
  ensurePayableSurfacesOnContract,
  ensurePayableSurfacesOnPlan,
} from "./record-obligation-external-payment.ts";
export {
  obligationAmountPaidCents,
  obligationRemainingCents,
  obligationIsPaid,
  planFifoAllocation,
  formatObligationStatusLabel,
  sumProjectObligationRemainingCents,
  sumOpenObligationRemainingCents,
  sumObligationAmountCents,
  sumObligationPaidCents,
  aggregateObligationBalances,
  deriveObligationPaymentStatus,
  isLaunchGatedObligationTrigger,
  isObligationCurrentlyOutstanding,
  sumCurrentlyOutstandingCents,
} from "./obligation-balances.ts";
export { applyStripeCollectedPaymentEvidence } from "./stripe-collected-payment-evidence.ts";
export {
  ensureAncillaryObligationsOnPlan,
  ensureRecurringDueOccurrenceOnPlan,
  buildRecurringOccurrenceSourceKey,
  resolveMonthlyDueDate,
  previewRecurringDueOccurrence,
  countMissingAncillaryObligations,
  upsertOperatorRecurringServiceDefinition,
  toClientFacingObligationPresentation,
  slugifyServiceKey,
} from "./ensure-payable-surfaces.ts";
export type {
  OperatorRecurringServiceDefinition,
  RecurringDueOccurrenceInput,
  ClientFacingObligationPresentation,
} from "./ensure-payable-surfaces.ts";
export {
  resolveRecurringAuthority,
  evaluateRecurringActivation,
  periodYearMonthsForService,
  listYearMonthsInclusive,
} from "./recurring-authority.ts";
export type {
  ResolvedRecurringService,
  RecurringAuthorityConflict,
  ResolveRecurringAuthorityResult,
} from "./recurring-authority.ts";
export {
  ensureRecurringObligationsThroughDateOnPlan,
  previewRecurringObligationsThroughDate,
  ensureRecurringObligationsThroughDateOnContract,
} from "./ensure-recurring-obligations.ts";
export type {
  EnsureRecurringObligationsResult,
  RecurringPeriodPlanItem,
} from "./ensure-recurring-obligations.ts";
export {
  ensurePostAcceptanceMaterializationOnPackage,
  ensurePostAcceptanceMaterializationOnContract,
} from "./post-acceptance-materialization.ts";
export type {
  CommercialMaterializationState,
  PostAcceptanceMaterializationResult,
  MaterializationAreaResult,
  OnboardingRequirement,
} from "./post-acceptance-materialization.ts";
export {
  recomputeOnboardingEligibility,
  applyOnboardingEligibility,
  isContractFullyExecuted,
  isInitialObligationPaid,
} from "./onboarding-eligibility.ts";
export {
  matchLivePaidInvoiceToPackage,
  applyVerifiedLiveInvoicePayment,
  applyPendingVerifiedStripePayments,
  bindObligationStripeInvoice,
  contractIdFromLiveInvoiceEvent,
} from "./live-stripe-reconciliation.ts";
export type {
  ObligationStripeBinding,
  PendingVerifiedStripePayment,
  LiveInvoicePaidEvent,
  LiveMatchResult,
} from "./live-stripe-reconciliation.ts";
