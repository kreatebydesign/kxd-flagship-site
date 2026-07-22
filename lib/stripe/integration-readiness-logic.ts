/**
 * Phase 37H — Pure Stripe integration readiness assessment.
 * Free of server-only so verification scripts can import it.
 *
 * Assesses structural env properties only. Never initializes a Stripe client.
 * Never returns, logs, or embeds secret values or key fragments.
 */

import { createHash } from "node:crypto";
import {
  STRIPE_INTEGRATION_NOTICES,
  STRIPE_INTEGRATION_SYSTEMS_UNCHANGED,
  STRIPE_OPTIONAL_ENV_VARS,
  STRIPE_REQUIRED_ENV_VARS,
  stripeIntegrationStatusLabel,
  type StripeCatalogStrategy,
  type StripeCustomerIdentityStrategy,
  type StripeExecutionGateSnapshot,
  type StripeExistingPathInventory,
  type StripeIdempotencyStrategy,
  type StripeIntegrationBlockCode,
  type StripeIntegrationReadiness,
  type StripeIntegrationStatus,
  type StripeKeyMode,
  type StripeOperationClass,
  type StripeReconciliationArchitecture,
  type StripeWebhookArchitecture,
} from "./integration-readiness-types";

/** Synthetic fixtures for isolated tests only — never used for SDK init. */
export const STRIPE_TEST_FIXTURES = {
  secretTest: "sk_test_phase37h_fixture_not_a_real_key",
  secretLive: "sk_live_phase37h_fixture_not_a_real_key",
  publishableTest: "pk_test_phase37h_fixture_not_a_real_key",
  publishableLive: "pk_live_phase37h_fixture_not_a_real_key",
  webhook: "whsec_phase37h_fixture_not_a_real_secret",
  invalid: "not-a-stripe-key",
} as const;

export type StripeEnvPresenceInput = {
  secretKey: string | null | undefined;
  publishableKey: string | null | undefined;
  webhookSecret: string | null | undefined;
};

/**
 * Detect key mode from prefix only. Never returns the value or a fragment.
 */
export function detectSecretKeyMode(
  value: string | null | undefined,
): StripeKeyMode {
  if (value == null || !String(value).trim()) return "absent";
  const v = String(value).trim();
  if (v.startsWith("sk_test_")) return "test";
  if (v.startsWith("sk_live_")) return "live";
  return "unknown";
}

export function detectPublishableKeyMode(
  value: string | null | undefined,
): StripeKeyMode {
  if (value == null || !String(value).trim()) return "absent";
  const v = String(value).trim();
  if (v.startsWith("pk_test_")) return "test";
  if (v.startsWith("pk_live_")) return "live";
  return "unknown";
}

export function isWebhookSecretFormatValid(
  value: string | null | undefined,
): boolean {
  if (value == null || !String(value).trim()) return false;
  return String(value).trim().startsWith("whsec_");
}

export function isSecretKeyFormatValid(mode: StripeKeyMode): boolean {
  return mode === "test" || mode === "live";
}

export function isPublishableKeyFormatValid(mode: StripeKeyMode): boolean {
  return mode === "test" || mode === "live" || mode === "absent";
}

/**
 * Commercial billing execution gate — CLOSED in Phase 37H.
 * Flip only in a separately approved code phase. Not env-, UI-, or CMS-controlled.
 * Typed as boolean (not `false as const`) so production `tsc` accepts a future flip.
 */
export const STRIPE_COMMERCIAL_EXECUTION_AUTHORIZED: boolean = false;

export function getStripeExecutionGate(): StripeExecutionGateSnapshot {
  return {
    commercialBillingAuthorized: false,
    reason:
      "Commercial Stripe mutation paths remain closed until a separately approved execution phase authorizes them in server code.",
    browserCannotEnable: true,
    requiresSeparatePhase: true,
  };
}

export function isCommercialStripeOperationAllowed(
  operation: StripeOperationClass,
): boolean {
  if (operation === "configuration_readiness") return true;
  if (operation === "webhook_receive") {
    // Existing proposal webhook path is separate; commercial webhook expansion is not authorized.
    return false;
  }
  return STRIPE_COMMERCIAL_EXECUTION_AUTHORIZED;
}

export function buildCustomerIdentityStrategy(): StripeCustomerIdentityStrategy {
  return {
    rule: "One canonical Stripe customer per KXD client per Stripe mode/account.",
    identitySource:
      "KXD clients.id is the stable internal identity for future customer mapping.",
    notIdentity: [
      "Billing email is contact data, not customer identity",
      "Client name is display data, not identity",
      "Never match customers solely by email or company name",
    ],
    mappingField:
      "billing-profiles.stripeCustomerId remains the external mapping slot — read-only in commercial workflows until an approved reconciliation phase.",
    testLiveSeparation:
      "Test and live Stripe customer IDs must never be mixed across modes or accounts.",
    manualEdit:
      "Manual Stripe ID editing remains prohibited outside an approved reconciliation workflow.",
    metadataPolicy:
      "Future metadata may include only safe stable internal identifiers (client id, agreement id). Never commercial notes, secrets, or unnecessary personal data.",
  };
}

export function buildCatalogStrategy(): StripeCatalogStrategy {
  return {
    standardAgreements:
      "Shared canonical Stripe products/prices may represent approved standard recurring plans. Internal commercial agreement IDs remain the business source; Stripe price IDs are external mappings only. Test/live mappings must be distinct.",
    customAgreements:
      "Do not create uncontrolled shared prices from browser amounts. Use server-authoritative approved commercial terms. Prefer dedicated reviewed prices or controlled invoice/subscription items — catalog creation waits for a separately approved phase.",
    setupFee:
      "Future one-time billing only. Never duplicate the authoritative amount into conflicting billing storage. Explicit zero remains distinct from missing.",
    monthlyRetainer:
      "Future recurring monthly billing. Plan access remains separate from subscription status.",
    serviceCredits:
      "Never map service credits to Stripe balance, cash credit, coupon, discount, or currency.",
    commercialAddOns:
      "Only explicitly billable and authoritatively priced add-ons may enter future Stripe mapping. requires_review, unsupported, and informational items remain excluded.",
  };
}

export function buildIdempotencyStrategy(): StripeIdempotencyStrategy {
  return {
    status: "ready",
    inputs: [
      "environment/mode",
      "internal client id",
      "commercial agreement identity or fingerprint",
      "operation type",
      "intended effective period or setup occurrence",
      "server-owned configuration fingerprint",
    ],
    forbidden: [
      "email alone",
      "display name alone",
      "browser-generated random values as the only protection",
      "raw secrets",
      "full personal information",
    ],
    notice:
      "Phase 37H derives deterministic internal idempotency inputs for future mutations. No Stripe request uses these keys in this phase.",
  };
}

export function buildWebhookArchitecture(): StripeWebhookArchitecture {
  return {
    status: "requires_work",
    existingEndpoint: "/api/stripe/webhook",
    signatureRequired: true,
    rawBodyRequired: true,
    knownGaps: [
      "Existing webhook handles proposal checkout.session.completed only — commercial subscription/invoice events are not allowlisted.",
      "Event-ID durable deduplication for commercial billing is not yet implemented.",
      "Proposal payment success path should confirm checkoutSessionId idempotency on webhook retries before commercial expansion.",
      "Webhook route instantiates Stripe directly; commercial billing must use the gated factory instead.",
    ],
    futureRequirements: [
      "Server-only endpoint with signature verification before event trust",
      "Raw payload handling compatible with Stripe requirements",
      "Test/live-mode separation",
      "Event-ID deduplication and durable processing state before financial side effects",
      "Safe event-type allowlist and retry-safe / out-of-order handling",
      "No client access mutation merely because Stripe sends an event",
      "No raw event logging with unnecessary personal or financial data",
      "Reconciliation for missed events",
    ],
  };
}

export function buildReconciliationArchitecture(): StripeReconciliationArchitecture {
  return {
    status: "requires_work",
    requirements: [
      "Compare internal billing intent (agreement + billing profile) to external Stripe state without treating either as access state",
      "Verify ownership and mode before linking external IDs",
      "Detect missed webhook events and out-of-order updates",
      "Never mutate plan/access from Stripe events alone",
      "Keep agreement terms and payment state distinct",
    ],
  };
}

export function listExistingStripePaths(): StripeExistingPathInventory[] {
  return [
    {
      id: "proposal_checkout",
      classification: "proposal_checkout",
      path: "lib/sales/payments.ts → createProposalCheckoutSession",
      status: "live",
      network: "yes_when_configured",
      notes:
        "Creates Stripe Checkout sessions for proposal deposits/full payment. Separate from commercial retainer billing.",
    },
    {
      id: "proposal_webhook",
      classification: "proposal_webhook",
      path: "app/api/stripe/webhook → processStripeWebhookEvent",
      status: "live",
      network: "yes_when_configured",
      notes:
        "Verifies signatures with raw body; updates proposal payment state for checkout.session.completed.",
    },
    {
      id: "reporting_mrr",
      classification: "reporting_mrr_read",
      path: "lib/live-integrations/stripe.ts → syncStripe",
      status: "active_platform",
      network: "yes_when_configured",
      notes:
        "Read-only subscriptions/invoices/charges for MRR reporting. Not commercial billing sync.",
    },
    {
      id: "commercial_billing",
      classification: "commercial_billing_future",
      path: "lib/stripe/* commercial execution factory",
      status: "future",
      network: "none",
      notes:
        "Future retainer/customer/catalog/subscription paths. Execution gate closed in Phase 37H.",
    },
    {
      id: "integration_readiness",
      classification: "configuration_readiness",
      path: "lib/stripe/integration-readiness-*",
      status: "live",
      network: "none",
      notes: "Structural readiness assessment only — never calls Stripe.",
    },
  ];
}

/**
 * Deterministic future idempotency input derivation — no Stripe request.
 * Never embeds secrets or personal data.
 */
export function deriveCommercialStripeIdempotencyInput(input: {
  mode: "test" | "live";
  clientId: number;
  agreementId: string | null;
  agreementFingerprint: string | null;
  operation: StripeOperationClass;
  effectivePeriodKey: string | null;
  configurationFingerprint: string | null;
}): string {
  const payload = JSON.stringify({
    v: 1,
    mode: input.mode,
    clientId: input.clientId,
    agreementId: input.agreementId,
    agreementFingerprint: input.agreementFingerprint,
    operation: input.operation,
    effectivePeriodKey: input.effectivePeriodKey,
    configurationFingerprint: input.configurationFingerprint,
  });
  return createHash("sha256").update(payload).digest("hex").slice(0, 48);
}

export function buildStripeIntegrationFingerprint(input: {
  status: StripeIntegrationStatus;
  secretKeyPresent: boolean;
  publishableKeyPresent: boolean;
  webhookSecretPresent: boolean;
  detectedSecretMode: StripeKeyMode;
  detectedPublishableMode: StripeKeyMode;
  modeAligned: boolean;
  executionAuthorized: boolean;
}): string {
  const payload = JSON.stringify({
    v: 1,
    status: input.status,
    secretKeyPresent: input.secretKeyPresent,
    publishableKeyPresent: input.publishableKeyPresent,
    webhookSecretPresent: input.webhookSecretPresent,
    detectedSecretMode: input.detectedSecretMode,
    detectedPublishableMode: input.detectedPublishableMode,
    modeAligned: input.modeAligned,
    executionAuthorized: input.executionAuthorized,
  });
  return createHash("sha256").update(payload).digest("hex").slice(0, 40);
}

export function buildStripeIntegrationReadiness(
  env: StripeEnvPresenceInput,
  generatedAt: string = new Date().toISOString(),
): StripeIntegrationReadiness {
  const blockers: Array<{
    code: StripeIntegrationBlockCode;
    message: string;
  }> = [];
  const warnings: string[] = [];

  const secretKeyPresent = Boolean(env.secretKey?.trim());
  const publishableKeyPresent = Boolean(env.publishableKey?.trim());
  const webhookSecretPresent = Boolean(env.webhookSecret?.trim());

  const detectedSecretMode = detectSecretKeyMode(env.secretKey);
  const detectedPublishableMode = detectPublishableKeyMode(env.publishableKey);
  const webhookFormatOk = isWebhookSecretFormatValid(env.webhookSecret);

  if (!secretKeyPresent) {
    blockers.push({
      code: "missing_secret_key",
      message:
        "STRIPE_SECRET_KEY is not set. Stripe integration is structurally disabled for this environment.",
    });
  } else if (!isSecretKeyFormatValid(detectedSecretMode)) {
    blockers.push({
      code: "invalid_secret_key_format",
      message:
        "STRIPE_SECRET_KEY is present but does not match a recognized sk_test_ or sk_live_ prefix.",
    });
  }

  if (secretKeyPresent && !webhookSecretPresent) {
    blockers.push({
      code: "missing_webhook_secret",
      message:
        "STRIPE_WEBHOOK_SECRET is missing. Webhook verification cannot be completed.",
    });
  } else if (webhookSecretPresent && !webhookFormatOk) {
    blockers.push({
      code: "invalid_webhook_secret_format",
      message:
        "STRIPE_WEBHOOK_SECRET is present but does not match a recognized whsec_ prefix.",
    });
  }

  if (
    publishableKeyPresent &&
    !isPublishableKeyFormatValid(detectedPublishableMode)
  ) {
    blockers.push({
      code: "invalid_publishable_key_format",
      message:
        "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is present but does not match a recognized pk_test_ or pk_live_ prefix.",
    });
  }

  let modeAligned = true;
  if (
    (detectedSecretMode === "test" || detectedSecretMode === "live") &&
    (detectedPublishableMode === "test" || detectedPublishableMode === "live") &&
    detectedSecretMode !== detectedPublishableMode
  ) {
    modeAligned = false;
    blockers.push({
      code: "mode_mismatch",
      message:
        "Secret key mode and publishable key mode do not match (test vs live).",
    });
  }

  blockers.push({
    code: "execution_disabled",
    message:
      "Commercial Stripe execution gate is closed. Structural configuration does not authorize mutations.",
  });
  blockers.push({
    code: "connectivity_not_tested",
    message:
      "Stripe connectivity is not tested. Key presence is structural only — not verified authentication.",
  });
  blockers.push({
    code: "commercial_sync_not_authorized",
    message:
      "Commercial customer, catalog, subscription, and invoice synchronization is not authorized in this phase.",
  });

  if (publishableKeyPresent && !secretKeyPresent) {
    warnings.push(
      "Publishable key is present without a secret key. Publishable keys alone cannot authorize server execution.",
    );
  }
  if (!publishableKeyPresent) {
    warnings.push(
      "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is optional for current server checkout paths and is not required for this readiness assessment.",
    );
  }
  warnings.push(
    "Proposal checkout and MRR reporting remain separate from commercial retainer billing.",
  );
  warnings.push(
    "charge_automatically billing intent does not prove a payment method exists.",
  );

  let status: StripeIntegrationStatus = "disabled";
  if (!secretKeyPresent) {
    status = "disabled";
  } else if (!isSecretKeyFormatValid(detectedSecretMode)) {
    status = "invalid_format";
  } else if (!modeAligned) {
    status = "mode_mismatch";
  } else if (
    !webhookSecretPresent ||
    (webhookSecretPresent && !webhookFormatOk)
  ) {
    status = "webhook_incomplete";
  } else if (
    blockers.some(
      (b) =>
        b.code === "invalid_publishable_key_format" ||
        b.code === "invalid_webhook_secret_format",
    )
  ) {
    status = "invalid_format";
  } else if (
    secretKeyPresent &&
    webhookSecretPresent &&
    webhookFormatOk &&
    modeAligned
  ) {
    status =
      detectedSecretMode === "live" ? "configured_live" : "configured_test";
  } else {
    status = "incomplete";
  }

  const intendedMode =
    detectedSecretMode === "test" || detectedSecretMode === "live"
      ? detectedSecretMode
      : "absent";

  const executionGate = getStripeExecutionGate();
  const fingerprint = buildStripeIntegrationFingerprint({
    status,
    secretKeyPresent,
    publishableKeyPresent,
    webhookSecretPresent,
    detectedSecretMode,
    detectedPublishableMode,
    modeAligned,
    executionAuthorized: false,
  });

  const prerequisites = [
    "Structurally valid Stripe environment configuration for the target mode",
    "Operator-completed Phase 37G billing configuration for each client to sync",
    "Recorded commercial agreements with authoritative terms",
    "Separately approved commercial Stripe execution phase that opens the server-side gate",
    "Customer mapping reconciliation rules implemented and tested",
    "Catalog mapping for standard agreements (and reviewed custom terms) implemented",
    "Commercial webhook allowlist, event dedupe, and reconciliation implemented",
    "Explicit authorization to create Stripe customers/products/prices/subscriptions/invoices",
  ] as const;

  return {
    status,
    statusLabel: stripeIntegrationStatusLabel(status),
    intendedMode,
    detectedSecretMode,
    detectedPublishableMode,
    secretKeyPresent,
    publishableKeyPresent,
    webhookSecretPresent,
    modeAligned,
    executionGate,
    connectivity: "not_tested",
    stripeObjectsCreated: "none",
    stripeRequestPerformed: false,
    stripeClientInitialized: false,
    customerIdentity: buildCustomerIdentityStrategy(),
    catalogStrategy: buildCatalogStrategy(),
    idempotency: buildIdempotencyStrategy(),
    webhookArchitecture: buildWebhookArchitecture(),
    reconciliation: buildReconciliationArchitecture(),
    existingPaths: listExistingStripePaths(),
    requiredEnvVars: STRIPE_REQUIRED_ENV_VARS,
    optionalEnvVars: STRIPE_OPTIONAL_ENV_VARS,
    blockers,
    warnings: [...new Set(warnings)],
    prerequisites,
    notices: STRIPE_INTEGRATION_NOTICES,
    systemsUnchanged: STRIPE_INTEGRATION_SYSTEMS_UNCHANGED,
    fingerprint,
    generatedAt,
  };
}

/**
 * Reject browser attempts to supply secrets, enable execution, or claim connectivity.
 */
export function rejectBrowserStripeAuthority(body: unknown):
  | { ok: true }
  | { ok: false; message: string } {
  if (body == null || body === "") return { ok: true };
  if (typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, message: "Unexpected request body." };
  }
  const row = body as Record<string, unknown>;
  const forbidden = [
    "STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SECRET",
    "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
    "secretKey",
    "webhookSecret",
    "publishableKey",
    "apiKey",
    "enableExecution",
    "executionAuthorized",
    "connected",
    "testConnection",
    "createCustomer",
    "sync",
    "stripeCustomerId",
    "stripeSubscriptionId",
    "status",
    "fingerprint",
  ] as const;
  for (const key of forbidden) {
    if (key in row && row[key] !== undefined) {
      return {
        ok: false,
        message:
          "Browser-supplied Stripe secrets, execution flags, or readiness fields are not accepted.",
      };
    }
  }
  return { ok: true };
}
