/**
 * Phase 5 Batch 5B — Server-only Stripe invoice read foundation.
 *
 * Portal session → active client → billing-profile mapping → scoped Stripe reads.
 * No HTTP route. No UI. No mutations. No customer create/link.
 */
import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";

import type { PortalSession } from "@/lib/portal/session";
import {
  getCommercialStripeAdapter,
  StripeCommercialExecutionError,
} from "./commercial-client";
import type { CommercialStripeAdapter } from "./commercial-stripe-adapter";
import { resolveCommercialStripeTestCredentials } from "./commercial-credentials";
import {
  listInvoicesForMappedCustomer,
  readInvoiceForMappedCustomer,
} from "./invoice-read-ops";
import { clampInvoiceListLimit, unavailableList, unavailableOne } from "./invoice-read-logic";
import type {
  BillingProfileInvoiceMapping,
  InvoiceReadListResult,
  InvoiceReadOneResult,
} from "./invoice-read-types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

function asString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function relClientId(doc: AnyDoc): number | null {
  const raw = doc.client;
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (raw && typeof raw === "object" && typeof raw.id === "number") return raw.id;
  return null;
}

export async function loadBillingProfileInvoiceMapping(
  clientId: number,
): Promise<BillingProfileInvoiceMapping | null> {
  const payload = await getPayload({ config });
  const result = await payload.find({
    // Payload collection slug — same pattern as customer-linking-service.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- billing-profiles slug typing
    collection: "billing-profiles" as any,
    where: { client: { equals: clientId } },
    limit: 2,
    depth: 0,
    overrideAccess: true,
  });
  if (result.docs.length !== 1) return null;
  const doc = result.docs[0] as AnyDoc;
  const mappedClientId = relClientId(doc);
  if (mappedClientId !== clientId) return null;
  const modeRaw = asString(doc.stripeMode);
  return {
    clientId,
    stripeCustomerId: asString(doc.stripeCustomerId),
    stripeMode: modeRaw === "test" || modeRaw === "live" ? modeRaw : null,
    stripeCustomerMappingStatus: asString(doc.stripeCustomerMappingStatus),
  };
}

export {
  listInvoicesForMappedCustomer,
  readInvoiceForMappedCustomer,
} from "./invoice-read-ops";

/**
 * Portal entry — list invoices for the authenticated active client.
 */
export async function listPortalSessionInvoices(input: {
  session: PortalSession | null;
  limit?: number | null;
  adapter?: CommercialStripeAdapter;
}): Promise<InvoiceReadListResult> {
  const limit = clampInvoiceListLimit(input.limit);
  if (!input.session) {
    return unavailableList(
      "session_required",
      "Sign in is required to access invoices.",
      null,
      limit,
    );
  }

  const creds = resolveCommercialStripeTestCredentials();
  if (!creds.ok) {
    return unavailableList(
      "missing_configuration",
      "Invoice provider configuration is unavailable.",
      input.session.clientId,
      limit,
    );
  }

  let adapter: CommercialStripeAdapter;
  try {
    adapter =
      input.adapter ?? getCommercialStripeAdapter("invoice_list", undefined);
  } catch (err) {
    if (err instanceof StripeCommercialExecutionError) {
      return unavailableList(
        err.code === "execution_gate_closed"
          ? "read_not_authorized"
          : "missing_configuration",
        "Invoice reads are unavailable.",
        input.session.clientId,
        limit,
      );
    }
    throw err;
  }

  const mapping = await loadBillingProfileInvoiceMapping(input.session.clientId);
  return listInvoicesForMappedCustomer({
    authorizedClientId: input.session.clientId,
    mapping,
    adapter,
    limit,
  });
}

/**
 * Portal entry — retrieve one invoice for the authenticated active client.
 */
export async function readPortalSessionInvoice(input: {
  session: PortalSession | null;
  invoiceId: string;
  adapter?: CommercialStripeAdapter;
}): Promise<InvoiceReadOneResult> {
  if (!input.session) {
    return unavailableOne(
      "session_required",
      "Sign in is required to access invoices.",
      null,
    );
  }

  const creds = resolveCommercialStripeTestCredentials();
  if (!creds.ok) {
    return unavailableOne(
      "missing_configuration",
      "Invoice provider configuration is unavailable.",
      input.session.clientId,
    );
  }

  let adapter: CommercialStripeAdapter;
  try {
    adapter =
      input.adapter ?? getCommercialStripeAdapter("invoice_read", undefined);
  } catch (err) {
    if (err instanceof StripeCommercialExecutionError) {
      return unavailableOne(
        err.code === "execution_gate_closed"
          ? "read_not_authorized"
          : "missing_configuration",
        "Invoice reads are unavailable.",
        input.session.clientId,
      );
    }
    throw err;
  }

  const mapping = await loadBillingProfileInvoiceMapping(input.session.clientId);
  return readInvoiceForMappedCustomer({
    authorizedClientId: input.session.clientId,
    mapping,
    adapter,
    invoiceId: input.invoiceId,
  });
}
