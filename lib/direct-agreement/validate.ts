import {
  AGREEMENT_SOURCES,
  COMMERCIAL_STRUCTURES,
  EXTERNAL_ACCEPTANCE_METHODS,
  FORBIDDEN_CARD_FIELD_NAMES,
  ROLLOVER_POLICIES,
  type CreateDirectAgreementInput,
  type DirectAgreementTerms,
  type ExternalAcceptanceRecord,
  type PaymentAuthorizationRecord,
} from "./types";

export type FieldErrors = Record<string, string>;

function nonEmpty(value: unknown, label: string, errors: FieldErrors, key: string): string {
  const text = String(value ?? "").trim();
  if (!text) errors[key] = `${label} is required.`;
  return text;
}

function nonNegativeCents(value: unknown, label: string, errors: FieldErrors, key: string): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) {
    errors[key] = `${label} must be a non-negative integer (cents).`;
    return 0;
  }
  return n;
}

export function normalizeDirectAgreementTerms(
  raw: CreateDirectAgreementInput["agreementTerms"],
): { terms: DirectAgreementTerms | null; errors: FieldErrors } {
  const errors: FieldErrors = {};
  const structure = String(raw.commercialStructure ?? "");
  if (!COMMERCIAL_STRUCTURES.includes(structure as never)) {
    errors.commercialStructure = "Commercial structure must be one-time, recurring, or combined.";
  }

  const oneTimeAmountCents = nonNegativeCents(
    raw.oneTimeAmountCents,
    "One-time amount",
    errors,
    "oneTimeAmountCents",
  );
  const monthlyAmountCents = nonNegativeCents(
    raw.monthlyAmountCents,
    "Monthly amount",
    errors,
    "monthlyAmountCents",
  );

  if (structure === "one-time" && oneTimeAmountCents <= 0) {
    errors.oneTimeAmountCents = "One-time prepaid agreements require a positive one-time amount.";
  }
  if (structure === "one-time" && monthlyAmountCents > 0) {
    errors.monthlyAmountCents =
      "One-time prepaid agreements must not set a monthly recurring amount (avoids false MRR).";
  }
  if (structure === "recurring" && monthlyAmountCents <= 0) {
    errors.monthlyAmountCents = "Recurring agreements require a positive monthly amount.";
  }
  if (structure === "combined" && oneTimeAmountCents <= 0 && monthlyAmountCents <= 0) {
    errors.oneTimeAmountCents = "Combined agreements require a one-time and/or monthly amount.";
  }

  const serviceStartDate = nonEmpty(raw.serviceStartDate, "Service start date", errors, "serviceStartDate");
  const serviceEndDate = raw.serviceEndDate ? String(raw.serviceEndDate).trim() : null;
  if (serviceStartDate && serviceEndDate && serviceEndDate < serviceStartDate) {
    errors.serviceEndDate = "Service end date must be on or after the start date.";
  }

  const rollover = String(raw.rolloverPolicy ?? "none");
  if (!ROLLOVER_POLICIES.includes(rollover as never)) {
    errors.rolloverPolicy = "Rollover policy must be none or manual-approval.";
  }

  if (raw.autoRenew === true && structure === "one-time") {
    errors.autoRenew = "One-time prepaid Direct Agreements must not auto-renew.";
  }

  const capacity =
    raw.capacityHoursPerMonth == null || raw.capacityHoursPerMonth === ("" as never)
      ? null
      : Number(raw.capacityHoursPerMonth);
  if (capacity != null && (!Number.isFinite(capacity) || capacity < 0)) {
    errors.capacityHoursPerMonth = "Capacity hours must be a non-negative number or empty.";
  }

  const terms: DirectAgreementTerms = {
    schemaVersion: 1,
    commercialStructure: (structure || "one-time") as DirectAgreementTerms["commercialStructure"],
    oneTimeAmountCents,
    monthlyAmountCents,
    currency: "USD",
    serviceStartDate,
    serviceEndDate,
    scope: nonEmpty(raw.scope, "Scope", errors, "scope"),
    includedServices: nonEmpty(raw.includedServices, "Included services", errors, "includedServices"),
    exclusions: String(raw.exclusions ?? "").trim(),
    capacityHoursPerMonth: capacity,
    rolloverPolicy: (rollover || "none") as DirectAgreementTerms["rolloverPolicy"],
    revisionAllowance: String(raw.revisionAllowance ?? "").trim(),
    overagePreapprovalRule: nonEmpty(
      raw.overagePreapprovalRule,
      "Overage / preapproval rule",
      errors,
      "overagePreapprovalRule",
    ),
    paymentTerms: nonEmpty(raw.paymentTerms, "Payment terms", errors, "paymentTerms"),
    cancellationRefundLanguage: nonEmpty(
      raw.cancellationRefundLanguage,
      "Cancellation / refund language",
      errors,
      "cancellationRefundLanguage",
    ),
    intellectualPropertyLanguage: nonEmpty(
      raw.intellectualPropertyLanguage,
      "Intellectual-property language",
      errors,
      "intellectualPropertyLanguage",
    ),
    portfolioUseLanguage: nonEmpty(
      raw.portfolioUseLanguage,
      "Portfolio-use language",
      errors,
      "portfolioUseLanguage",
    ),
    clientResponsibilities: nonEmpty(
      raw.clientResponsibilities,
      "Client responsibilities",
      errors,
      "clientResponsibilities",
    ),
    renewalBehavior: nonEmpty(raw.renewalBehavior, "Renewal behavior", errors, "renewalBehavior"),
    autoRenew: Boolean(raw.autoRenew),
    billingContactName: raw.billingContactName ? String(raw.billingContactName).trim() : null,
    billingEmail: raw.billingEmail ? String(raw.billingEmail).trim() : null,
    payerLegalName: raw.payerLegalName ? String(raw.payerLegalName).trim() : null,
    brandName: raw.brandName ? String(raw.brandName).trim() : null,
    termsVersion: Number(raw.termsVersion ?? 1) || 1,
  };

  return { terms: Object.keys(errors).length ? null : terms, errors };
}

export function validateCreateDirectAgreementInput(
  input: CreateDirectAgreementInput,
): { ok: true; terms: DirectAgreementTerms } | { ok: false; errors: FieldErrors } {
  const errors: FieldErrors = {};
  const clientId = Number(input.clientId);
  if (!Number.isInteger(clientId) || clientId <= 0) {
    errors.clientId = "An existing client is required. Orphan Direct Agreements are not allowed.";
  }
  nonEmpty(input.title, "Agreement title", errors, "title");
  nonEmpty(input.contractType, "Agreement type", errors, "contractType");
  nonEmpty(input.body, "Agreement body", errors, "body");

  const { terms, errors: termErrors } = normalizeDirectAgreementTerms(input.agreementTerms);
  Object.assign(errors, termErrors);

  if (Object.keys(errors).length || !terms) {
    return { ok: false, errors };
  }
  return { ok: true, terms };
}

export function validateExternalAcceptanceInput(input: {
  acceptedBy: unknown;
  acceptedAt: unknown;
  method: unknown;
  evidenceNotes: unknown;
  clientId: unknown;
  contractId: unknown;
  evidenceReference?: unknown;
}): { ok: true; record: Omit<ExternalAcceptanceRecord, "recordedBy" | "recordedAt"> } | { ok: false; errors: FieldErrors } {
  const errors: FieldErrors = {};
  const acceptedBy = nonEmpty(input.acceptedBy, "Accepted by", errors, "acceptedBy");
  const acceptedAt = nonEmpty(input.acceptedAt, "Acceptance date", errors, "acceptedAt");
  const method = String(input.method ?? "");
  if (!EXTERNAL_ACCEPTANCE_METHODS.includes(method as never)) {
    errors.method = "Acceptance method is required.";
  }
  const evidenceNotes = nonEmpty(input.evidenceNotes, "Evidence notes", errors, "evidenceNotes");
  const clientId = Number(input.clientId);
  const contractId = Number(input.contractId);
  if (!Number.isInteger(clientId) || clientId <= 0) {
    errors.clientId = "Client is required.";
  }
  if (!Number.isInteger(contractId) || contractId <= 0) {
    errors.contractId = "Contract is required.";
  }

  if (Object.keys(errors).length) return { ok: false, errors };

  return {
    ok: true,
    record: {
      schemaVersion: 1,
      label: "externally-recorded-acceptance",
      acceptedBy,
      acceptedAt,
      method: method as ExternalAcceptanceRecord["method"],
      evidenceNotes,
      clientId,
      contractId,
      evidenceReference: input.evidenceReference
        ? String(input.evidenceReference).trim()
        : null,
    },
  };
}

export function assertNoSensitiveCardFields(payload: Record<string, unknown>): void {
  const keys = Object.keys(payload);
  for (const forbidden of FORBIDDEN_CARD_FIELD_NAMES) {
    if (keys.some((k) => k.toLowerCase() === forbidden.toLowerCase())) {
      throw new Error(`Sensitive card field "${forbidden}" is not allowed.`);
    }
  }
  const blob = JSON.stringify(payload).toLowerCase();
  if (/\b(card[_-]?number|pan|cvc|cvv)\b["']?\s*:\s*["']?\d{3,}/.test(blob)) {
    throw new Error("Sensitive card data detected in authorization payload.");
  }
}

export function validatePaymentAuthorizationInput(input: Record<string, unknown>): {
  ok: true;
  record: Omit<PaymentAuthorizationRecord, "recordedBy" | "recordedAt">;
} | { ok: false; errors: FieldErrors } {
  try {
    assertNoSensitiveCardFields(input);
  } catch (err) {
    return {
      ok: false,
      errors: {
        card: err instanceof Error ? err.message : "Sensitive card data is not allowed.",
      },
    };
  }
  const errors: FieldErrors = {};
  const authorizationType = nonEmpty(
    input.authorizationType,
    "Authorization type",
    errors,
    "authorizationType",
  );
  const authorizedBy = nonEmpty(input.authorizedBy, "Authorized by", errors, "authorizedBy");
  const authorizationMethod = nonEmpty(
    input.authorizationMethod,
    "Authorization method",
    errors,
    "authorizationMethod",
  );
  const authorizedAt = nonEmpty(input.authorizedAt, "Authorization date", errors, "authorizedAt");
  const scope = nonEmpty(input.scope, "Authorization scope", errors, "scope");
  const amountAuthorizedCents = nonNegativeCents(
    input.amountAuthorizedCents,
    "Amount authorized",
    errors,
    "amountAuthorizedCents",
  );
  if (amountAuthorizedCents <= 0) {
    errors.amountAuthorizedCents = "Amount authorized must be positive.";
  }
  const evidenceNotes = nonEmpty(input.evidenceNotes, "Evidence notes", errors, "evidenceNotes");

  const last4 = input.cardLast4 == null || input.cardLast4 === ""
    ? null
    : String(input.cardLast4).replace(/\D/g, "");
  if (last4 && !/^\d{4}$/.test(last4)) {
    errors.cardLast4 = "Card last four must be exactly four digits when provided.";
  }

  if (Object.keys(errors).length) return { ok: false, errors };

  return {
    ok: true,
    record: {
      schemaVersion: 1,
      authorizationType,
      authorizedBy,
      cardholderName: input.cardholderName ? String(input.cardholderName).trim() : null,
      authorizationMethod,
      authorizedAt,
      scope,
      amountAuthorizedCents,
      currency: "USD",
      evidenceNotes,
      revokedAt: null,
      stripeCustomerId: input.stripeCustomerId ? String(input.stripeCustomerId).trim() : null,
      stripePaymentMethodId: input.stripePaymentMethodId
        ? String(input.stripePaymentMethodId).trim()
        : null,
      cardBrand: input.cardBrand ? String(input.cardBrand).trim() : null,
      cardLast4: last4,
      cardExpMonth:
        input.cardExpMonth == null || input.cardExpMonth === ""
          ? null
          : Number(input.cardExpMonth),
      cardExpYear:
        input.cardExpYear == null || input.cardExpYear === ""
          ? null
          : Number(input.cardExpYear),
      stripePaymentIntentId: input.stripePaymentIntentId
        ? String(input.stripePaymentIntentId).trim()
        : null,
      stripeChargeId: input.stripeChargeId ? String(input.stripeChargeId).trim() : null,
      stripeInvoiceId: input.stripeInvoiceId ? String(input.stripeInvoiceId).trim() : null,
      hostedInvoiceUrl: input.hostedInvoiceUrl ? String(input.hostedInvoiceUrl).trim() : null,
      receiptUrl: input.receiptUrl ? String(input.receiptUrl).trim() : null,
      paymentStatus: input.paymentStatus ? String(input.paymentStatus).trim() : null,
    },
  };
}

export function isAgreementSource(value: unknown): value is (typeof AGREEMENT_SOURCES)[number] {
  return AGREEMENT_SOURCES.includes(String(value) as never);
}

export function parseStoredDirectAgreementTerms(raw: unknown): DirectAgreementTerms | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Partial<DirectAgreementTerms>;
  if (obj.schemaVersion !== 1) return null;
  const { terms, errors } = normalizeDirectAgreementTerms({
    commercialStructure: obj.commercialStructure ?? "one-time",
    oneTimeAmountCents: obj.oneTimeAmountCents ?? 0,
    monthlyAmountCents: obj.monthlyAmountCents ?? 0,
    serviceStartDate: obj.serviceStartDate ?? "",
    serviceEndDate: obj.serviceEndDate ?? null,
    scope: obj.scope ?? "",
    includedServices: obj.includedServices ?? "",
    exclusions: obj.exclusions ?? "",
    capacityHoursPerMonth: obj.capacityHoursPerMonth ?? null,
    rolloverPolicy: obj.rolloverPolicy ?? "none",
    revisionAllowance: obj.revisionAllowance ?? "",
    overagePreapprovalRule: obj.overagePreapprovalRule ?? "",
    paymentTerms: obj.paymentTerms ?? "",
    cancellationRefundLanguage: obj.cancellationRefundLanguage ?? "",
    intellectualPropertyLanguage: obj.intellectualPropertyLanguage ?? "",
    portfolioUseLanguage: obj.portfolioUseLanguage ?? "",
    clientResponsibilities: obj.clientResponsibilities ?? "",
    renewalBehavior: obj.renewalBehavior ?? "",
    autoRenew: Boolean(obj.autoRenew),
    billingContactName: obj.billingContactName,
    billingEmail: obj.billingEmail,
    payerLegalName: obj.payerLegalName,
    brandName: obj.brandName,
    termsVersion: obj.termsVersion ?? 1,
  });
  if (Object.keys(errors).length || !terms) return null;
  return terms;
}
