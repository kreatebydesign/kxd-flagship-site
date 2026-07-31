/**
 * Reviewed local billing / KXD invoice identity.
 * Never invents legal, tax, or remittance facts. Unresolved fields stay blockers.
 */

export type ReviewState = "unresolved" | "not-applicable" | "reviewed";

export interface ReviewedField<T = string> {
  value: T | null;
  state: ReviewState;
  reviewedAt?: string | null;
  reviewedBy?: string | null;
  notes?: string | null;
}

export interface KxdInvoiceIdentityConfig {
  displayName: string;
  legalEntity: ReviewedField;
  mailingAddress: ReviewedField;
  billingEmail: ReviewedField;
  phone: ReviewedField;
  website: string;
  remittanceInformation: ReviewedField;
  defaultCurrency: string;
  defaultPaymentTerms: ReviewedField;
  stripeAccountContext: "test-or-mock-only" | "live-blocked";
  invoiceNumberingConfigured: boolean;
  invoiceNumberingState: ReviewState;
}

export interface ClientBillingIdentityOverride {
  legalName?: ReviewedField;
  billingEmail?: ReviewedField;
  billingAddress?: ReviewedField;
  taxTreatment?: ReviewedField<"unspecified" | "exclusive" | "inclusive" | "exempt">;
  currency?: ReviewedField;
}

/** Default incomplete configuration — production-safe fail-closed. */
export const DEFAULT_KXD_INVOICE_CONFIG: KxdInvoiceIdentityConfig = {
  displayName: "Kreate by Design",
  legalEntity: { value: null, state: "unresolved" },
  mailingAddress: { value: null, state: "unresolved" },
  billingEmail: { value: null, state: "unresolved" },
  phone: { value: null, state: "unresolved" },
  website: "https://kreatebydesign.com",
  remittanceInformation: { value: null, state: "unresolved" },
  defaultCurrency: "USD",
  defaultPaymentTerms: { value: null, state: "unresolved" },
  stripeAccountContext: "test-or-mock-only",
  invoiceNumberingConfigured: false,
  invoiceNumberingState: "unresolved",
};

/** In-memory local override for fixture QA — not production secrets. */
let localReviewedOverride: Partial<KxdInvoiceIdentityConfig> | null = null;

export function getKxdInvoiceConfig(): KxdInvoiceIdentityConfig {
  return {
    ...DEFAULT_KXD_INVOICE_CONFIG,
    ...(localReviewedOverride ?? {}),
    legalEntity: localReviewedOverride?.legalEntity ?? DEFAULT_KXD_INVOICE_CONFIG.legalEntity,
    mailingAddress:
      localReviewedOverride?.mailingAddress ?? DEFAULT_KXD_INVOICE_CONFIG.mailingAddress,
    billingEmail: localReviewedOverride?.billingEmail ?? DEFAULT_KXD_INVOICE_CONFIG.billingEmail,
    phone: localReviewedOverride?.phone ?? DEFAULT_KXD_INVOICE_CONFIG.phone,
    remittanceInformation:
      localReviewedOverride?.remittanceInformation ??
      DEFAULT_KXD_INVOICE_CONFIG.remittanceInformation,
    defaultPaymentTerms:
      localReviewedOverride?.defaultPaymentTerms ?? DEFAULT_KXD_INVOICE_CONFIG.defaultPaymentTerms,
  };
}

/**
 * Apply reviewed local fixture values. Explicit operator action only.
 * Does not invent facts — caller must supply reviewed values.
 */
export function applyLocalReviewedKxdInvoiceConfig(
  patch: Partial<KxdInvoiceIdentityConfig>,
): KxdInvoiceIdentityConfig {
  localReviewedOverride = {
    ...(localReviewedOverride ?? {}),
    ...patch,
  };
  return getKxdInvoiceConfig();
}

export function resetLocalReviewedKxdInvoiceConfig(): void {
  localReviewedOverride = null;
}

export function fieldIsReady(field: ReviewedField | undefined): boolean {
  if (!field) return false;
  if (field.state === "not-applicable") return true;
  return field.state === "reviewed" && Boolean(field.value?.toString().trim());
}

export function reviewed(
  value: string,
  actor?: string | null,
): ReviewedField {
  return {
    value,
    state: "reviewed",
    reviewedAt: new Date().toISOString(),
    reviewedBy: actor ?? null,
  };
}
