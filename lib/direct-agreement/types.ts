/**
 * Direct Agreement — first-class commercial engagement without a proposal.
 * Converges into existing contracts + lifecyclePackage + commercial-documents.
 */

export const AGREEMENT_SOURCES = ["proposal", "direct-agreement"] as const;
export type AgreementSource = (typeof AGREEMENT_SOURCES)[number];

export const COMMERCIAL_STRUCTURES = ["one-time", "recurring", "combined"] as const;
export type CommercialStructure = (typeof COMMERCIAL_STRUCTURES)[number];

export const ROLLOVER_POLICIES = ["none", "manual-approval"] as const;
export type RolloverPolicy = (typeof ROLLOVER_POLICIES)[number];

export const EXTERNAL_ACCEPTANCE_METHODS = [
  "email",
  "phone",
  "in-person",
  "existing-signed-document",
  "other",
] as const;
export type ExternalAcceptanceMethod = (typeof EXTERNAL_ACCEPTANCE_METHODS)[number];

/** Operator-facing commercial progression (orthogonal to e-sign status). */
export const DIRECT_AGREEMENT_COMMERCIAL_STATUSES = [
  "draft",
  "finalized",
  "sent",
  "accepted",
  "payment-pending",
  "paid",
  "active",
  "completed",
  "cancelled",
] as const;
export type DirectAgreementCommercialStatus =
  (typeof DIRECT_AGREEMENT_COMMERCIAL_STATUSES)[number];

/**
 * Structured commercial terms stored on contracts.directAgreementTerms.
 * Source of truth for Direct Agreement payment-term derivation — not lifecycle JSON edits.
 */
export type DirectAgreementTerms = {
  schemaVersion: 1;
  commercialStructure: CommercialStructure;
  /** One-time prepaid / project amount in USD cents. */
  oneTimeAmountCents: number;
  /** Recurring monthly amount in USD cents — 0 for prepaid-only. */
  monthlyAmountCents: number;
  currency: "USD";
  serviceStartDate: string;
  serviceEndDate: string | null;
  scope: string;
  includedServices: string;
  exclusions: string;
  capacityHoursPerMonth: number | null;
  rolloverPolicy: RolloverPolicy;
  revisionAllowance: string;
  overagePreapprovalRule: string;
  paymentTerms: string;
  cancellationRefundLanguage: string;
  intellectualPropertyLanguage: string;
  portfolioUseLanguage: string;
  clientResponsibilities: string;
  renewalBehavior: string;
  autoRenew: boolean;
  billingContactName?: string | null;
  billingEmail?: string | null;
  payerLegalName?: string | null;
  brandName?: string | null;
  termsVersion: number;
};

export type CreateDirectAgreementInput = {
  clientId: number;
  title: string;
  contractType: string;
  publicTitle?: string | null;
  body: string;
  terms?: string | null;
  executiveNotes?: string | null;
  templateId?: number | null;
  agreementTerms: {
    commercialStructure: CommercialStructure;
    oneTimeAmountCents: number;
    monthlyAmountCents: number;
    currency?: "USD";
    serviceStartDate: string;
    serviceEndDate: string | null;
    scope: string;
    includedServices: string;
    exclusions: string;
    capacityHoursPerMonth: number | null;
    rolloverPolicy: RolloverPolicy;
    revisionAllowance: string;
    overagePreapprovalRule: string;
    paymentTerms: string;
    cancellationRefundLanguage: string;
    intellectualPropertyLanguage: string;
    portfolioUseLanguage: string;
    clientResponsibilities: string;
    renewalBehavior: string;
    autoRenew: boolean;
    billingContactName?: string | null;
    billingEmail?: string | null;
    payerLegalName?: string | null;
    brandName?: string | null;
    termsVersion?: number;
  };
  actor?: string | null;
};

export type ExternalAcceptanceRecord = {
  schemaVersion: 1;
  /** Explicit label — never treated as electronic signature. */
  label: "externally-recorded-acceptance";
  acceptedBy: string;
  /** Calendar date / datetime of client acceptance. */
  acceptedAt: string;
  method: ExternalAcceptanceMethod;
  evidenceNotes: string;
  recordedBy: string;
  recordedAt: string;
  clientId: number;
  contractId: number;
  evidenceReference?: string | null;
};

export type PaymentAuthorizationRecord = {
  schemaVersion: 1;
  authorizationType: string;
  authorizedBy: string;
  cardholderName?: string | null;
  authorizationMethod: string;
  authorizedAt: string;
  scope: string;
  amountAuthorizedCents: number;
  currency: "USD";
  evidenceNotes: string;
  recordedBy: string;
  recordedAt: string;
  revokedAt?: string | null;
  /** Safe Stripe / payment metadata only — never PAN/CVC/raw expiry string. */
  stripeCustomerId?: string | null;
  stripePaymentMethodId?: string | null;
  cardBrand?: string | null;
  cardLast4?: string | null;
  cardExpMonth?: number | null;
  cardExpYear?: number | null;
  stripePaymentIntentId?: string | null;
  stripeChargeId?: string | null;
  stripeInvoiceId?: string | null;
  hostedInvoiceUrl?: string | null;
  receiptUrl?: string | null;
  paymentStatus?: string | null;
};

/** How a payment reference entered KXD OS — never invent Stripe charges. */
export const PAYMENT_PROVENANCE_SOURCES = [
  "imported-external-stripe-payment",
  "kxd-stripe-lifecycle",
  "manual-non-stripe",
] as const;
export type PaymentProvenanceSource = (typeof PAYMENT_PROVENANCE_SOURCES)[number];

/**
 * Safe payment linkage stored on lifecyclePackage.paymentReferences.
 * Never stores PAN, CVC, or raw card credentials.
 */
export type DirectAgreementPaymentReferences = {
  stripeCustomerId?: string | null;
  stripeInvoiceId?: string | null;
  stripePaymentIntentId?: string | null;
  stripeChargeId?: string | null;
  hostedInvoiceUrl?: string | null;
  receiptUrl?: string | null;
  paymentStatus?: string | null;
  linkedAt?: string | null;
  linkedBy?: string | null;
  /** Recorded payment amount in cents (obligation-compatible). */
  amountCents?: number | null;
  currency?: string | null;
  /** Calendar/ISO date the external payment completed. */
  paidAt?: string | null;
  operatorNote?: string | null;
  source?: PaymentProvenanceSource | null;
  /** true = LIVE Stripe object; false = TEST; null = non-Stripe / unknown. */
  livemode?: boolean | null;
  importedAt?: string | null;
  importedBy?: string | null;
  /** Deterministic key — prevents duplicate financial effects. */
  idempotencyKey?: string | null;
};

/** Forbidden field names — verify scripts scan for these patterns. */
export const FORBIDDEN_CARD_FIELD_NAMES = [
  "cardNumber",
  "pan",
  "cvc",
  "cvv",
  "cardImage",
  "rawCard",
  "fullCardNumber",
] as const;
