/**
 * Phase 5 Batch 5D — Staff-facing invoice presentation.
 * Reuses Batch 5C row projection; ops-toned unavailable copy.
 * Pure — no network, no secrets.
 */

import {
  projectInvoiceRow,
  shouldRenderReceiptAction,
} from "@/lib/portal/billing/presentation";
import type { PortalBillingView } from "@/lib/portal/billing/types";
import type {
  InvoiceReadListResult,
  InvoiceReadUnavailableCode,
} from "@/lib/stripe/invoice-read-types";

export type StaffInvoiceView = PortalBillingView;

const STAFF_UNAVAILABLE_COPY: Record<
  InvoiceReadUnavailableCode,
  { title: string; description: string }
> = {
  read_not_authorized: {
    title: "Stripe invoice reads are not authorized",
    description:
      "TEST-mode invoice visibility is not enabled in this environment. No invoices were loaded.",
  },
  session_required: {
    title: "Operator sign-in required",
    description: "Sign in as an authorized operator to view Stripe invoices.",
  },
  client_mismatch: {
    title: "Client mismatch",
    description:
      "The billing profile does not match the selected client. No invoices were loaded.",
  },
  browser_authority_rejected: {
    title: "Request rejected",
    description:
      "Browser-supplied customer, client, or mode fields cannot authorize invoice access.",
  },
  missing_configuration: {
    title: "Stripe configuration unavailable",
    description:
      "Commercial TEST Stripe credentials are missing or invalid. Configure test keys before loading invoices.",
  },
  mode_disallowed: {
    title: "Live-mode mapping is not readable here",
    description:
      "Batch 5D only reads TEST-mode Stripe customers. This client’s mapping is live and was not queried.",
  },
  mode_mismatch: {
    title: "Stripe mapping mode is unusable",
    description:
      "The billing profile mapping mode is missing or inconsistent. Resolve mapping in Stripe customer linking before reading invoices.",
  },
  missing_billing_profile: {
    title: "No billing profile",
    description:
      "This client has no billing profile. Invoice visibility requires a profile with a linked TEST Stripe customer.",
  },
  missing_customer_mapping: {
    title: "Stripe customer not linked",
    description:
      "No Stripe customer ID is mapped for this client. Use Stripe customer linking when ready — this panel does not create or repair mappings.",
  },
  invalid_customer_mapping: {
    title: "Stripe customer mapping is invalid",
    description:
      "The stored Stripe customer ID is malformed. Correct it through the approved linking workflow.",
  },
  mapping_not_linked: {
    title: "Stripe customer is unlinked",
    description:
      "The billing profile mapping status is unlinked. Relink through the approved workflow when appropriate.",
  },
  provider_permission_denied: {
    title: "Stripe denied access",
    description:
      "The invoice provider rejected this request. Check TEST credentials and account permissions.",
  },
  provider_auth_failed: {
    title: "Stripe authentication failed",
    description:
      "The invoice provider could not authenticate. Check TEST API keys.",
  },
  provider_timeout: {
    title: "Stripe timed out",
    description: "The invoice provider timed out. Retry shortly.",
  },
  provider_outage: {
    title: "Stripe temporarily unavailable",
    description: "The invoice provider is temporarily unavailable. Retry later.",
  },
  provider_malformed: {
    title: "Unusable Stripe response",
    description:
      "The invoice provider returned an incomplete response. Retry later.",
  },
  invoice_not_found: {
    title: "Invoice unavailable",
    description: "That invoice is not available for this client.",
  },
  cross_customer_denied: {
    title: "Invoice unavailable",
    description: "That invoice is not available for this client.",
  },
  invalid_invoice_id: {
    title: "Invoice unavailable",
    description: "That invoice is not available for this client.",
  },
  unexpected_failure: {
    title: "Unable to load invoices",
    description:
      "Something went wrong while loading Stripe invoices. Retry later.",
  },
};

export function projectStaffInvoiceView(
  result: InvoiceReadListResult,
  clientLabel: string,
): StaffInvoiceView {
  if (result.availability === "unavailable") {
    const copy =
      STAFF_UNAVAILABLE_COPY[result.code] ??
      STAFF_UNAVAILABLE_COPY.unexpected_failure;
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
      title: "No Stripe invoices",
      description:
        "This TEST customer has no invoices yet. Empty is distinct from a missing mapping or provider failure.",
    };
  }

  return {
    kind: "ready",
    clientLabel,
    invoices: result.invoices.map(projectInvoiceRow),
    hasMore: result.hasMore,
    paginationNote: result.hasMore
      ? "Showing the most recent invoices (bounded page). Older history may exist in Stripe."
      : null,
  };
}

export { shouldRenderReceiptAction };
