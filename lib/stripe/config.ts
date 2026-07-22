/**
 * Stripe configuration — proposal deposits, full payment, and future commercial prep.
 *
 * Phase 37H: structural env presence helpers live in integration-readiness-logic.
 * Do not expose secret values through this module to browser responses.
 */
export type StripePaymentPurpose =
  | "discovery-call-deposit"
  | "project-deposit"
  | "package-purchase"
  | "proposal-deposit"
  | "proposal-full";

export type StripeCheckoutMetadata = {
  purpose: StripePaymentPurpose;
  proposalId?: string;
  proposalNumber?: string;
  inquiryId?: string;
  packageSlug?: string;
  clientEmail?: string;
};

export const STRIPE_CONFIG = {
  /** Structural presence only — not connectivity verification. */
  isEnabled: Boolean(process.env.STRIPE_SECRET_KEY),
  /** Publishable key for future browser Elements — unused by current server checkout. */
  publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "",
  /** Webhook HMAC secret — server-only; never return in API responses. */
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || "",
} as const;

export function buildStripeMetadata(
  metadata: StripeCheckoutMetadata,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(metadata).filter(([, value]) => value !== undefined),
  ) as Record<string, string>;
}

