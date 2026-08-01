/**
 * Phase 37H–Lifecycle — Canonical server-only Stripe client factory for commercial billing.
 *
 * Existing proposal checkout and MRR sync remain on their current paths.
 *
 * Authorized lazily for test-mode:
 * - customer_lookup / reconciliation_read (37I)
 * - customer_create (37J)
 * - invoice_create / webhook_receive (lifecycle test billing)
 * - invoice_list / invoice_read (Phase 5B)
 */
import "server-only";

import Stripe from "stripe";
import {
  isCommercialStripeOperationAllowed,
  detectSecretKeyMode,
  isSecretKeyFormatValid,
} from "./integration-readiness-logic";
import { assessPhase37JCreateGate } from "./customer-creation-logic";
import { assessPhase37IStructuralGate } from "./customer-linking-logic";
import { resolveCommercialStripeTestCredentials } from "./commercial-credentials";
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

type CommercialNetworkOp = Extract<
  StripeOperationClass,
  | "customer_lookup"
  | "reconciliation_read"
  | "customer_create"
  | "invoice_create"
  | "invoice_list"
  | "invoice_read"
>;

function assertTestModeGate(operation: CommercialNetworkOp) {
  if (
    operation === "invoice_create" ||
    operation === "invoice_list" ||
    operation === "invoice_read"
  ) {
    const creds = resolveCommercialStripeTestCredentials();
    if (!creds.ok) {
      throw new StripeCommercialExecutionError(creds.message, creds.code);
    }
    return;
  }
  const gate =
    operation === "customer_create"
      ? assessPhase37JCreateGate({
          secretKey: process.env.STRIPE_SECRET_KEY_TEST || process.env.STRIPE_SECRET_KEY,
          publishableKey:
            process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_TEST ||
            process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
          webhookSecret:
            process.env.STRIPE_WEBHOOK_SECRET_TEST || process.env.STRIPE_WEBHOOK_SECRET,
        })
      : assessPhase37IStructuralGate({
          secretKey: process.env.STRIPE_SECRET_KEY_TEST || process.env.STRIPE_SECRET_KEY,
          publishableKey:
            process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_TEST ||
            process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
          webhookSecret:
            process.env.STRIPE_WEBHOOK_SECRET_TEST || process.env.STRIPE_WEBHOOK_SECRET,
        });
  if (!gate.allowed) {
    throw new StripeCommercialExecutionError(
      gate.blockers[0]?.message || "Structural gate blocked.",
      gate.blockers[0]?.code || "configuration_blocked",
    );
  }
}

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

  if (
    operation === "customer_lookup" ||
    operation === "reconciliation_read" ||
    operation === "customer_create" ||
    operation === "invoice_create" ||
    operation === "invoice_list" ||
    operation === "invoice_read"
  ) {
    assertTestModeGate(operation);
  }

  const creds = resolveCommercialStripeTestCredentials();
  if (!creds.ok) {
    throw new StripeCommercialExecutionError(creds.message, creds.code);
  }

  return new Stripe(creds.secretKey, {
    timeout: 15_000,
    maxNetworkRetries: 0,
  });
}

export function getCommercialStripeAdapter(
  operation: CommercialNetworkOp,
  inject?: CommercialStripeAdapter,
): CommercialStripeAdapter {
  if (inject) return inject;
  const stripe = getCommercialStripeClient(operation);
  return createLiveCommercialStripeAdapter(stripe);
}

export function canInitializeCommercialStripeClient(
  operation: StripeOperationClass,
): boolean {
  if (!isCommercialStripeOperationAllowed(operation)) return false;
  if (
    operation === "customer_lookup" ||
    operation === "reconciliation_read" ||
    operation === "customer_create" ||
    operation === "invoice_create" ||
    operation === "invoice_list" ||
    operation === "invoice_read" ||
    operation === "webhook_receive"
  ) {
    return resolveCommercialStripeTestCredentials().ok;
  }
  const secret = process.env.STRIPE_SECRET_KEY?.trim();
  if (!secret) return false;
  return isSecretKeyFormatValid(detectSecretKeyMode(secret));
}
