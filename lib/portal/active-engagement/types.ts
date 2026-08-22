/**
 * Client-safe Active Engagement snapshot.
 * No Stripe IDs, internal notes, lifecycle internals, or operator fields.
 */

export type ActiveEngagementSnapshot = {
  /** Qualifying engagement found for this client. */
  available: boolean;
  title: string | null;
  statusLabel: string | null;
  /** Human-readable service window, e.g. "Aug 4, 2026 – Nov 4, 2026". */
  periodLabel: string | null;
  paymentLabel: string | null;
  /** e.g. "$9,500.00" from billingPlan when authoritative. */
  totalValueLabel: string | null;
  /** e.g. "3 hours per month" */
  capacityLabel: string | null;
  /** Short included-services summary when safely available. */
  includedSummary: string | null;
  /** Link to agreement surface when commercial records are ready. */
  agreementHref: string | null;
};
