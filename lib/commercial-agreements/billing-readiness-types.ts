/**
 * Phase 37F — Billing readiness types.
 * Read-only assessment separating commercial terms, access, billing config, and Stripe.
 * No persistence. No Stripe execution. No financial mutation.
 */

import type { CommercialAddOnId, CommercialAgreementId } from "./types";
import type { ClientPlanKey, ClientPlanStatus } from "@/lib/client-plans/types";

export type BillingReadinessStatus =
  | "not_applicable"
  | "not_configured"
  | "blocked"
  | "ready_for_review"
  | "ready_for_future_sync"
  | "externally_linked"
  | "state_mismatch";

export type BillingReadinessBlockCode =
  | "no_agreement"
  | "unknown_agreement"
  | "invalid_commercial"
  | "negative_amount"
  | "invalid_precision"
  | "agreement_plan_mismatch"
  | "custom_requires_clarification"
  | "legacy_without_agreement"
  | "conflicting_external_identity"
  | "unsupported_billing_model"
  | "missing_billable_terms"
  | "client_not_found";

export type CommercialTermKind = "one_time" | "recurring" | "informational" | "service_capacity";

export type CommercialTermClassification =
  | "billable"
  | "informational"
  | "unsupported"
  | "requires_review";

export type BillingMoneyAmount = {
  /** Dollar major units with at most 2 decimal places, or null when unset. */
  amount: number | null;
  /** Integer cents when amount is non-null and precision-valid; else null. */
  amountCents: number | null;
  /** Distinct from zero: null means unset; 0 means explicitly zero. */
  presence: "null" | "zero" | "positive" | "invalid";
  kind: CommercialTermKind;
  classification: CommercialTermClassification;
  label: string;
  source: string;
  notes: string[];
};

export type CommercialAddOnBillingRow = {
  id: CommercialAddOnId | string;
  label: string;
  pricingNote: string;
  classification: CommercialTermClassification;
  kind: CommercialTermKind | "ambiguous";
  stripeSafe: boolean;
  notes: string[];
};

export type AgreementPlanAlignment = {
  status:
    | "aligned_standard"
    | "aligned_custom"
    | "mismatch"
    | "legacy_access_only"
    | "no_plan"
    | "paused"
    | "trial_aligned"
    | "trial_mismatch"
    | "not_applicable"
    | "requires_review";
  expectedPlanKey: ClientPlanKey | "custom" | null;
  actualPlanKey: ClientPlanKey | null;
  actualPlanStatus: ClientPlanStatus | null;
  explanation: string;
};

export type CurrencyAssessment = {
  /** Never invent a Stripe currency code. */
  code: string | null;
  authoritative: boolean;
  documentedFieldUnit: string | null;
  explanation: string;
};

export type CadenceAssessment = {
  retainerCadence: "monthly" | null;
  profileInvoiceCadence: string | null;
  authoritative: boolean;
  explanation: string;
};

export type BillingContactAssessment = {
  contactName: string | null;
  email: string | null;
  source: "billing-profiles" | "none";
  present: boolean;
  explanation: string;
};

export type ExternalBillingIdentity = {
  provider: "stripe" | "quickbooks" | "wave";
  field: string;
  present: boolean;
  /** Sanitized id only — never full secret material. */
  sanitizedId: string | null;
};

export type FutureStripeMappingProposal = {
  clientToCustomer: string;
  agreementToTerms: string;
  setupFee: string;
  monthlyRetainer: string;
  addOns: string;
  currency: string;
  billingEmail: string;
  metadata: string;
  catalogStrategy: string;
  explicitNotice: string;
};

export type BillingOwnershipMap = {
  commercialAgreement: string;
  planAssignment: string;
  billingConfiguration: string;
  externalStripeState: string;
  financialTransactions: string;
};

export type BillingReadinessSnapshot = {
  clientId: number;
  clientName: string;
  clientSlug: string | null;
  agreementId: CommercialAgreementId | null;
  agreementName: string | null;
  agreementRecordStatus: "unset" | "recorded" | "unknown";
  planKey: ClientPlanKey | null;
  planStatus: ClientPlanStatus | null;
  assignmentClassification: string;
  alignment: AgreementPlanAlignment;
  setupFee: BillingMoneyAmount;
  monthlyRetainer: BillingMoneyAmount;
  monthlyServiceCredits: BillingMoneyAmount;
  commercialAddOns: CommercialAddOnBillingRow[];
  currency: CurrencyAssessment;
  cadence: CadenceAssessment;
  billingContact: BillingContactAssessment;
  externalIdentities: ExternalBillingIdentity[];
  proposedCustomerIdentityInputs: {
    clientId: number;
    clientName: string;
    billingEmail: string | null;
    note: string;
  };
  missingRequired: string[];
  warnings: string[];
  blockers: Array<{ code: BillingReadinessBlockCode; message: string }>;
  readiness: BillingReadinessStatus;
  readinessExplanation: string;
  ownership: BillingOwnershipMap;
  futureStripeMapping: FutureStripeMappingProposal;
  systemsUnchanged: readonly string[];
  notices: readonly string[];
  fingerprint: string;
  generatedAt: string;
};

export const BILLING_READINESS_SYSTEMS_UNCHANGED = [
  "No Stripe object has been created or changed",
  "No subscription has been created",
  "No invoice has been created",
  "No payment has been collected",
  "No plan or access has been changed",
  "No commercial agreement has been changed",
  "No email has been sent",
  "This is an internal readiness assessment only",
] as const;

export const BILLING_READINESS_NOTICES = [
  "No billing action performed",
  "Stripe unchanged",
  "Access unchanged",
  "Billing readiness is not billing activation",
] as const;

export const BILLING_OWNERSHIP: BillingOwnershipMap = {
  commercialAgreement:
    "clients.commercialAgreementId + commercial amount/add-on/notes fields (Phase 37A)",
  planAssignment:
    "clients.planKey / planStatus / plan modules (Phases 35A, 37B–37E)",
  billingConfiguration:
    "billing-profiles collection (contact, cadence preference, payment terms, external id slots)",
  externalStripeState:
    "billing-profiles.stripeCustomerId / stripeSubscriptionId — external execution identifiers only",
  financialTransactions:
    "Not owned by commercial agreements. Future Stripe sync + sales/payment flows only",
};
