/**
 * Phase 37G — Pure billing-configuration validation, preview, fingerprint.
 * Free of server-only so verification scripts can import it.
 *
 * Server owns currency normalization, collection/payment-term rules, tax posture,
 * readiness recalculation, changed fields, fingerprint, and persistence payload.
 * Browser may submit only editable configuration values + acknowledgments + fingerprint.
 */

import { createHash } from "node:crypto";
import { isCommercialAgreementId } from "./definitions";
import {
  buildBillingReadinessSnapshot,
  sanitizeExternalId,
  type BillingProfileReadState,
  type BillingReadinessClientState,
} from "./billing-readiness-logic";
import {
  BILLING_COLLECTION_METHODS,
  BILLING_CONFIGURATION_NOTICES,
  BILLING_CONFIGURATION_OWNERSHIP,
  BILLING_CURRENCY_CODES,
  BILLING_INVOICE_CADENCES,
  BILLING_PAYMENT_TERMS,
  BILLING_TAX_POSTURES,
  type BillingCollectionMethod,
  type BillingConfigurationBlockCode,
  type BillingConfigurationChangedField,
  type BillingConfigurationEditableInput,
  type BillingConfigurationPreview,
  type BillingConfigurationValues,
  type BillingCurrencyCode,
  type BillingInvoiceCadence,
  type BillingPaymentTerms,
  type BillingTaxPosture,
} from "./billing-configuration-types";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type BillingConfigurationProfileState = BillingProfileReadState & {
  profileId: number | null;
  profileUpdatedAt: string | null;
  currencyCode: string | null;
  collectionMethod: string | null;
  taxPosture: string | null;
};

export function isBillingCurrencyCode(
  value: unknown,
): value is BillingCurrencyCode {
  return (
    typeof value === "string" &&
    (BILLING_CURRENCY_CODES as readonly string[]).includes(value)
  );
}

export function isBillingCollectionMethod(
  value: unknown,
): value is BillingCollectionMethod {
  return (
    typeof value === "string" &&
    (BILLING_COLLECTION_METHODS as readonly string[]).includes(value)
  );
}

export function isBillingPaymentTerms(
  value: unknown,
): value is BillingPaymentTerms {
  return (
    typeof value === "string" &&
    (BILLING_PAYMENT_TERMS as readonly string[]).includes(value)
  );
}

export function isBillingTaxPosture(value: unknown): value is BillingTaxPosture {
  return (
    typeof value === "string" &&
    (BILLING_TAX_POSTURES as readonly string[]).includes(value)
  );
}

export function isBillingInvoiceCadence(
  value: unknown,
): value is BillingInvoiceCadence {
  return (
    typeof value === "string" &&
    (BILLING_INVOICE_CADENCES as readonly string[]).includes(value)
  );
}

/** Normalize currency to lowercase ISO code. Does not invent from locale. */
export function normalizeCurrencyCode(
  value: unknown,
):
  | { ok: true; value: BillingCurrencyCode | null }
  | { ok: false; message: string } {
  if (value === null || value === undefined || value === "") {
    return { ok: true, value: null };
  }
  if (typeof value !== "string") {
    return { ok: false, message: "Currency must be a string code or empty." };
  }
  const normalized = value.trim().toLowerCase();
  if (!normalized) return { ok: true, value: null };
  if (!isBillingCurrencyCode(normalized)) {
    return {
      ok: false,
      message: `Currency “${value.trim()}” is not a supported authoritative billing currency.`,
    };
  }
  return { ok: true, value: normalized };
}

export function normalizeBillingContactName(
  value: unknown,
):
  | { ok: true; value: string | null }
  | { ok: false; message: string } {
  if (value === null || value === undefined || value === "") {
    return { ok: true, value: null };
  }
  if (typeof value !== "string") {
    return { ok: false, message: "Billing contact must be a string or empty." };
  }
  const trimmed = value.trim().replace(/\s+/g, " ");
  if (!trimmed) return { ok: true, value: null };
  if (trimmed.length > 200) {
    return { ok: false, message: "Billing contact must be 200 characters or fewer." };
  }
  return { ok: true, value: trimmed };
}

export function normalizeBillingEmail(
  value: unknown,
):
  | { ok: true; value: string | null }
  | { ok: false; message: string } {
  if (value === null || value === undefined || value === "") {
    return { ok: true, value: null };
  }
  if (typeof value !== "string") {
    return { ok: false, message: "Billing email must be a string or empty." };
  }
  const normalized = value.trim().toLowerCase();
  if (!normalized) return { ok: true, value: null };
  if (normalized.length > 254) {
    return { ok: false, message: "Billing email must be 254 characters or fewer." };
  }
  if (!EMAIL_RE.test(normalized)) {
    return { ok: false, message: "Billing email is not a valid email address." };
  }
  return { ok: true, value: normalized };
}

function displayValue(value: string | null | undefined): string | null {
  if (value == null || value === "") return null;
  return value;
}

function currentValuesFromProfile(
  profile: BillingConfigurationProfileState,
): BillingConfigurationValues {
  const stripeCustomer = profile.stripeCustomerId?.trim() || null;
  const stripeSubscription = profile.stripeSubscriptionId?.trim() || null;
  return {
    currencyCode: isBillingCurrencyCode(profile.currencyCode)
      ? profile.currencyCode
      : null,
    billingContact: profile.billingContact?.trim() || null,
    billingEmail: profile.billingEmail?.trim()?.toLowerCase() || null,
    collectionMethod: isBillingCollectionMethod(profile.collectionMethod)
      ? profile.collectionMethod
      : null,
    paymentTerms: isBillingPaymentTerms(profile.paymentTerms)
      ? profile.paymentTerms
      : null,
    taxPosture: isBillingTaxPosture(profile.taxPosture)
      ? profile.taxPosture
      : null,
    invoiceCadence: isBillingInvoiceCadence(profile.invoiceCadence)
      ? profile.invoiceCadence
      : null,
    billingStatus: profile.billingStatus?.trim() || null,
    stripeCustomerIdPresent: Boolean(stripeCustomer),
    stripeSubscriptionIdPresent: Boolean(stripeSubscription),
    sanitizedStripeCustomerId: sanitizeExternalId(stripeCustomer),
    sanitizedStripeSubscriptionId: sanitizeExternalId(stripeSubscription),
  };
}

export function validateBillingConfigurationInput(
  raw: BillingConfigurationEditableInput,
):
  | { ok: true; value: BillingConfigurationEditableInput }
  | {
      ok: false;
      code: BillingConfigurationBlockCode;
      message: string;
    } {
  const currency = normalizeCurrencyCode(raw.currencyCode);
  if (!currency.ok) {
    return { ok: false, code: "invalid_currency", message: currency.message };
  }

  const contact = normalizeBillingContactName(raw.billingContact);
  if (!contact.ok) {
    return {
      ok: false,
      code: "invalid_billing_contact",
      message: contact.message,
    };
  }

  const email = normalizeBillingEmail(raw.billingEmail);
  if (!email.ok) {
    return {
      ok: false,
      code: "invalid_billing_email",
      message: email.message,
    };
  }

  let collectionMethod: BillingCollectionMethod | null = null;
  if (raw.collectionMethod != null && raw.collectionMethod !== ("" as never)) {
    if (!isBillingCollectionMethod(raw.collectionMethod)) {
      return {
        ok: false,
        code: "invalid_collection_method",
        message: "Collection method must be send_invoice or charge_automatically.",
      };
    }
    collectionMethod = raw.collectionMethod;
  }

  let paymentTerms: BillingPaymentTerms | null = null;
  if (raw.paymentTerms != null && raw.paymentTerms !== ("" as never)) {
    if (!isBillingPaymentTerms(raw.paymentTerms)) {
      return {
        ok: false,
        code: "invalid_payment_terms",
        message:
          "Payment terms must be due-on-receipt, net-15, net-30, or net-45.",
      };
    }
    paymentTerms = raw.paymentTerms;
  }

  let taxPosture: BillingTaxPosture | null = null;
  if (raw.taxPosture != null && raw.taxPosture !== ("" as never)) {
    if (!isBillingTaxPosture(raw.taxPosture)) {
      return {
        ok: false,
        code: "invalid_tax_posture",
        message:
          "Tax posture must be not_configured, tax_exempt, taxable, or requires_review.",
      };
    }
    taxPosture = raw.taxPosture;
  }

  let invoiceCadence: BillingInvoiceCadence | null = null;
  if (raw.invoiceCadence != null && raw.invoiceCadence !== ("" as never)) {
    if (!isBillingInvoiceCadence(raw.invoiceCadence)) {
      return {
        ok: false,
        code: "invalid_invoice_cadence",
        message:
          "Invoice cadence preference must be monthly, quarterly, milestone, or on-completion.",
      };
    }
    invoiceCadence = raw.invoiceCadence;
  }

  // Collection method ↔ payment terms relationship
  if (collectionMethod === "charge_automatically" && paymentTerms != null) {
    return {
      ok: false,
      code: "invalid_method_terms_combination",
      message:
        "Automatic collection must not carry invoice net terms. Clear payment terms for charge_automatically.",
    };
  }
  if (collectionMethod === "send_invoice" && paymentTerms == null) {
    return {
      ok: false,
      code: "invalid_method_terms_combination",
      message:
        "Send-invoice collection requires explicit payment terms (due on receipt or net days).",
    };
  }

  return {
    ok: true,
    value: {
      currencyCode: currency.value,
      billingContact: contact.value,
      billingEmail: email.value,
      collectionMethod,
      paymentTerms,
      taxPosture,
      invoiceCadence,
    },
  };
}

export function computeChangedFields(
  current: BillingConfigurationValues,
  proposed: BillingConfigurationEditableInput,
): BillingConfigurationChangedField[] {
  const rows: Array<{
    field: keyof BillingConfigurationEditableInput;
    label: string;
    from: string | null;
    to: string | null;
  }> = [
    {
      field: "currencyCode",
      label: "Currency",
      from: displayValue(current.currencyCode),
      to: displayValue(proposed.currencyCode),
    },
    {
      field: "billingContact",
      label: "Billing contact",
      from: displayValue(current.billingContact),
      to: displayValue(proposed.billingContact),
    },
    {
      field: "billingEmail",
      label: "Billing email",
      from: displayValue(current.billingEmail),
      to: displayValue(proposed.billingEmail),
    },
    {
      field: "collectionMethod",
      label: "Collection method",
      from: displayValue(current.collectionMethod),
      to: displayValue(proposed.collectionMethod),
    },
    {
      field: "paymentTerms",
      label: "Payment terms",
      from: displayValue(current.paymentTerms),
      to: displayValue(proposed.paymentTerms),
    },
    {
      field: "taxPosture",
      label: "Tax posture",
      from: displayValue(current.taxPosture),
      to: displayValue(proposed.taxPosture),
    },
    {
      field: "invoiceCadence",
      label: "Invoice cadence preference",
      from: displayValue(current.invoiceCadence),
      to: displayValue(proposed.invoiceCadence),
    },
  ];
  return rows.filter((row) => row.from !== row.to);
}

export function buildBillingConfigurationFingerprint(input: {
  clientId: number;
  clientUpdatedAt: string | null;
  profileId: number | null;
  profileUpdatedAt: string | null;
  agreementId: string | null;
  planKey: string | null;
  planStatus: string | null;
  setupFee: number | null;
  monthlyRetainerAmount: number | null;
  monthlyServiceCredits: number | null;
  commercialAddOns: readonly string[];
  current: BillingConfigurationEditableInput;
  proposed: BillingConfigurationEditableInput;
}): string {
  const payload = JSON.stringify({
    v: 1,
    clientId: input.clientId,
    clientUpdatedAt: input.clientUpdatedAt,
    profileId: input.profileId,
    profileUpdatedAt: input.profileUpdatedAt,
    agreementId: input.agreementId,
    planKey: input.planKey,
    planStatus: input.planStatus,
    setupFee: input.setupFee,
    monthlyRetainerAmount: input.monthlyRetainerAmount,
    monthlyServiceCredits: input.monthlyServiceCredits,
    commercialAddOns: [...input.commercialAddOns].slice().sort(),
    current: input.current,
    proposed: input.proposed,
  });
  return createHash("sha256").update(payload).digest("hex").slice(0, 40);
}

function profileStateForReadiness(
  profile: BillingConfigurationProfileState,
  proposed: BillingConfigurationEditableInput,
): BillingProfileReadState {
  return {
    profilePresent: true,
    billingContact: proposed.billingContact,
    billingEmail: proposed.billingEmail,
    invoiceCadence: proposed.invoiceCadence,
    paymentTerms: proposed.paymentTerms,
    billingStatus: profile.billingStatus,
    stripeCustomerId: profile.stripeCustomerId,
    stripeSubscriptionId: profile.stripeSubscriptionId,
    quickbooksCustomerId: profile.quickbooksCustomerId,
    waveCustomerId: profile.waveCustomerId,
    duplicateProfiles: profile.duplicateProfiles,
    currencyCode: proposed.currencyCode,
    collectionMethod: proposed.collectionMethod,
    taxPosture: proposed.taxPosture,
  };
}

export function buildBillingConfigurationPreview(
  state: BillingReadinessClientState,
  profile: BillingConfigurationProfileState,
  requested: BillingConfigurationEditableInput,
  generatedAt: string = new Date().toISOString(),
): BillingConfigurationPreview {
  const blockers: Array<{
    code: BillingConfigurationBlockCode;
    message: string;
  }> = [];
  const warnings: string[] = [];

  if (profile.duplicateProfiles) {
    blockers.push({
      code: "duplicate_profiles",
      message:
        "Multiple billing-profiles records exist for this client. Resolve conflicting profiles before configuring billing.",
    });
  }

  const validated = validateBillingConfigurationInput(requested);
  let proposed: BillingConfigurationEditableInput = {
    currencyCode: null,
    billingContact: null,
    billingEmail: null,
    collectionMethod: null,
    paymentTerms: null,
    taxPosture: null,
    invoiceCadence: null,
  };
  if (!validated.ok) {
    blockers.push({ code: validated.code, message: validated.message });
  } else {
    proposed = validated.value;
  }

  const rawAgreement = state.commercialAgreementId;
  let agreementRecordStatus: BillingConfigurationPreview["agreementRecordStatus"] =
    "unset";
  if (!rawAgreement) {
    agreementRecordStatus = "unset";
    warnings.push(
      "No recorded commercial agreement. Foundational billing contact and configuration may be saved, but financial readiness remains incomplete.",
    );
  } else if (!isCommercialAgreementId(rawAgreement)) {
    agreementRecordStatus = "unknown";
    blockers.push({
      code: "unknown_agreement",
      message:
        "Unknown commercial agreement blocks completing financial-readiness configuration.",
    });
  } else {
    agreementRecordStatus = "recorded";
  }

  if (state.planStatus === "paused") {
    warnings.push(
      "Plan is paused. Billing configuration does not change access or resume the plan.",
    );
  }
  if (state.planStatus === "trial") {
    warnings.push(
      "Plan status is trial. Configuration does not create a Stripe trial or deferred billing.",
    );
  }
  if (!state.planKey) {
    warnings.push(
      "No modern plan is assigned. Access provisioning remains separate from billing configuration.",
    );
  }

  warnings.push(
    "Automatic collection records intent only — it does not enable payment capability or create Stripe payment methods.",
  );
  warnings.push(
    "Tax posture is recorded only. Tax is never calculated, and exemption is never inferred.",
  );
  warnings.push(
    "Invoice cadence preference does not rewrite the commercial monthly-retainer cadence.",
  );
  warnings.push(
    "Commercial add-ons remain classified by the commercial catalog. Billable amounts are never invented here.",
  );

  const current = currentValuesFromProfile(profile);
  const changedFields =
    validated.ok ? computeChangedFields(current, proposed) : [];
  const materialChange = changedFields.length > 0;
  const operation: BillingConfigurationPreview["operation"] = !materialChange
    ? "noop"
    : profile.profilePresent
      ? "revise"
      : "create";

  const resultingReadiness = buildBillingReadinessSnapshot(
    state,
    validated.ok
      ? profileStateForReadiness(profile, proposed)
      : {
          ...profile,
          profilePresent: profile.profilePresent,
          currencyCode: profile.currencyCode,
          collectionMethod: profile.collectionMethod,
          taxPosture: profile.taxPosture,
        },
    generatedAt,
  );

  const canApply = blockers.length === 0;

  const previewFingerprint = buildBillingConfigurationFingerprint({
    clientId: state.clientId,
    clientUpdatedAt: state.updatedAt,
    profileId: profile.profileId,
    profileUpdatedAt: profile.profileUpdatedAt,
    agreementId: state.commercialAgreementId,
    planKey: state.planKey,
    planStatus: state.planStatus,
    setupFee: state.setupFee,
    monthlyRetainerAmount: state.monthlyRetainerAmount,
    monthlyServiceCredits: state.monthlyServiceCredits,
    commercialAddOns: state.commercialAddOns,
    current: {
      currencyCode: current.currencyCode,
      billingContact: current.billingContact,
      billingEmail: current.billingEmail,
      collectionMethod: current.collectionMethod,
      paymentTerms: current.paymentTerms,
      taxPosture: current.taxPosture,
      invoiceCadence: current.invoiceCadence,
    },
    proposed,
  });

  return {
    clientId: state.clientId,
    clientName: state.clientName,
    clientSlug: state.clientSlug,
    agreementId: isCommercialAgreementId(rawAgreement) ? rawAgreement : null,
    agreementName: resultingReadiness.agreementName,
    agreementRecordStatus,
    planKey: state.planKey,
    planStatus: state.planStatus,
    profilePresent: profile.profilePresent,
    profileId: profile.profileId,
    operation,
    canApply,
    current,
    proposed,
    changedFields,
    commercialTermsUnchanged: true,
    planAccessUnchanged: true,
    stripeUnchanged: true,
    noInvoiceSubscriptionChargeOrEmail: true,
    warnings: [...new Set(warnings)],
    blockers,
    resultingReadiness,
    ownership: { ...BILLING_CONFIGURATION_OWNERSHIP },
    notices: BILLING_CONFIGURATION_NOTICES,
    previewFingerprint,
    generatedAt,
  };
}

const FORBIDDEN_BROWSER_FIELDS = [
  "setupFee",
  "monthlyRetainerAmount",
  "monthlyRetainer",
  "monthlyServiceCredits",
  "commercialAgreementId",
  "agreementId",
  "planKey",
  "planStatus",
  "amount",
  "amounts",
  "stripeCustomerId",
  "stripeSubscriptionId",
  "customerId",
  "subscriptionId",
  "invoiceId",
  "productId",
  "priceId",
  "readiness",
  "tax",
  "discount",
  "proration",
  "credits",
  "resultingReadiness",
] as const;

function parseEditableFields(
  record: Record<string, unknown>,
):
  | { ok: true; input: BillingConfigurationEditableInput }
  | { ok: false; code: BillingConfigurationBlockCode; message: string } {
  const unapproved = FORBIDDEN_BROWSER_FIELDS.filter((key) => key in record);
  if (unapproved.length) {
    return {
      ok: false,
      code: "unapproved_fields",
      message:
        "Billing-configuration request must not supply commercial amounts, agreement/plan identity, Stripe IDs, readiness, or tax calculations.",
    };
  }

  const allowed = new Set([
    "currencyCode",
    "billingContact",
    "billingEmail",
    "collectionMethod",
    "paymentTerms",
    "taxPosture",
    "invoiceCadence",
    "previewFingerprint",
    "confirmed",
    "acknowledged",
    "configurationDoesNotActivateBilling",
  ]);
  const unknownKeys = Object.keys(record).filter((key) => !allowed.has(key));
  if (unknownKeys.length) {
    return {
      ok: false,
      code: "unapproved_fields",
      message: `Unexpected billing-configuration fields: ${unknownKeys.join(", ")}.`,
    };
  }

  return {
    ok: true,
    input: {
      currencyCode:
        record.currencyCode === null || record.currencyCode === undefined
          ? null
          : (record.currencyCode as BillingCurrencyCode | null),
      billingContact:
        record.billingContact === null || record.billingContact === undefined
          ? null
          : (record.billingContact as string | null),
      billingEmail:
        record.billingEmail === null || record.billingEmail === undefined
          ? null
          : (record.billingEmail as string | null),
      collectionMethod:
        record.collectionMethod === null ||
        record.collectionMethod === undefined
          ? null
          : (record.collectionMethod as BillingCollectionMethod | null),
      paymentTerms:
        record.paymentTerms === null || record.paymentTerms === undefined
          ? null
          : (record.paymentTerms as BillingPaymentTerms | null),
      taxPosture:
        record.taxPosture === null || record.taxPosture === undefined
          ? null
          : (record.taxPosture as BillingTaxPosture | null),
      invoiceCadence:
        record.invoiceCadence === null || record.invoiceCadence === undefined
          ? null
          : (record.invoiceCadence as BillingInvoiceCadence | null),
    },
  };
}

/**
 * Preview body: editable configuration only.
 */
export function parseBillingConfigurationPreviewBody(
  body: unknown,
):
  | { ok: true; input: BillingConfigurationEditableInput }
  | { ok: false; code: BillingConfigurationBlockCode; message: string } {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return {
      ok: false,
      code: "unapproved_fields",
      message: "Invalid billing-configuration preview request.",
    };
  }
  return parseEditableFields(body as Record<string, unknown>);
}

/**
 * Apply body: editable configuration + fingerprint + acknowledgments.
 */
export function parseBillingConfigurationApplyBody(
  body: unknown,
):
  | {
      ok: true;
      input: BillingConfigurationEditableInput;
      previewFingerprint: string;
      confirmed: boolean;
      configurationDoesNotActivateBilling: boolean;
    }
  | { ok: false; code: BillingConfigurationBlockCode; message: string } {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return {
      ok: false,
      code: "unapproved_fields",
      message: "Invalid billing-configuration apply request.",
    };
  }
  const record = body as Record<string, unknown>;
  const parsed = parseEditableFields(record);
  if (!parsed.ok) return parsed;

  const fingerprint = record.previewFingerprint;
  if (typeof fingerprint !== "string" || !fingerprint.trim()) {
    return {
      ok: false,
      code: "stale_preview",
      message: "A fresh billing-configuration preview is required.",
    };
  }

  if (record.confirmed !== true) {
    return {
      ok: false,
      code: "confirmation_required",
      message:
        "Explicit confirmation is required before saving billing configuration.",
    };
  }

  if (record.configurationDoesNotActivateBilling !== true) {
    return {
      ok: false,
      code: "confirmation_required",
      message:
        "Acknowledge that configuration does not activate billing before confirming.",
    };
  }

  return {
    ok: true,
    input: parsed.input,
    previewFingerprint: fingerprint.trim(),
    confirmed: true,
    configurationDoesNotActivateBilling: true,
  };
}

/**
 * Persistence payload for billing-profiles only.
 * Never includes commercial amounts or Stripe IDs.
 * billingStatus becomes partial when any configuration is present; never "active".
 */
export function buildBillingProfilePersistencePayload(
  proposed: BillingConfigurationEditableInput,
): Record<string, unknown> {
  const hasAny =
    proposed.currencyCode != null ||
    proposed.billingContact != null ||
    proposed.billingEmail != null ||
    proposed.collectionMethod != null ||
    proposed.paymentTerms != null ||
    (proposed.taxPosture != null &&
      proposed.taxPosture !== "not_configured") ||
    proposed.invoiceCadence != null;

  return {
    currencyCode: proposed.currencyCode,
    billingContact: proposed.billingContact,
    billingEmail: proposed.billingEmail,
    collectionMethod: proposed.collectionMethod,
    paymentTerms: proposed.paymentTerms,
    taxPosture: proposed.taxPosture ?? "not_configured",
    invoiceCadence: proposed.invoiceCadence,
    billingStatus: hasAny ? "partial" : "not-configured",
  };
}

export function billingConfigurationOperationLabel(
  operation: BillingConfigurationPreview["operation"],
): string {
  if (operation === "create") return "Create billing configuration";
  if (operation === "revise") return "Revise billing configuration";
  return "Configuration unchanged";
}
