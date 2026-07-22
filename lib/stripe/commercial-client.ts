/**
 * Phase 37H/37I — Canonical server-only Stripe client factory for commercial billing.
 *
 * Existing proposal checkout (`lib/sales/payments.ts`) and MRR sync
 * (`lib/live-integrations/stripe.ts`) remain on their current paths.
 *
 * Phase 37I authorizes lazy init only for test-mode `customer_lookup` and
 * `reconciliation_read`. Mutation classes remain closed.
 */
import "server-only";

import Stripe from "stripe";
import {
  isCommercialStripeOperationAllowed,
  detectSecretKeyMode,
  isSecretKeyFormatValid,
} from "./integration-readiness-logic";
import { assessPhase37IStructuralGate } from "./customer-linking-logic";
import {
  createLiveCommercialStripeAdapter,
  type CommercialStripeAdapter,
} from "./commercial-stripe-adapter";
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
 * Commercial Stripe client — requires structural config AND allowed operation.
 * Rejects live-mode keys for Phase 37I operations.
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

  if (operation === "customer_lookup" || operation === "reconciliation_read") {
    const gate = assessPhase37IStructuralGate({
      secretKey: process.env.STRIPE_SECRET_KEY,
      publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    });
    if (!gate.allowed) {
      throw new StripeCommercialExecutionError(
        gate.blockers[0]?.message || "Phase 37I structural gate blocked.",
        gate.blockers[0]?.code || "configuration_blocked",
      );
    }
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
  if (
    (operation === "customer_lookup" || operation === "reconciliation_read") &&
    mode === "live"
  ) {
    throw new StripeCommercialExecutionError(
      "Live-mode Stripe keys are rejected for Phase 37I operations.",
      "live_mode_rejected",
    );
  }

  // Lazy per-call — no module-level singleton that runs at import/build time.
  return new Stripe(secret, {
    timeout: 15_000,
    maxNetworkRetries: 0,
  });
}

export function getCommercialStripeAdapter(
  operation: Extract<
    StripeOperationClass,
    "customer_lookup" | "reconciliation_read"
  >,
  inject?: CommercialStripeAdapter,
): CommercialStripeAdapter {
  if (inject) return inject;
  const stripe = getCommercialStripeClient(operation);
  return createLiveCommercialStripeAdapter(stripe);
}

/**
 * True when commercial billing could theoretically initialize a client
 * for the given operation under current env + policy.
 */
export function canInitializeCommercialStripeClient(
  operation: StripeOperationClass,
): boolean {
  if (!isCommercialStripeOperationAllowed(operation)) return false;
  if (operation === "customer_lookup" || operation === "reconciliation_read") {
    return assessPhase37IStructuralGate({
      secretKey: process.env.STRIPE_SECRET_KEY,
      publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    }).allowed;
  }
  const secret = process.env.STRIPE_SECRET_KEY?.trim();
  if (!secret) return false;
  return isSecretKeyFormatValid(detectSecretKeyMode(secret));
}
