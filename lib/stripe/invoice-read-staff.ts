/**
 * Phase 5 Batch 5D — Staff Stripe invoice list loader.
 *
 * Operator-selected canonical clientId → billing-profile mapping → Batch 5B
 * listInvoicesForMappedCustomer. No PortalSession. No mutations. No customer repair.
 */
import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";

import {
  getCommercialStripeAdapter,
  StripeCommercialExecutionError,
} from "./commercial-client";
import type { CommercialStripeAdapter } from "./commercial-stripe-adapter";
import { resolveCommercialStripeTestCredentials } from "./commercial-credentials";
import { listInvoicesForMappedCustomer } from "./invoice-read-ops";
import { clampInvoiceListLimit, unavailableList } from "./invoice-read-logic";
import { loadBillingProfileInvoiceMapping } from "./invoice-read-service";
import type { InvoiceReadListResult } from "./invoice-read-types";

export class StaffInvoiceReadError extends Error {
  readonly code: "client_not_found" | "invalid_client_id";
  readonly status: number;
  constructor(
    message: string,
    code: "client_not_found" | "invalid_client_id",
    status: number,
  ) {
    super(message);
    this.name = "StaffInvoiceReadError";
    this.code = code;
    this.status = status;
  }
}

async function assertCanonicalClientExists(clientId: number): Promise<void> {
  const payload = await getPayload({ config });
  try {
    await payload.findByID({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- clients collection slug
      collection: "clients" as any,
      id: clientId,
      depth: 0,
      overrideAccess: true,
    });
  } catch {
    throw new StaffInvoiceReadError("Client not found.", "client_not_found", 404);
  }
}

/**
 * List safe Stripe invoices for a staff-authorized KXD client.
 * Caller must already enforce operator authentication.
 */
export async function listStaffClientInvoices(input: {
  authorizedClientId: number;
  adapter?: CommercialStripeAdapter;
  limit?: number | null;
}): Promise<InvoiceReadListResult> {
  const limit = clampInvoiceListLimit(input.limit);

  if (
    !Number.isFinite(input.authorizedClientId) ||
    input.authorizedClientId <= 0
  ) {
    throw new StaffInvoiceReadError(
      "Invalid client id.",
      "invalid_client_id",
      400,
    );
  }

  await assertCanonicalClientExists(input.authorizedClientId);

  const creds = resolveCommercialStripeTestCredentials();
  if (!creds.ok) {
    return unavailableList(
      "missing_configuration",
      "Invoice provider configuration is unavailable.",
      input.authorizedClientId,
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
        input.authorizedClientId,
        limit,
      );
    }
    throw err;
  }

  const mapping = await loadBillingProfileInvoiceMapping(
    input.authorizedClientId,
  );
  return listInvoicesForMappedCustomer({
    authorizedClientId: input.authorizedClientId,
    mapping,
    adapter,
    limit,
  });
}
