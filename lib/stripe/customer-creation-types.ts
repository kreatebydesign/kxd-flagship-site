/**
 * Phase 37J — Stripe test customer creation types.
 * Test-mode customers.create only. No financial objects. No live mode.
 */

import type { StripeCustomerLinkBlockCode } from "./customer-linking-types";
import type { StripeReconciliationStatus } from "./customer-linking-types";
import type { StripeCustomerMappingStatus } from "./customer-linking-types";

export type StripeCustomerCreateBlockCode =
  | StripeCustomerLinkBlockCode
  | "missing_billing_email"
  | "missing_customer_name"
  | "existing_mapping"
  | "existing_metadata_customer"
  | "multiple_metadata_customers"
  | "creation_intent_conflict"
  | "partial_recovery_required"
  | "informational_duplicates_require_ack";

export type StripeCustomerCreateOutcome =
  | "created"
  | "recovered"
  | "unchanged"
  | "blocked"
  | "stale"
  | "partial_recovery_required";

/** Safe fields shown in preview / sent on create — never browser-authored. */
export type StripeCustomerCreatePayloadPreview = {
  name: string;
  email: string;
  emailMasked: string;
  metadataKeys: readonly string[];
  metadataClientId: string;
  metadataBillingProfileId: string;
  metadataEnvironment: "test";
  metadataCreationIntentVersion: string;
};

export type StripeCustomerCreatePreview = {
  clientId: number;
  clientName: string;
  billingProfileId: number;
  accountId: string;
  mode: "test";
  payload: StripeCustomerCreatePayloadPreview;
  creationIntentVersion: string;
  previewFingerprint: string;
  canCreate: boolean;
  requiresInformationalDuplicateAck: boolean;
  informationalEmailNameMatches: Array<{
    stripeCustomerId: string;
    displayName: string | null;
    billingEmailMasked: string | null;
    note: string;
  }>;
  existingMetadataMatches: Array<{
    stripeCustomerId: string;
    note: string;
  }>;
  blockers: Array<{ code: StripeCustomerCreateBlockCode; message: string }>;
  warnings: string[];
  notices: readonly string[];
  systemsUnchanged: readonly string[];
};

export type StripeCustomerCreateResult = {
  outcome: StripeCustomerCreateOutcome;
  clientId: number;
  billingProfileId: number;
  stripeCustomerId: string | null;
  accountId: string | null;
  mode: "test" | null;
  mappingStatus: StripeCustomerMappingStatus | null;
  reconciliationStatus: StripeReconciliationStatus | null;
  message: string;
  blockers: Array<{ code: StripeCustomerCreateBlockCode; message: string }>;
  activityEmitted: boolean;
  stripeCustomerCreated: boolean;
  stripeCustomerUpdated: boolean;
};

export const STRIPE_CUSTOMER_CREATE_NOTICES = [
  "Test mode only",
  "One Stripe test customer will be created when confirmed",
  "Customer will be linked internally",
  "No subscription created",
  "No invoice created",
  "No payment collected",
  "Client access unchanged",
  "Live execution disabled",
] as const;

export const STRIPE_CUSTOMER_CREATE_SYSTEMS_UNCHANGED = [
  "Commercial agreement unchanged",
  "Plan assignment and entitlements unchanged",
  "Providers and infrastructure unchanged",
  "No product, price, subscription, invoice, checkout, or payment operation",
  "Existing Stripe customers are not updated or deleted",
] as const;

export const KXD_STRIPE_BILLING_PROFILE_METADATA_KEY =
  "kxd_billing_profile_id" as const;
export const KXD_STRIPE_ENVIRONMENT_METADATA_KEY = "kxd_environment" as const;
export const KXD_STRIPE_CREATION_INTENT_METADATA_KEY =
  "kxd_creation_intent_v" as const;

export const STRIPE_CUSTOMER_CREATE_METADATA_ALLOWLIST = [
  "kxd_client_id",
  "kxd_billing_profile_id",
  "kxd_environment",
  "kxd_creation_intent_v",
] as const;
