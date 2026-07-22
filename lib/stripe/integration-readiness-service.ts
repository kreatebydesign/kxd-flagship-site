/**
 * Phase 37H — Operator-only Stripe integration readiness service.
 * Reads env presence/format only. Never initializes Stripe. Never persists.
 */
import "server-only";

import { buildStripeIntegrationReadiness } from "./integration-readiness-logic";
import type { StripeIntegrationReadiness } from "./integration-readiness-types";

/**
 * Assess structural Stripe configuration for the current server environment.
 * Does not call Stripe, initialize a client, emit activity, or persist.
 */
export async function getStripeIntegrationReadiness(): Promise<StripeIntegrationReadiness> {
  // Read env at call time — never return values, only presence/format via pure logic.
  return buildStripeIntegrationReadiness({
    secretKey: process.env.STRIPE_SECRET_KEY,
    publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  });
}
