/**
 * Stripe configuration — proposal deposits, full payment, recurring prep.
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
  isEnabled: Boolean(process.env.STRIPE_SECRET_KEY),
  publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "",
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || "",
} as const;

export function buildStripeMetadata(
  metadata: StripeCheckoutMetadata,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(metadata).filter(([, value]) => value !== undefined),
  ) as Record<string, string>;
}
