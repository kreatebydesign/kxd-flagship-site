/**
 * Phase 37H — Stripe integration readiness types.
 * Structural configuration assessment only. No Stripe network. No secrets.
 */

export type StripeIntegrationStatus =
  | "disabled"
  | "incomplete"
  | "configured_test"
  | "configured_live"
  | "mode_mismatch"
  | "invalid_format"
  | "webhook_incomplete";

export type StripeKeyMode = "test" | "live" | "unknown" | "absent";

export type StripeOperationClass =
  | "configuration_readiness"
  | "customer_lookup"
  | "customer_create"
  | "catalog_lookup"
  | "catalog_create"
  | "subscription_preview"
  | "subscription_create"
  | "invoice_preview"
  | "invoice_create"
  | "checkout_create"
  | "reconciliation_read"
  | "webhook_receive";

export type StripeIntegrationBlockCode =
  | "missing_secret_key"
  | "missing_webhook_secret"
  | "invalid_secret_key_format"
  | "invalid_publishable_key_format"
  | "invalid_webhook_secret_format"
  | "mode_mismatch"
  | "execution_disabled"
  | "connectivity_not_tested"
  | "commercial_sync_not_authorized";

export type StripePathClassification =
  | "proposal_checkout"
  | "proposal_webhook"
  | "reporting_mrr_read"
  | "commercial_billing_future"
  | "configuration_readiness";

export type StripeExistingPathInventory = {
  id: string;
  classification: StripePathClassification;
  path: string;
  status: "live" | "active_platform" | "dormant" | "incomplete" | "future";
  network: "yes_when_configured" | "none";
  notes: string;
};

export type StripeCustomerIdentityStrategy = {
  rule: string;
  identitySource: string;
  notIdentity: readonly string[];
  mappingField: string;
  testLiveSeparation: string;
  manualEdit: string;
  metadataPolicy: string;
};

export type StripeCatalogStrategy = {
  standardAgreements: string;
  customAgreements: string;
  setupFee: string;
  monthlyRetainer: string;
  serviceCredits: string;
  commercialAddOns: string;
};

export type StripeIdempotencyStrategy = {
  status: "ready" | "not_ready";
  inputs: readonly string[];
  forbidden: readonly string[];
  notice: string;
};

export type StripeWebhookArchitecture = {
  status: "ready" | "requires_work";
  existingEndpoint: string;
  signatureRequired: boolean;
  rawBodyRequired: boolean;
  knownGaps: readonly string[];
  futureRequirements: readonly string[];
};

export type StripeReconciliationArchitecture = {
  status: "ready" | "requires_work";
  requirements: readonly string[];
};

export type StripeExecutionGateSnapshot = {
  commercialBillingAuthorized: false;
  reason: string;
  browserCannotEnable: true;
  requiresSeparatePhase: true;
};

export type StripeIntegrationReadiness = {
  status: StripeIntegrationStatus;
  statusLabel: string;
  intendedMode: StripeKeyMode;
  detectedSecretMode: StripeKeyMode;
  detectedPublishableMode: StripeKeyMode;
  secretKeyPresent: boolean;
  publishableKeyPresent: boolean;
  webhookSecretPresent: boolean;
  modeAligned: boolean;
  executionGate: StripeExecutionGateSnapshot;
  connectivity: "not_tested";
  stripeObjectsCreated: "none";
  stripeRequestPerformed: false;
  stripeClientInitialized: false;
  customerIdentity: StripeCustomerIdentityStrategy;
  catalogStrategy: StripeCatalogStrategy;
  idempotency: StripeIdempotencyStrategy;
  webhookArchitecture: StripeWebhookArchitecture;
  reconciliation: StripeReconciliationArchitecture;
  existingPaths: StripeExistingPathInventory[];
  requiredEnvVars: readonly string[];
  optionalEnvVars: readonly string[];
  blockers: Array<{ code: StripeIntegrationBlockCode; message: string }>;
  warnings: string[];
  prerequisites: readonly string[];
  notices: readonly string[];
  systemsUnchanged: readonly string[];
  fingerprint: string;
  generatedAt: string;
};

export const STRIPE_INTEGRATION_NOTICES = [
  "Structurally assessed only",
  "Connectivity not tested",
  "Execution disabled",
  "No Stripe request performed",
  "No Stripe object created",
  "No financial objects created",
] as const;

export const STRIPE_INTEGRATION_SYSTEMS_UNCHANGED = [
  "No Stripe API request was made",
  "No Stripe customer, product, price, subscription, or invoice was created",
  "No commercial agreement was changed",
  "No billing profile was changed",
  "No plan or access was changed",
  "No environment variable was modified",
  "Commercial billing execution remains closed",
] as const;

export const STRIPE_REQUIRED_ENV_VARS = [
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
] as const;

export const STRIPE_OPTIONAL_ENV_VARS = [
  "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
] as const;
