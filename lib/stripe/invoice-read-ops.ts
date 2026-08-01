/**
 * Phase 5 Batch 5B — Injectable invoice read orchestration (no Payload / no env).
 * Used by the server service and deterministic verifiers.
 */

import type {
  CommercialStripeAdapter,
  CommercialStripeInvoiceSnapshot,
} from "./commercial-stripe-adapter";
import {
  assessInvoiceReadMapping,
  buildSuccessfulList,
  classifyProviderError,
  clampInvoiceListLimit,
  invoiceBelongsToMappedCustomer,
  isInvoiceReadOperationAuthorized,
  isStripeInvoiceIdFormat,
  projectPortalSafeStripeInvoice,
  rejectBrowserInvoiceReadAuthority,
  safeInvoiceNotFound,
  unavailableList,
  unavailableOne,
} from "./invoice-read-logic";
import type {
  BillingProfileInvoiceMapping,
  InvoiceReadListResult,
  InvoiceReadOneResult,
  StripeInvoiceReadSnapshot,
} from "./invoice-read-types";

function toReadSnapshot(
  invoice: CommercialStripeInvoiceSnapshot,
): StripeInvoiceReadSnapshot {
  return {
    id: invoice.id,
    customerId: invoice.customerId,
    number: invoice.number,
    status: invoice.status,
    livemode: invoice.livemode,
    amountDue: invoice.amountDue,
    amountPaid: invoice.amountPaid,
    amountRemaining: invoice.amountRemaining,
    currency: invoice.currency,
    created: invoice.created,
    dueDate: invoice.dueDate,
    paidAt: invoice.paidAt,
    hostedInvoiceUrl: invoice.hostedInvoiceUrl,
  };
}

export async function listInvoicesForMappedCustomer(input: {
  authorizedClientId: number;
  mapping: BillingProfileInvoiceMapping | null;
  adapter: CommercialStripeAdapter;
  limit?: number | null;
  browserBody?: unknown;
}): Promise<InvoiceReadListResult> {
  const limit = clampInvoiceListLimit(input.limit);

  if (!isInvoiceReadOperationAuthorized("invoice_list")) {
    return unavailableList(
      "read_not_authorized",
      "Stripe invoice reads are not authorized.",
      input.authorizedClientId,
      limit,
    );
  }

  const browser = rejectBrowserInvoiceReadAuthority(input.browserBody);
  if (!browser.ok) {
    return unavailableList(
      browser.code ?? "browser_authority_rejected",
      browser.message ?? "Browser authority rejected.",
      input.authorizedClientId,
      limit,
    );
  }

  const mappingGate = assessInvoiceReadMapping(
    input.mapping,
    input.authorizedClientId,
  );
  if (!mappingGate.ok) {
    return unavailableList(
      mappingGate.code,
      mappingGate.message,
      input.authorizedClientId,
      limit,
    );
  }

  try {
    const page = await input.adapter.listInvoicesByCustomer(
      mappingGate.customerId,
      limit,
    );
    const safe = page.invoices
      .filter((inv) =>
        invoiceBelongsToMappedCustomer(inv.customerId, mappingGate.customerId),
      )
      .filter((inv) => inv.livemode === false)
      .map((inv) => projectPortalSafeStripeInvoice(toReadSnapshot(inv)));

    return buildSuccessfulList({
      clientId: input.authorizedClientId,
      invoices: safe,
      hasMore: page.hasMore,
      limit,
    });
  } catch (err) {
    const classified = classifyProviderError(err);
    return unavailableList(
      classified.code,
      classified.message,
      input.authorizedClientId,
      limit,
    );
  }
}

export async function readInvoiceForMappedCustomer(input: {
  authorizedClientId: number;
  mapping: BillingProfileInvoiceMapping | null;
  adapter: CommercialStripeAdapter;
  invoiceId: string;
  browserBody?: unknown;
}): Promise<InvoiceReadOneResult> {
  if (!isInvoiceReadOperationAuthorized("invoice_read")) {
    return unavailableOne(
      "read_not_authorized",
      "Stripe invoice reads are not authorized.",
      input.authorizedClientId,
    );
  }

  const browser = rejectBrowserInvoiceReadAuthority(input.browserBody);
  if (!browser.ok) {
    return unavailableOne(
      browser.code ?? "browser_authority_rejected",
      browser.message ?? "Browser authority rejected.",
      input.authorizedClientId,
    );
  }

  if (!isStripeInvoiceIdFormat(input.invoiceId)) {
    return unavailableOne(
      "invalid_invoice_id",
      "Invoice is unavailable.",
      input.authorizedClientId,
    );
  }

  const mappingGate = assessInvoiceReadMapping(
    input.mapping,
    input.authorizedClientId,
  );
  if (!mappingGate.ok) {
    return unavailableOne(
      mappingGate.code,
      mappingGate.message,
      input.authorizedClientId,
    );
  }

  try {
    const invoice = await input.adapter.retrieveInvoice(input.invoiceId.trim());
    if (!invoice) {
      return safeInvoiceNotFound(input.authorizedClientId);
    }
    if (
      !invoiceBelongsToMappedCustomer(invoice.customerId, mappingGate.customerId)
    ) {
      return safeInvoiceNotFound(input.authorizedClientId);
    }
    if (invoice.livemode !== false) {
      return unavailableOne(
        "mode_mismatch",
        "Invoice is unavailable.",
        input.authorizedClientId,
      );
    }
    return {
      availability: "ready",
      code: null,
      message: null,
      clientId: input.authorizedClientId,
      mode: "test",
      invoice: projectPortalSafeStripeInvoice(toReadSnapshot(invoice)),
    };
  } catch (err) {
    const classified = classifyProviderError(err);
    if (classified.code === "invoice_not_found") {
      return safeInvoiceNotFound(input.authorizedClientId);
    }
    return unavailableOne(
      classified.code,
      classified.message,
      input.authorizedClientId,
    );
  }
}
