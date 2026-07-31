/**
 * Commercial Stripe credential resolution — TEST MODE ONLY.
 * Never logs or returns key material beyond mode classification.
 * Prefer dedicated test env vars; never fall back to live keys.
 */

import {
  detectSecretKeyMode,
  detectPublishableKeyMode,
  isWebhookSecretFormatValid,
} from "./integration-readiness-logic";
import type { StripeKeyMode } from "./integration-readiness-types";

export type CommercialStripeCredentialSource =
  | "STRIPE_SECRET_KEY_TEST"
  | "STRIPE_SECRET_KEY";

export type CommercialStripeCredentialResult =
  | {
      ok: true;
      /** Caller must not log this value. */
      secretKey: string;
      source: CommercialStripeCredentialSource;
      mode: "test";
      publishableMode: StripeKeyMode;
      webhookSecret: string | null;
      webhookSource: "STRIPE_WEBHOOK_SECRET_TEST" | "STRIPE_WEBHOOK_SECRET" | null;
    }
  | {
      ok: false;
      code:
        | "missing_test_secret"
        | "live_key_rejected"
        | "unknown_key_format";
      message: string;
    };

/**
 * Resolve server secret for commercial lifecycle / Phase 37 commercial ops.
 * Order: STRIPE_SECRET_KEY_TEST → STRIPE_SECRET_KEY (only if sk_test_).
 * Never reads STRIPE_SECRET_KEY_LIVE / STRIPE_LIVE_*.
 */
export function resolveCommercialStripeTestCredentials(): CommercialStripeCredentialResult {
  const dedicatedTest = process.env.STRIPE_SECRET_KEY_TEST?.trim() || "";
  const generic = process.env.STRIPE_SECRET_KEY?.trim() || "";

  let secret = "";
  let source: CommercialStripeCredentialSource = "STRIPE_SECRET_KEY_TEST";

  if (dedicatedTest) {
    secret = dedicatedTest;
    source = "STRIPE_SECRET_KEY_TEST";
  } else if (generic) {
    secret = generic;
    source = "STRIPE_SECRET_KEY";
  } else {
    return {
      ok: false,
      code: "missing_test_secret",
      message:
        "Configure STRIPE_SECRET_KEY_TEST (preferred) or STRIPE_SECRET_KEY with an sk_test_ key.",
    };
  }

  const mode = detectSecretKeyMode(secret);
  if (mode === "live") {
    return {
      ok: false,
      code: "live_key_rejected",
      message: "Live Stripe secret keys are rejected for commercial lifecycle operations.",
    };
  }
  if (mode !== "test") {
    return {
      ok: false,
      code: "unknown_key_format",
      message: "Commercial Stripe secret must use the sk_test_ prefix.",
    };
  }

  const pub =
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_TEST?.trim() ||
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim() ||
    "";
  const publishableMode = detectPublishableKeyMode(pub || null);
  if (publishableMode === "live") {
    return {
      ok: false,
      code: "live_key_rejected",
      message: "Live publishable keys are rejected for commercial lifecycle operations.",
    };
  }

  const whTest = process.env.STRIPE_WEBHOOK_SECRET_TEST?.trim() || "";
  const whGeneric = process.env.STRIPE_WEBHOOK_SECRET?.trim() || "";
  let webhookSecret: string | null = null;
  let webhookSource: "STRIPE_WEBHOOK_SECRET_TEST" | "STRIPE_WEBHOOK_SECRET" | null =
    null;

  if (whTest && isWebhookSecretFormatValid(whTest)) {
    webhookSecret = whTest;
    webhookSource = "STRIPE_WEBHOOK_SECRET_TEST";
  } else if (whGeneric && isWebhookSecretFormatValid(whGeneric)) {
    webhookSecret = whGeneric;
    webhookSource = "STRIPE_WEBHOOK_SECRET";
  }

  return {
    ok: true,
    secretKey: secret,
    source,
    mode: "test",
    publishableMode,
    webhookSecret,
    webhookSource,
  };
}

export function redactStripeId(id: string | null | undefined): string {
  if (!id) return "(none)";
  if (id.length <= 12) return `${id.slice(0, 4)}…`;
  return `${id.slice(0, 8)}…${id.slice(-4)}`;
}
