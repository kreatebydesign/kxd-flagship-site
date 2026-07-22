/**
 * Phase 37I — Stripe customer linking & reconciliation types.
 * Test-mode only. No customer creation. No financial execution.
 */

export type StripeCustomerMappingStatus =
  | "unlinked"
  | "linked"
  | "requires_review";

export type StripeReconciliationStatus =
  | "unlinked"
  | "linked_healthy"
  | "customer_missing"
  | "customer_deleted"
  | "account_mismatch"
  | "mode_mismatch"
  | "client_metadata_missing"
  | "client_metadata_mismatch"
  | "duplicate_internal_mapping"
  | "conflicting_billing_profiles"
  | "configuration_blocked"
  | "connectivity_failed"
  | "requires_operator_review";

export type StripeConnectivityOutcome =
  | "not_attempted"
  | "structurally_blocked"
  | "authenticated_test_account"
  | "authentication_failed"
  | "account_mismatch"
  | "unavailable"
  | "live_mode_rejected";

export type StripeCustomerLinkBlockCode =
  | "configuration_blocked"
  | "live_mode_rejected"
  | "mode_mismatch"
  | "missing_billing_profile"
  | "duplicate_billing_profiles"
  | "customer_not_found"
  | "customer_deleted"
  | "account_mismatch"
  | "already_linked_elsewhere"
  | "already_linked_here"
  | "metadata_conflict"
  | "metadata_missing_requires_ack"
  | "stale_preview"
  | "browser_authority_rejected"
  | "execution_prohibited"
  | "profile_not_eligible"
  | "customer_id_invalid";

export type StripeAccountContext = {
  mode: "test";
  accountId: string;
};

export type StripeCustomerCandidate = {
  stripeCustomerId: string;
  displayName: string | null;
  /** Minimally disclosed / masked email for operator review only. */
  billingEmailMasked: string | null;
  deleted: boolean;
  mode: "test";
  createdAt: string | null;
  kxdClientIdMetadata: string | null;
  alreadyLinkedInternally: boolean;
  linkedClientId: number | null;
  eligibleToLink: boolean;
  blockers: Array<{ code: StripeCustomerLinkBlockCode; message: string }>;
  /** Informational only — never establishes identity. */
  emailNameNotes: string[];
};

export type StripeConnectivityResult = {
  outcome: StripeConnectivityOutcome;
  mode: "test" | null;
  accountId: string | null;
  stripeRequestPerformed: boolean;
  stripeObjectsCreated: "none";
  notices: readonly string[];
  blockers: Array<{ code: string; message: string }>;
  message: string;
};

export type StripeCustomerSearchResult = {
  queryKind: "exact_id" | "email" | "name" | "empty";
  candidates: StripeCustomerCandidate[];
  notices: readonly string[];
  blockers: Array<{ code: StripeCustomerLinkBlockCode; message: string }>;
  stripeRequestPerformed: boolean;
};

export type StripeCustomerLinkPreview = {
  clientId: number;
  clientName: string;
  billingProfileId: number;
  stripeCustomerId: string;
  accountId: string;
  mode: "test";
  mappingStatus: StripeCustomerMappingStatus;
  ownership: {
    metadataClientId: string | null;
    metadataConsistent: boolean | null;
    metadataMissing: boolean;
    emailInformationalMatch: boolean | null;
    nameInformationalMatch: boolean | null;
  };
  blockers: Array<{ code: StripeCustomerLinkBlockCode; message: string }>;
  warnings: string[];
  canLink: boolean;
  requiresMissingMetadataAck: boolean;
  previewFingerprint: string;
  notices: readonly string[];
  systemsUnchanged: readonly string[];
};

export type StripeCustomerLinkResult = {
  outcome: "changed" | "unchanged" | "blocked" | "stale";
  clientId: number;
  billingProfileId: number;
  stripeCustomerId: string | null;
  accountId: string | null;
  mode: "test" | null;
  mappingStatus: StripeCustomerMappingStatus;
  reconciliationStatus: StripeReconciliationStatus;
  message: string;
  blockers: Array<{ code: StripeCustomerLinkBlockCode; message: string }>;
  activityEmitted: boolean;
};

export type StripeCustomerUnlinkResult = {
  outcome: "changed" | "unchanged" | "blocked" | "stale";
  clientId: number;
  billingProfileId: number;
  message: string;
  activityEmitted: boolean;
  blockers: Array<{ code: StripeCustomerLinkBlockCode; message: string }>;
};

export type StripeCustomerReconciliationSnapshot = {
  clientId: number;
  billingProfileId: number | null;
  status: StripeReconciliationStatus;
  statusLabel: string;
  mode: "test" | "live" | null;
  accountId: string | null;
  stripeCustomerId: string | null;
  customerExists: boolean | null;
  customerDeleted: boolean | null;
  metadataOwnership: "consistent" | "missing" | "mismatch" | "not_applicable";
  internalUniqueness: "ok" | "duplicate" | "conflict" | "not_applicable";
  lastVerifiedAt: string | null;
  lastReconciledAt: string | null;
  blockers: Array<{ code: string; message: string }>;
  recommendedAction: string;
  notices: readonly string[];
  stripeRequestPerformed: boolean;
  systemsUnchanged: readonly string[];
};

export const STRIPE_CUSTOMER_LINK_NOTICES = [
  "Test mode only",
  "Read-only Stripe request where noted",
  "No customer created",
  "No billing activated",
  "Subscriptions and invoices remain unavailable",
  "Execution remains restricted",
] as const;

export const STRIPE_CUSTOMER_LINK_SYSTEMS_UNCHANGED = [
  "Commercial agreement unchanged",
  "Plan assignment and entitlements unchanged",
  "Providers and infrastructure unchanged",
  "No Stripe customer created or updated",
  "No catalog, subscription, invoice, checkout, or payment operation",
] as const;

export const KXD_STRIPE_CLIENT_METADATA_KEY = "kxd_client_id" as const;

export function stripeReconciliationStatusLabel(
  status: StripeReconciliationStatus,
): string {
  switch (status) {
    case "unlinked":
      return "Unlinked";
    case "linked_healthy":
      return "Linked · Healthy";
    case "customer_missing":
      return "Customer missing";
    case "customer_deleted":
      return "Customer deleted";
    case "account_mismatch":
      return "Account mismatch";
    case "mode_mismatch":
      return "Mode mismatch";
    case "client_metadata_missing":
      return "Client metadata missing";
    case "client_metadata_mismatch":
      return "Client metadata mismatch";
    case "duplicate_internal_mapping":
      return "Duplicate internal mapping";
    case "conflicting_billing_profiles":
      return "Conflicting billing profiles";
    case "configuration_blocked":
      return "Configuration blocked";
    case "connectivity_failed":
      return "Connectivity failed";
    case "requires_operator_review":
      return "Requires operator review";
    default:
      return status;
  }
}
