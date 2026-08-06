/**
 * Invoice & Billing Readiness — blockers before signature send / Stripe prep.
 * Never invents KXD legal, tax, remittance, or client identity facts.
 */

import type { CanonicalProposal } from "../proposal-builder/types.ts";
import { fieldIsReady, getKxdInvoiceConfig } from "./billing-identity.ts";
import { reconcileInstallments } from "./structured-payment-terms.ts";
import type {
  ContractLifecyclePackage,
  ReadinessIssue,
  StructuredPaymentTerms,
} from "./types.ts";

/** @deprecated Prefer getKxdInvoiceConfig() — getters for legacy call sites. */
export const KXD_INVOICE_CONFIG = {
  get displayName() {
    return getKxdInvoiceConfig().displayName;
  },
  get legalEntity() {
    return getKxdInvoiceConfig().legalEntity.value;
  },
  get mailingAddress() {
    return getKxdInvoiceConfig().mailingAddress.value;
  },
  get billingEmail() {
    return getKxdInvoiceConfig().billingEmail.value;
  },
  get phone() {
    return getKxdInvoiceConfig().phone.value;
  },
  get website() {
    return getKxdInvoiceConfig().website;
  },
  get remittanceInformation() {
    return getKxdInvoiceConfig().remittanceInformation.value;
  },
  get defaultCurrency() {
    return getKxdInvoiceConfig().defaultCurrency;
  },
  get defaultPaymentTerms() {
    return getKxdInvoiceConfig().defaultPaymentTerms.value;
  },
  get stripeAccountContext() {
    return getKxdInvoiceConfig().stripeAccountContext;
  },
  get invoiceNumberingConfigured() {
    return getKxdInvoiceConfig().invoiceNumberingConfigured;
  },
};

export function assessBillingReadiness(input: {
  canonical: CanonicalProposal | null;
  terms: StructuredPaymentTerms | null;
  pkg: ContractLifecyclePackage;
  clientLegalName?: string | null;
  billingEmail?: string | null;
  billingAddressPresent?: boolean;
  stripeCustomerId?: string | null;
  operatorSigned?: boolean;
}): ReadinessIssue[] {
  const issues: ReadinessIssue[] = [];
  const kxd = getKxdInvoiceConfig();
  const identity = input.pkg.clientBillingIdentity;

  if (!input.canonical) {
    const isDirect =
      input.pkg.commercialSource === "direct-agreement" ||
      input.terms?.commercialSource === "direct-agreement";
    if (!isDirect) {
      issues.push({
        code: "missing-accepted-snapshot",
        severity: "blocker",
        field: "acceptedSnapshot",
        message: "Accepted proposal snapshot is required.",
      });
    }
  }

  if (!input.terms) {
    issues.push({
      code: "missing-payment-terms",
      severity: "blocker",
      field: "structuredPaymentTerms",
      message: "Structured payment terms have not been derived.",
    });
  } else {
    const recon = reconcileInstallments(input.terms);
    if (!recon.ok) {
      issues.push({
        code: "installment-total-mismatch",
        severity: "blocker",
        field: "installments",
        message: `Installments sum ${recon.sumCents}¢ ≠ one-time ${input.terms.oneTimeTotalCents}¢ (Δ ${recon.differenceCents}¢).`,
      });
    }
    const tax = identity?.taxTreatment ?? input.terms.taxes.treatment;
    if (tax === "unspecified" || tax == null) {
      issues.push({
        code: "tax-unspecified",
        severity: "blocker",
        field: "taxes.treatment",
        message: "Tax treatment is unspecified and blocks invoice approval.",
      });
    }
    const billingEmail =
      identity?.billingEmail?.trim() ||
      input.terms.billingEmail?.trim() ||
      input.billingEmail?.trim();
    if (!billingEmail) {
      issues.push({
        code: "missing-billing-email",
        severity: "blocker",
        field: "billingEmail",
        message: "Billing email is required before invoice preparation.",
      });
    }
    if (input.terms.recurring.amountCents > 0 && !input.terms.recurring.minimumTermMonths) {
      issues.push({
        code: "recurring-term-ambiguous",
        severity: "warning",
        field: "recurring.minimumTermMonths",
        message: "Recurring minimum term should be confirmed before activation.",
      });
    }
  }

  const legalName =
    identity?.legalName?.trim() ||
    input.clientLegalName?.trim() ||
    input.canonical?.primaryOrganization;
  if (!legalName) {
    issues.push({
      code: "missing-client-legal-name",
      severity: "blocker",
      field: "clientLegalName",
      message: "Client contracting legal entity is missing.",
    });
  }

  const addressPresent =
    Boolean(identity?.billingAddressPresent) ||
    Boolean(identity?.billingAddress?.trim()) ||
    Boolean(input.billingAddressPresent);
  if (!addressPresent) {
    issues.push({
      code: "missing-billing-address",
      severity: "blocker",
      field: "billingAddress",
      message: "Billing address is missing — required before invoice send.",
    });
  }

  if (!fieldIsReady(kxd.legalEntity) || !fieldIsReady(kxd.mailingAddress)) {
    issues.push({
      code: "missing-kxd-invoice-identity",
      severity: "blocker",
      field: "KXD_INVOICE_CONFIG",
      message:
        "KXD legal entity / mailing address are not configured. Do not invent remittance details.",
    });
  }
  if (!kxd.invoiceNumberingConfigured || kxd.invoiceNumberingState === "unresolved") {
    issues.push({
      code: "missing-invoice-numbering",
      severity: "blocker",
      field: "invoiceNumbering",
      message: "Invoice numbering configuration is incomplete.",
    });
  }
  if (!fieldIsReady(kxd.billingEmail)) {
    issues.push({
      code: "missing-kxd-billing-email",
      severity: "blocker",
      field: "kxd.billingEmail",
      message: "KXD billing/support email is unresolved.",
    });
  }
  if (!fieldIsReady(kxd.remittanceInformation)) {
    issues.push({
      code: "missing-remittance",
      severity: "blocker",
      field: "kxd.remittanceInformation",
      message: "Remittance instructions are unresolved.",
    });
  }

  if (!input.operatorSigned && !input.pkg.operatorSignature) {
    issues.push({
      code: "operator-signature-required",
      severity: "blocker",
      field: "operatorSignature",
      message: "KXD must sign before the contract can be sent to the client.",
      source: "signature",
    });
  }

  if (input.stripeCustomerId === "") {
    issues.push({
      code: "stripe-customer-empty",
      severity: "warning",
      field: "stripeCustomerId",
      message: "Stripe customer mapping is empty (mock/test prep may create a draft mapping).",
    });
  }

  return issues;
}

export function hasBlockers(issues: ReadinessIssue[]): boolean {
  return issues.some((i) => i.severity === "blocker");
}

export function blockersForSend(issues: ReadinessIssue[]): ReadinessIssue[] {
  return issues.filter((i) =>
    [
      "missing-accepted-snapshot",
      "missing-payment-terms",
      "installment-total-mismatch",
      "missing-client-legal-name",
      "operator-signature-required",
    ].includes(i.code),
  );
}

export function blockersForStripePrep(issues: ReadinessIssue[]): ReadinessIssue[] {
  return issues.filter((i) => i.severity === "blocker");
}
