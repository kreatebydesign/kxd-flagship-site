/**
 * Acquisition & Lead Operations — shared domain contracts (Phase 1).
 *
 * Coordinates KXD Acquisition and future Managed Client Lead Operations.
 * Does not create a universal lead collection or CRM silo.
 */

export {
  ACQUISITION_CONTEXTS,
  KXD_SOURCE_RECORD_TYPES,
  MANAGED_CLIENT_SOURCE_RECORD_TYPES,
  isAcquisitionContext,
  type AcquisitionContext,
  type AcquisitionSourceRecordType,
  type KxdSourceRecordType,
  type ManagedClientSourceRecordType,
} from "./contexts";

export {
  CANONICAL_OWNERS,
  KXD_CANONICAL_SALES_COLLECTION,
  type CanonicalOwnerKey,
} from "./ownership";

export {
  sourceRecordKey,
  isValidSourceRecordId,
  type SourceRecordIdentity,
  type PromotionProvenance,
} from "./provenance";

export {
  OPERATIONAL_STATES,
  VERIFICATION_STATES,
  QUALIFICATION_STATES,
  OUTCOME_STATES,
  type OperationalState,
  type VerificationState,
  type QualificationState,
  type OutcomeState,
} from "./lifecycle";

export {
  MANAGED_CLIENT_LEAD_POLICY_REGISTRY,
  getManagedClientLeadPolicy,
  type ManagedClientLeadPolicy,
} from "./policy";

export type {
  PromoteToSalesResult,
  PromoteToSalesSuccess,
  PromoteToSalesFailure,
  PromoteToSalesOptions,
} from "./promote-types";

/** Phase 1 scope note for registry / operators. */
export const ACQUISITION_OPERATIONS_PHASE_1 = {
  id: "acquisition-lead-operations-phase-1",
  implements: [
    "Shared Acquisition & Lead Operations contracts",
    "KXD inbound → sales-leads intentional promotion (inquiries, project-inquiries, website-audits)",
    "Durable inbound provenance on sales-leads",
    "Partial Phase 17 Lead Funnel Unification (KXD Acquisition handoffs only)",
  ],
  deferred: [
    "client-inquiries persistence",
    "Managed Client Lead Operations / Primal activation",
    "Ads ↔ inquiry reconciliation",
    "CSI CRM expansion",
    "OTP commission changes",
    "Full Phase 17 normalization",
  ],
} as const;
