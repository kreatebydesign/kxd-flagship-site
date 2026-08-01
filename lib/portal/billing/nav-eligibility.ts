/**
 * Phase 5 Batch 5C — Billing navigation eligibility (no entitlement mutation).
 * Visible only when the active client has a valid test-mode Stripe customer mapping.
 */

import { assessInvoiceReadMapping } from "@/lib/stripe/invoice-read-logic";
import type { BillingProfileInvoiceMapping } from "@/lib/stripe/invoice-read-types";

/**
 * Pure eligibility: linked, well-formed, test-mode Stripe customer mapping
 * for the authorized active client. Does not query Stripe.
 */
export function isPortalBillingNavEligible(
  mapping: BillingProfileInvoiceMapping | null,
  authorizedClientId: number,
): boolean {
  if (!Number.isFinite(authorizedClientId) || authorizedClientId <= 0) {
    return false;
  }
  return assessInvoiceReadMapping(mapping, authorizedClientId).ok === true;
}
