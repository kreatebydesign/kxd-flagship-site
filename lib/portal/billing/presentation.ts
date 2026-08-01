/**
 * Phase 5 Batch 5C — Pure projection from Batch 5B DTO → portal Billing view.
 * No network. No secrets. No Stripe objects.
 */

import { formatCents } from "@/lib/proposal-builder/money";
import { fmtPortalDate } from "@/lib/portal/format";
import type {
  InvoiceReadListResult,
  InvoiceReadUnavailableCode,
  PortalSafeStripeInvoice,
} from "@/lib/stripe/invoice-read-types";
import { INVOICE_READ_DTO_ALLOWLIST } from "@/lib/stripe/invoice-read-types";
import { presentInvoiceStatus } from "./status";
import type { PortalBillingInvoiceRow, PortalBillingView } from "./types";

const UNAVAILABLE_COPY: Record<
  InvoiceReadUnavailableCode,
  { title: string; description: string }
> = {
  read_not_authorized: {
    title: "Billing is not available",
    description:
      "Invoice visibility is not enabled for this workspace yet. Contact KXD if you expected to see invoices here.",
  },
  session_required: {
    title: "Sign in required",
    description: "Sign in to your client portal to view invoices.",
  },
  client_mismatch: {
    title: "Billing is not available",
    description:
      "We could not load billing for the active account. Try switching accounts or contact KXD support.",
  },
  browser_authority_rejected: {
    title: "Billing is not available",
    description:
      "We could not authorize this billing request. Contact KXD support if this continues.",
  },
  missing_configuration: {
    title: "Billing is temporarily unavailable",
    description:
      "Invoice access is not fully configured right now. Please try again later or contact KXD support.",
  },
  mode_disallowed: {
    title: "Billing is not available",
    description:
      "Invoices for this account are not available in the portal yet. Contact KXD support for help.",
  },
  mode_mismatch: {
    title: "Billing is not available",
    description:
      "Billing for this account needs a short setup update. Contact KXD support and we will take care of it.",
  },
  missing_billing_profile: {
    title: "Billing is not set up yet",
    description:
      "Your account does not have billing details on file yet. Contact KXD support when you are ready to review invoices here.",
  },
  missing_customer_mapping: {
    title: "Billing is not connected yet",
    description:
      "Invoices will appear here once billing is connected for your account. Contact KXD support if you expected to see them already.",
  },
  invalid_customer_mapping: {
    title: "Billing needs a short update",
    description:
      "We could not load invoices for this account safely. Contact KXD support and we will resolve it.",
  },
  mapping_not_linked: {
    title: "Billing is not connected yet",
    description:
      "Invoices will appear here once billing is connected for your account. Contact KXD support if you need help.",
  },
  provider_permission_denied: {
    title: "Billing is temporarily unavailable",
    description:
      "We could not reach the invoice service right now. Please try again later or contact KXD support.",
  },
  provider_auth_failed: {
    title: "Billing is temporarily unavailable",
    description:
      "We could not reach the invoice service right now. Please try again later or contact KXD support.",
  },
  provider_timeout: {
    title: "Billing is taking longer than usual",
    description:
      "The invoice service timed out. Please refresh in a moment or contact KXD support if this continues.",
  },
  provider_outage: {
    title: "Billing is temporarily unavailable",
    description:
      "The invoice service is temporarily unavailable. Please try again later.",
  },
  provider_malformed: {
    title: "Billing is temporarily unavailable",
    description:
      "We received an incomplete invoice response. Please try again later or contact KXD support.",
  },
  invoice_not_found: {
    title: "Invoice unavailable",
    description:
      "That invoice is not available for this account.",
  },
  cross_customer_denied: {
    title: "Invoice unavailable",
    description:
      "That invoice is not available for this account.",
  },
  invalid_invoice_id: {
    title: "Invoice unavailable",
    description:
      "That invoice is not available for this account.",
  },
  unexpected_failure: {
    title: "Billing is temporarily unavailable",
    description:
      "Something went wrong while loading invoices. Please try again later or contact KXD support.",
  },
};

function safeHttpsUrl(value: string | null | undefined): string | null {
  if (!value || typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed.startsWith("https://")) return null;
  return trimmed;
}

function moneyLabel(amount: number, currency: string): string {
  return formatCents(amount, currency || "usd");
}

export function projectInvoiceRow(
  invoice: PortalSafeStripeInvoice,
): PortalBillingInvoiceRow {
  const status = presentInvoiceStatus(invoice.status);
  const viewUrl = safeHttpsUrl(invoice.hostedInvoiceUrl);
  const paymentUrl = safeHttpsUrl(invoice.hostedPaymentUrl);
  const canPay = invoice.status === "open" && Boolean(paymentUrl);

  return {
    key: invoice.id,
    displayNumber:
      invoice.number && invoice.number.trim()
        ? invoice.number.trim()
        : "Invoice",
    statusLabel: status.label,
    statusAriaLabel: status.ariaLabel,
    badgeVariant: status.badgeVariant,
    amountDueLabel: moneyLabel(invoice.amountDue, invoice.currency),
    amountPaidLabel:
      invoice.amountPaid > 0
        ? moneyLabel(invoice.amountPaid, invoice.currency)
        : null,
    amountRemainingLabel:
      invoice.status === "open" && invoice.amountRemaining > 0
        ? moneyLabel(invoice.amountRemaining, invoice.currency)
        : null,
    createdLabel: invoice.createdAt ? fmtPortalDate(invoice.createdAt) : null,
    dueLabel: invoice.dueDate ? fmtPortalDate(invoice.dueDate) : null,
    paidLabel: invoice.paidAt ? fmtPortalDate(invoice.paidAt) : null,
    viewInvoiceUrl: viewUrl,
    payUrl: canPay ? paymentUrl : null,
  };
}

/** Guard used by verifiers — presentation must not grow beyond DTO allowlist. */
export function portalBillingDtoAllowlist(): readonly string[] {
  return INVOICE_READ_DTO_ALLOWLIST;
}

export function projectPortalBillingView(
  result: InvoiceReadListResult,
  clientLabel: string,
): PortalBillingView {
  if (result.availability === "unavailable") {
    const copy = UNAVAILABLE_COPY[result.code] ?? UNAVAILABLE_COPY.unexpected_failure;
    return {
      kind: "unavailable",
      clientLabel: result.clientId != null ? clientLabel : null,
      title: copy.title,
      description: copy.description,
      reasonCode: result.code,
    };
  }

  if (result.availability === "empty") {
    return {
      kind: "empty",
      clientLabel,
      title: "No invoices yet",
      description:
        "When invoices are issued for this account, they will appear here. You can pay open invoices securely through Stripe.",
    };
  }

  return {
    kind: "ready",
    clientLabel,
    invoices: result.invoices.map(projectInvoiceRow),
    hasMore: result.hasMore,
    paginationNote: result.hasMore
      ? "Showing the most recent invoices. Additional history may be available through Stripe."
      : null,
  };
}

/** Receipt actions must never render while hostedReceiptUrl remains null. */
export function shouldRenderReceiptAction(
  hostedReceiptUrl: null | string | undefined,
): boolean {
  return Boolean(
    typeof hostedReceiptUrl === "string" &&
      hostedReceiptUrl.trim().startsWith("https://"),
  );
}
