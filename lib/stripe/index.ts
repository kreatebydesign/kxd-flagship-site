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

export type {
  StripeConnectivityOutcome,
  StripeCustomerCandidate,
  StripeCustomerLinkPreview,
  StripeCustomerLinkResult,
  StripeCustomerMappingStatus,
  StripeCustomerReconciliationSnapshot,
  StripeCustomerSearchResult,
  StripeReconciliationStatus,
} from "./customer-linking-types";

export {
  KXD_STRIPE_CLIENT_METADATA_KEY,
  STRIPE_CUSTOMER_LINK_NOTICES,
  STRIPE_CUSTOMER_LINK_SYSTEMS_UNCHANGED,
  stripeReconciliationStatusLabel,
} from "./customer-linking-types";

export {
  STRIPE_PHASE_37I_AUTHORIZED_OPERATIONS,
  STRIPE_PHASE_37I_TEST_READS_AUTHORIZED,
  assessLinkEligibility,
  assessPhase37IStructuralGate,
  buildCustomerCandidate,
  buildLinkPreviewFingerprint,
  computeReconciliationStatus,
  isStripeCustomerIdFormat,
  maskBillingEmail,
  parseConnectivityVerifyBody,
  parseCustomerSearchBody,
  parseLinkApplyBody,
  parseLinkPreviewBody,
  parseReconcileBody,
  parseUnlinkBody,
  refineReconciliationForClientMetadata,
  rejectBrowserStripeLinkAuthority,
} from "./customer-linking-logic";

export { createFakeCommercialStripeAdapter } from "./commercial-stripe-adapter";

export type {
  StripeCustomerCreateOutcome,
  StripeCustomerCreatePreview,
  StripeCustomerCreateResult,
} from "./customer-creation-types";

export {
  KXD_STRIPE_BILLING_PROFILE_METADATA_KEY,
  KXD_STRIPE_CREATION_INTENT_METADATA_KEY,
  KXD_STRIPE_ENVIRONMENT_METADATA_KEY,
  STRIPE_CUSTOMER_CREATE_METADATA_ALLOWLIST,
  STRIPE_CUSTOMER_CREATE_NOTICES,
  STRIPE_CUSTOMER_CREATE_SYSTEMS_UNCHANGED,
} from "./customer-creation-types";

export {
  STRIPE_PHASE_37J_TEST_CREATE_AUTHORIZED,
  assessCreateEligibility,
  assessPhase37JCreateGate,
  buildAllowlistedCreateMetadata,
  buildCreatePreviewFingerprint,
  buildCreationIntentVersion,
  deriveStripeCustomerCreateIdempotencyKey,
  normalizeCreateBillingEmail,
  normalizeCreateCustomerName,
  parseCreateApplyBody,
  parseCreatePreviewBody,
  rejectBrowserStripeCreateAuthority,
  resolveAuthoritativeCustomerIdentity,
  verifyCreatedCustomerOwnership,
} from "./customer-creation-logic";

export {
  STRIPE_CONFIG,
  buildStripeMetadata,
  type StripeCheckoutMetadata,
  type StripePaymentPurpose,
} from "./config";
