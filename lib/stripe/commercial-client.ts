/**
 * Phase 37H — Canonical server-only Stripe client factory for commercial billing.
 *
 * Existing proposal checkout (`lib/sales/payments.ts`) and MRR sync
 * (`lib/live-integrations/stripe.ts`) remain on their current paths.
 * This factory is for future commercial billing operations and remains gated CLOSED.
 *
 * Never initialize during unrelated page renders. Lazily create only when an
 * authorized commercial operation is invoked — which Phase 37H does not do.
 */
import "server-only";

import Stripe from "stripe";
import {
  isCommercialStripeOperationAllowed,
  detectSecretKeyMode,
  isSecretKeyFormatValid,
} from "./integration-readiness-logic";
import type { StripeOperationClass } from "./integration-readiness-types";

export class StripeCommercialExecutionError extends Error {
  readonly code: string;
  constructor(message: string, code: string) {
    super(message);
    this.name = "StripeCommercialExecutionError";
    this.code = code;
  }
}

/**
 * Commercial Stripe client — requires structural config AND open execution gate.
 * Phase 37H: always throws for mutation/lookup operations except configuration_readiness
 * (which must not call this factory at all).
 */
export function getCommercialStripeClient(
  operation: StripeOperationClass,
): Stripe {
  if (operation === "configuration_readiness") {
    throw new StripeCommercialExecutionError(
      "Configuration readiness must not initialize a Stripe client.",
      "readiness_must_not_init_client",
    );
  }

  if (!isCommercialStripeOperationAllowed(operation)) {
    throw new StripeCommercialExecutionError(
      `Commercial Stripe operation “${operation}” is not authorized. Execution gate is closed.`,
      "execution_gate_closed",
    );
  }

  const secret = process.env.STRIPE_SECRET_KEY?.trim();
  if (!secret) {
    throw new StripeCommercialExecutionError(
      "STRIPE_SECRET_KEY is not configured.",
      "missing_secret_key",
    );
  }
  const mode = detectSecretKeyMode(secret);
  if (!isSecretKeyFormatValid(mode)) {
    throw new StripeCommercialExecutionError(
      "STRIPE_SECRET_KEY format is invalid.",
      "invalid_secret_key_format",
    );
  }

  // Lazy per-call — no module-level singleton that runs at import/build time.
  return new Stripe(secret);
}

/**
 * True when commercial billing could theoretically initialize a client.
 * Still false in Phase 37H because the execution gate is closed.
 */
export function canInitializeCommercialStripeClient(
  operation: StripeOperationClass,
): boolean {
  if (!isCommercialStripeOperationAllowed(operation)) return false;
  const secret = process.env.STRIPE_SECRET_KEY?.trim();
  if (!secret) return false;
  return isSecretKeyFormatValid(detectSecretKeyMode(secret));
}
