/**
 * Phase 5 Batch 5B — Narrow Stripe invoice read authorization.
 * Independent of STRIPE_COMMERCIAL_EXECUTION_AUTHORIZED.
 * Does not authorize invoice creation, payment, or any mutation.
 */

/** Authorizes invoice_list + invoice_read only (test-mode commercial credentials). */
export const STRIPE_PHASE_5B_INVOICE_READS_AUTHORIZED = true;

/** Batch 5B server-controlled provider mode — never browser-selected. */
export const STRIPE_PHASE_5B_AUTHORIZED_MODE = "test" as const;

export const STRIPE_PHASE_5B_INVOICE_LIST_DEFAULT_LIMIT = 24;
export const STRIPE_PHASE_5B_INVOICE_LIST_MAX_LIMIT = 48;
