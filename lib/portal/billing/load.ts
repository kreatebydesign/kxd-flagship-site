/**
 * Phase 5 Batch 5C — Server-only portal Billing loader.
 * Composes Batch 5B listPortalSessionInvoices; no duplicate Stripe client.
 */
import "server-only";

import type { PortalSession } from "@/lib/portal/session";
import type { CommercialStripeAdapter } from "@/lib/stripe/commercial-stripe-adapter";
import {
  listPortalSessionInvoices,
  loadBillingProfileInvoiceMapping,
} from "@/lib/stripe/invoice-read-service";
import { isPortalBillingNavEligible } from "./nav-eligibility";
import { projectPortalBillingView } from "./presentation";
import type { PortalBillingView } from "./types";

export async function loadPortalBillingForSession(input: {
  session: PortalSession | null;
  adapter?: CommercialStripeAdapter;
}): Promise<PortalBillingView> {
  const result = await listPortalSessionInvoices({
    session: input.session,
    adapter: input.adapter,
  });
  const clientLabel = input.session?.clientName?.trim() || "Your account";
  return projectPortalBillingView(result, clientLabel);
}

/**
 * Layout nav gate — mapping only, no Stripe network, no entitlement mutation.
 */
export async function resolvePortalBillingNavAvailable(
  session: PortalSession,
): Promise<boolean> {
  const mapping = await loadBillingProfileInvoiceMapping(session.clientId);
  return isPortalBillingNavEligible(mapping, session.clientId);
}
