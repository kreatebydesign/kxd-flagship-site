/**
 * Phase: Commercial Lifecycle — Controlled Stripe Test-Mode Billing.
 * Narrow authorization for invoice_create + commercial webhook processing.
 * Does NOT flip STRIPE_COMMERCIAL_EXECUTION_AUTHORIZED for subscriptions/catalog.
 */

/** Authorizes lifecycle test invoice create + commercial lifecycle webhook only. */
export const STRIPE_PHASE_LIFECYCLE_TEST_BILLING_AUTHORIZED = true;

export const LIFECYCLE_STRIPE_METADATA = {
  clientId: "kxd_client_id",
  contractId: "kxd_contract_id",
  obligationId: "kxd_obligation_id",
  billingPlanId: "kxd_billing_plan_id",
  mode: "kxd_mode",
  purpose: "kxd_purpose",
} as const;

export const LIFECYCLE_STRIPE_PURPOSE = "commercial_lifecycle_initial_invoice";
