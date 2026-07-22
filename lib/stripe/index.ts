/**
 * Stripe module public surface for commercial readiness (Phase 37H).
 * Does not re-export commercial client (server-only) to keep verify scripts pure.
 */

export type {
  StripeCatalogStrategy,
  StripeCustomerIdentityStrategy,
  StripeExecutionGateSnapshot,
  StripeExistingPathInventory,
  StripeIdempotencyStrategy,
  StripeIntegrationBlockCode,
  StripeIntegrationReadiness,
  StripeIntegrationStatus,
  StripeKeyMode,
  StripeOperationClass,
  StripePathClassification,
  StripeReconciliationArchitecture,
  StripeWebhookArchitecture,
} from "./integration-readiness-types";

export {
  STRIPE_INTEGRATION_NOTICES,
  STRIPE_INTEGRATION_SYSTEMS_UNCHANGED,
  STRIPE_OPTIONAL_ENV_VARS,
  STRIPE_REQUIRED_ENV_VARS,
  stripeIntegrationStatusLabel,
} from "./integration-readiness-types";

export {
  STRIPE_COMMERCIAL_EXECUTION_AUTHORIZED,
  STRIPE_TEST_FIXTURES,
  buildCatalogStrategy,
  buildCustomerIdentityStrategy,
  buildIdempotencyStrategy,
  buildReconciliationArchitecture,
  buildStripeIntegrationFingerprint,
  buildStripeIntegrationReadiness,
  buildWebhookArchitecture,
  deriveCommercialStripeIdempotencyInput,
  detectPublishableKeyMode,
  detectSecretKeyMode,
  getStripeExecutionGate,
  isCommercialStripeOperationAllowed,
  isPublishableKeyFormatValid,
  isSecretKeyFormatValid,
  isWebhookSecretFormatValid,
  listExistingStripePaths,
  rejectBrowserStripeAuthority,
} from "./integration-readiness-logic";

export {
  STRIPE_CONFIG,
  buildStripeMetadata,
  type StripeCheckoutMetadata,
  type StripePaymentPurpose,
} from "./config";
