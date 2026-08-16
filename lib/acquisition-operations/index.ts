/**
 * Acquisition & Lead Operations — shared domain contracts.
 *
 * Coordinates KXD Acquisition and Managed Client Lead Operations.
 * Does not create a universal lead collection or CRM silo.
 */

import "./policies/register";

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
  listManagedClientLeadPolicies,
  registerManagedClientLeadPolicy,
  isChannelAllowedForPolicy,
  type ManagedClientLeadPolicy,
  type ManagedClientLeadChannel,
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
    "Full Phase 17 normalization",
    "CSI CRM expansion",
    "OTP commission changes",
  ],
} as const;

/** Phase 2 scope note — managed-client inquiry ledger. */
export const ACQUISITION_OPERATIONS_PHASE_2 = {
  id: "acquisition-lead-operations-phase-2",
  implements: [
    "client-inquiries persistence (managed-client received inquiries)",
    "Client policy registry (Primal + OTP compatibility)",
    "Attribution ↔ inquiry reconciliation states",
    "Operator Client Command Leads tab",
    "OTP CSI website_lead → inquiry draft adapter (no auto-ingest, no commission)",
  ],
  deferred: [
    "Portal Lead Operations module",
    "Automatic CSI → client-inquiry ingest wiring",
    "Automated AI qualification",
    "Primal production GA4 sync jobs",
    "OTP production Lead Operations activation beyond adapter readiness",
  ],
} as const;
