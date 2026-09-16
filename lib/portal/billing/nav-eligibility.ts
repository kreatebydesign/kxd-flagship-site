/**
 * Portal Billing navigation eligibility.
 * Visible when the active client has a commercial ledger OR a valid Stripe mapping.
 */

import { assessInvoiceReadMapping } from "@/lib/stripe/invoice-read-logic";
import type { BillingProfileInvoiceMapping } from "@/lib/stripe/invoice-read-types";

export type PortalBillingNavEligibilityInput = {
  mapping: BillingProfileInvoiceMapping | null;
  authorizedClientId: number;
  /** True when the client has at least one contract with a billing plan. */
  ledgerPresent?: boolean;
};

/**
 * Pure eligibility for Account-group Billing navigation.
 * Does not query Stripe or mutate entitlements.
 */
export function isPortalBillingNavEligible(
  mapping: BillingProfileInvoiceMapping | null,
  authorizedClientId: number,
  options?: { ledgerPresent?: boolean },
): boolean {
  return assessPortalBillingNavEligibility({
    mapping,
    authorizedClientId,
    ledgerPresent: options?.ledgerPresent === true,
  });
}

export function assessPortalBillingNavEligibility(
  input: PortalBillingNavEligibilityInput,
): boolean {
  if (!Number.isFinite(input.authorizedClientId) || input.authorizedClientId <= 0) {
    return false;
  }
  if (input.ledgerPresent === true) return true;
  return assessInvoiceReadMapping(input.mapping, input.authorizedClientId).ok === true;
}
