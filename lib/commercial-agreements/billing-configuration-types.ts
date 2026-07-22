/**
 * Phase 37G — Billing configuration types.
 * Durable internal billing execution settings. Not Stripe. Not access. Not transactions.
 */

import type { CommercialAgreementId } from "./types";
import type { ClientPlanKey, ClientPlanStatus } from "@/lib/client-plans/types";
import type { BillingReadinessSnapshot } from "./billing-readiness-types";

export const BILLING_CURRENCY_CODES = ["usd"] as const;
export type BillingCurrencyCode = (typeof BILLING_CURRENCY_CODES)[number];

export const BILLING_COLLECTION_METHODS = [
  "send_invoice",
  "charge_automatically",
] as const;
export type BillingCollectionMethod =
  (typeof BILLING_COLLECTION_METHODS)[number];

export const BILLING_PAYMENT_TERMS = [
  "due-on-receipt",
  "net-15",
  "net-30",
  "net-45",
] as const;
export type BillingPaymentTerms = (typeof BILLING_PAYMENT_TERMS)[number];

export const BILLING_TAX_POSTURES = [
  "not_configured",
  "tax_exempt",
  "taxable",
  "requires_review",
] as const;
export type BillingTaxPosture = (typeof BILLING_TAX_POSTURES)[number];

export const BILLING_INVOICE_CADENCES = [
  "monthly",
  "quarterly",
  "milestone",
  "on-completion",
] as const;
export type BillingInvoiceCadence = (typeof BILLING_INVOICE_CADENCES)[number];

export type BillingConfigurationBlockCode =
  | "client_not_found"
  | "duplicate_profiles"
  | "invalid_currency"
  | "invalid_billing_contact"
  | "invalid_billing_email"
  | "invalid_collection_method"
  | "invalid_payment_terms"
  | "invalid_method_terms_combination"
  | "invalid_tax_posture"
  | "invalid_invoice_cadence"
  | "unapproved_fields"
  | "confirmation_required"
  | "stale_preview"
  | "unknown_agreement"
  | "persistence_failed"
  | "inconsistent_state";

/** Editable configuration values the browser may submit. */
export type BillingConfigurationEditableInput = {
  currencyCode: BillingCurrencyCode | null;
  billingContact: string | null;
  billingEmail: string | null;
  collectionMethod: BillingCollectionMethod | null;
  paymentTerms: BillingPaymentTerms | null;
  taxPosture: BillingTaxPosture | null;
  /** Preference only — never rewrites commercial retainer cadence. */
  invoiceCadence: BillingInvoiceCadence | null;
};

export type BillingConfigurationValues = BillingConfigurationEditableInput & {
  billingStatus: string | null;
  stripeCustomerIdPresent: boolean;
  stripeSubscriptionIdPresent: boolean;
  sanitizedStripeCustomerId: string | null;
  sanitizedStripeSubscriptionId: string | null;
};

export type BillingConfigurationChangedField = {
  field: keyof BillingConfigurationEditableInput | "billingStatus";
  label: string;
  from: string | null;
  to: string | null;
};

export type BillingConfigurationPreview = {
  clientId: number;
  clientName: string;
  clientSlug: string | null;
  agreementId: CommercialAgreementId | null;
  agreementName: string | null;
  agreementRecordStatus: "unset" | "recorded" | "unknown";
  planKey: ClientPlanKey | null;
  planStatus: ClientPlanStatus | null;
  profilePresent: boolean;
  profileId: number | null;
  operation: "create" | "revise" | "noop";
  canApply: boolean;
  current: BillingConfigurationValues;
  proposed: BillingConfigurationEditableInput;
  changedFields: BillingConfigurationChangedField[];
  commercialTermsUnchanged: true;
  planAccessUnchanged: true;
  stripeUnchanged: true;
  noInvoiceSubscriptionChargeOrEmail: true;
  warnings: string[];
  blockers: Array<{ code: BillingConfigurationBlockCode; message: string }>;
  /** Resulting Phase 37F readiness after proposed configuration is applied in-memory. */
  resultingReadiness: BillingReadinessSnapshot;
  ownership: {
    currency: string;
    billingContact: string;
    collectionMethod: string;
    paymentTerms: string;
    taxPosture: string;
    invoiceCadence: string;
    commercialAmounts: string;
    stripeIds: string;
    outsideThisPhase: string;
  };
  notices: readonly string[];
  previewFingerprint: string;
  generatedAt: string;
};

export type BillingConfigurationResultStatus =
  | "created"
  | "changed"
  | "unchanged";

export type BillingConfigurationResult = {
  status: BillingConfigurationResultStatus;
  message: string;
  clientId: number;
  profileId: number;
  operation: "create" | "revise" | "noop";
  changedFields: BillingConfigurationChangedField[];
  readiness: BillingReadinessSnapshot;
  preview: BillingConfigurationPreview;
};

export const BILLING_CONFIGURATION_NOTICES = [
  "No billing action performed",
  "Stripe unchanged",
  "Access unchanged",
  "Commercial terms unchanged",
  "Configuration does not activate billing",
] as const;

export const BILLING_CONFIGURATION_OWNERSHIP = {
  currency:
    "billing-profiles.currencyCode — authoritative ISO 4217 code when set by an operator",
  billingContact:
    "billing-profiles.billingContact + billingEmail — verified billing contact only",
  collectionMethod:
    "billing-profiles.collectionMethod — intended send_invoice or charge_automatically",
  paymentTerms:
    "billing-profiles.paymentTerms — due terms for send-invoice; not applicable to automatic collection",
  taxPosture:
    "billing-profiles.taxPosture — recorded posture only; never calculates tax",
  invoiceCadence:
    "billing-profiles.invoiceCadence — preference only; commercial monthly retainer cadence remains on clients.monthlyRetainerAmount",
  commercialAmounts:
    "clients.setupFee / monthlyRetainerAmount / monthlyServiceCredits / commercialAddOns — not copied into billing profiles",
  stripeIds:
    "billing-profiles.stripeCustomerId / stripeSubscriptionId — read-only external slots in this phase",
  outsideThisPhase:
    "Stripe customers/products/prices/subscriptions/invoices, payment collection, emails, tax calculation, add-on pricing engine",
} as const;
