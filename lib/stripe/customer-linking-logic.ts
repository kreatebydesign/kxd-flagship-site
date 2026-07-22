/**
 * Phase 37I — Pure customer linking & reconciliation logic.
 * Free of server-only so verification scripts can import it.
 * Never contacts Stripe. Never returns secrets.
 */

import { createHash } from "node:crypto";
import {
  detectPublishableKeyMode,
  detectSecretKeyMode,
  isSecretKeyFormatValid,
  isWebhookSecretFormatValid,
} from "./integration-readiness-logic";
import type { StripeKeyMode } from "./integration-readiness-types";
import {
  KXD_STRIPE_CLIENT_METADATA_KEY,
  STRIPE_CUSTOMER_LINK_NOTICES,
  STRIPE_CUSTOMER_LINK_SYSTEMS_UNCHANGED,
  stripeReconciliationStatusLabel,
  type StripeConnectivityOutcome,
  type StripeCustomerCandidate,
  type StripeCustomerLinkBlockCode,
  type StripeCustomerLinkPreview,
  type StripeCustomerMappingStatus,
  type StripeReconciliationStatus,
} from "./customer-linking-types";
import type { CommercialStripeCustomerSnapshot } from "./commercial-stripe-adapter";

/** Phase 37I authorizes only these Stripe network operation classes (test mode). */
export const STRIPE_PHASE_37I_AUTHORIZED_OPERATIONS = [
  "customer_lookup",
  "reconciliation_read",
] as const;

export type StripePhase37IOperation =
  (typeof STRIPE_PHASE_37I_AUTHORIZED_OPERATIONS)[number];

export const STRIPE_PHASE_37I_TEST_READS_AUTHORIZED = true;

export function isPhase37IStripeOperation(
  operation: string,
): operation is StripePhase37IOperation {
  return (STRIPE_PHASE_37I_AUTHORIZED_OPERATIONS as readonly string[]).includes(
    operation,
  );
}

export function maskBillingEmail(email: string | null | undefined): string | null {
  if (!email || !email.trim()) return null;
  const v = email.trim();
  const at = v.indexOf("@");
  if (at <= 0) return "***";
  const local = v.slice(0, at);
  const domain = v.slice(at + 1);
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}***@${domain}`;
}

export function isStripeCustomerIdFormat(value: string): boolean {
  return /^cus_[A-Za-z0-9]+$/.test(value.trim());
}

export type Phase37IStructuralGate = {
  allowed: boolean;
  mode: "test" | null;
  outcome: StripeConnectivityOutcome | null;
  blockers: Array<{ code: string; message: string }>;
  secretMode: StripeKeyMode;
  publishableMode: StripeKeyMode;
};

/**
 * Structural gate before any Phase 37I Stripe network call.
 * Rejects live keys, incomplete/mismatched config. Never prints values.
 */
export function assessPhase37IStructuralGate(env: {
  secretKey: string | null | undefined;
  publishableKey: string | null | undefined;
  webhookSecret: string | null | undefined;
}): Phase37IStructuralGate {
  const blockers: Array<{ code: string; message: string }> = [];
  const secretMode = detectSecretKeyMode(env.secretKey);
  const publishableMode = detectPublishableKeyMode(env.publishableKey);
  const webhookOk = isWebhookSecretFormatValid(env.webhookSecret);
  const secretPresent = Boolean(env.secretKey?.trim());
  const webhookPresent = Boolean(env.webhookSecret?.trim());

  if (!secretPresent) {
    blockers.push({
      code: "missing_secret_key",
      message: "STRIPE_SECRET_KEY is not set. Test-mode operations are unavailable.",
    });
    return {
      allowed: false,
      mode: null,
      outcome: "structurally_blocked",
      blockers,
      secretMode,
      publishableMode,
    };
  }

  if (!isSecretKeyFormatValid(secretMode)) {
    blockers.push({
      code: "invalid_secret_key_format",
      message: "STRIPE_SECRET_KEY format is invalid for Phase 37I operations.",
    });
    return {
      allowed: false,
      mode: null,
      outcome: "structurally_blocked",
      blockers,
      secretMode,
      publishableMode,
    };
  }

  if (secretMode === "live") {
    blockers.push({
      code: "live_mode_rejected",
      message:
        "Live-mode Stripe keys are rejected for Phase 37I. Only test-mode connectivity and linking are authorized.",
    });
    return {
      allowed: false,
      mode: null,
      outcome: "live_mode_rejected",
      blockers,
      secretMode,
      publishableMode,
    };
  }

  if (
    (publishableMode === "test" || publishableMode === "live") &&
    publishableMode !== secretMode
  ) {
    blockers.push({
      code: "mode_mismatch",
      message: "Secret and publishable key modes do not match.",
    });
    return {
      allowed: false,
      mode: null,
      outcome: "structurally_blocked",
      blockers,
      secretMode,
      publishableMode,
    };
  }

  if (!webhookPresent || !webhookOk) {
    blockers.push({
      code: "webhook_incomplete",
      message:
        "Webhook secret must be structurally present and valid before Phase 37I Stripe reads.",
    });
    return {
      allowed: false,
      mode: null,
      outcome: "structurally_blocked",
      blockers,
      secretMode,
      publishableMode,
    };
  }

  if (!STRIPE_PHASE_37I_TEST_READS_AUTHORIZED) {
    blockers.push({
      code: "execution_prohibited",
      message: "Phase 37I test-mode reads are not authorized in server policy.",
    });
    return {
      allowed: false,
      mode: null,
      outcome: "structurally_blocked",
      blockers,
      secretMode,
      publishableMode,
    };
  }

  return {
    allowed: true,
    mode: "test",
    outcome: null,
    blockers: [],
    secretMode,
    publishableMode,
  };
}

export function buildCustomerCandidate(input: {
  customer: CommercialStripeCustomerSnapshot;
  targetClientId: number;
  linkedClientId: number | null;
  billingEmail?: string | null;
  clientName?: string | null;
}): StripeCustomerCandidate {
  const { customer, targetClientId, linkedClientId } = input;
  const blockers: Array<{ code: StripeCustomerLinkBlockCode; message: string }> =
    [];
  const emailNameNotes: string[] = [];

  const meta =
    customer.metadata[KXD_STRIPE_CLIENT_METADATA_KEY]?.trim() || null;

  if (customer.deleted) {
    blockers.push({
      code: "customer_deleted",
      message: "Deleted Stripe customers cannot be linked.",
    });
  }
  if (customer.livemode) {
    blockers.push({
      code: "live_mode_rejected",
      message: "Live-mode customers cannot be linked in Phase 37I.",
    });
  }
  if (linkedClientId != null && linkedClientId !== targetClientId) {
    blockers.push({
      code: "already_linked_elsewhere",
      message: "This Stripe customer is already linked to another KXD client.",
    });
  }
  if (meta && meta !== String(targetClientId)) {
    blockers.push({
      code: "metadata_conflict",
      message:
        "Stripe customer metadata kxd_client_id conflicts with the target KXD client.",
    });
  }

  if (
    input.billingEmail &&
    customer.email &&
    input.billingEmail.trim().toLowerCase() ===
      customer.email.trim().toLowerCase()
  ) {
    emailNameNotes.push(
      "Billing email matches Stripe customer email (informational only — not identity).",
    );
  }
  if (
    input.clientName &&
    customer.name &&
    input.clientName.trim().toLowerCase() === customer.name.trim().toLowerCase()
  ) {
    emailNameNotes.push(
      "Client name matches Stripe customer name (informational only — not identity).",
    );
  }

  const alreadyLinkedInternally =
    linkedClientId != null && linkedClientId === targetClientId;

  return {
    stripeCustomerId: customer.id,
    displayName: customer.name,
    billingEmailMasked: maskBillingEmail(customer.email),
    deleted: customer.deleted,
    mode: "test",
    createdAt:
      customer.created != null
        ? new Date(customer.created * 1000).toISOString()
        : null,
    kxdClientIdMetadata: meta,
    alreadyLinkedInternally,
    linkedClientId,
    eligibleToLink: blockers.length === 0 && !alreadyLinkedInternally,
    blockers,
    emailNameNotes,
  };
}

export function buildLinkPreviewFingerprint(input: {
  clientId: number;
  billingProfileId: number;
  stripeCustomerId: string;
  accountId: string;
  mode: "test";
  mappingStatus: StripeCustomerMappingStatus;
  metadataClientId: string | null;
  profileUpdatedAt: string | null;
}): string {
  const payload = JSON.stringify({
    v: 1,
    ...input,
  });
  return createHash("sha256").update(payload).digest("hex").slice(0, 40);
}

export function assessLinkEligibility(input: {
  clientId: number;
  clientName: string;
  billingProfileId: number;
  profileCount: number;
  customer: CommercialStripeCustomerSnapshot;
  accountId: string;
  accountLivemode: boolean;
  linkedClientId: number | null;
  currentMappedCustomerId: string | null;
  billingEmail: string | null;
  acknowledgeMissingMetadata: boolean;
  profileUpdatedAt: string | null;
}): StripeCustomerLinkPreview {
  const blockers: Array<{ code: StripeCustomerLinkBlockCode; message: string }> =
    [];
  const warnings: string[] = [];

  if (input.profileCount === 0) {
    blockers.push({
      code: "missing_billing_profile",
      message:
        "No billing profile exists for this client. Configure billing first — profiles are not auto-created.",
    });
  } else if (input.profileCount > 1) {
    blockers.push({
      code: "duplicate_billing_profiles",
      message: "Multiple billing profiles block customer linking.",
    });
  }

  if (input.accountLivemode || input.customer.livemode) {
    blockers.push({
      code: "live_mode_rejected",
      message: "Live-mode Stripe context is rejected for Phase 37I linking.",
    });
  }

  if (input.customer.deleted) {
    blockers.push({
      code: "customer_deleted",
      message: "Deleted Stripe customers cannot be linked.",
    });
  }

  const meta =
    input.customer.metadata[KXD_STRIPE_CLIENT_METADATA_KEY]?.trim() || null;
  const metadataMissing = !meta;
  const metadataConsistent = meta == null ? null : meta === String(input.clientId);

  if (meta && meta !== String(input.clientId)) {
    blockers.push({
      code: "metadata_conflict",
      message:
        "Conflicting kxd_client_id metadata blocks linking. Metadata is not written in this phase.",
    });
  }

  if (
    input.linkedClientId != null &&
    input.linkedClientId !== input.clientId
  ) {
    blockers.push({
      code: "already_linked_elsewhere",
      message: "Customer is already mapped to another KXD client.",
    });
  }

  if (
    input.currentMappedCustomerId &&
    input.currentMappedCustomerId === input.customer.id
  ) {
    // Idempotent already-linked — not a hard block for preview canLink=false path handled in apply
  }

  if (
    input.currentMappedCustomerId &&
    input.currentMappedCustomerId !== input.customer.id
  ) {
    blockers.push({
      code: "already_linked_here",
      message:
        "This billing profile already has a different Stripe customer mapping. Unlink first.",
    });
  }

  const requiresMissingMetadataAck = metadataMissing && blockers.length === 0;
  if (requiresMissingMetadataAck && !input.acknowledgeMissingMetadata) {
    blockers.push({
      code: "metadata_missing_requires_ack",
      message:
        "Stripe customer has no kxd_client_id metadata. Confirm ownership explicitly — missing metadata is not proof.",
    });
  } else if (requiresMissingMetadataAck) {
    warnings.push(
      "Linking with missing kxd_client_id metadata requires explicit operator acknowledgment. Metadata is not written to Stripe in this phase.",
    );
  }

  const emailMatch =
    Boolean(input.billingEmail) &&
    Boolean(input.customer.email) &&
    input.billingEmail!.trim().toLowerCase() ===
      input.customer.email!.trim().toLowerCase();
  const nameMatch =
    Boolean(input.clientName) &&
    Boolean(input.customer.name) &&
    input.clientName.trim().toLowerCase() ===
      input.customer.name!.trim().toLowerCase();

  if (emailMatch) {
    warnings.push("Email similarity is informational only and does not authorize linking.");
  }
  if (nameMatch) {
    warnings.push("Name similarity is informational only and does not authorize linking.");
  }

  const mappingStatus: StripeCustomerMappingStatus =
    input.currentMappedCustomerId === input.customer.id ? "linked" : "unlinked";

  const canLink = blockers.length === 0;

  const previewFingerprint = buildLinkPreviewFingerprint({
    clientId: input.clientId,
    billingProfileId: input.billingProfileId,
    stripeCustomerId: input.customer.id,
    accountId: input.accountId,
    mode: "test",
    mappingStatus,
    metadataClientId: meta,
    profileUpdatedAt: input.profileUpdatedAt,
  });

  return {
    clientId: input.clientId,
    clientName: input.clientName,
    billingProfileId: input.billingProfileId,
    stripeCustomerId: input.customer.id,
    accountId: input.accountId,
    mode: "test",
    mappingStatus,
    ownership: {
      metadataClientId: meta,
      metadataConsistent,
      metadataMissing,
      emailInformationalMatch: emailMatch || null,
      nameInformationalMatch: nameMatch || null,
    },
    blockers,
    warnings,
    canLink,
    requiresMissingMetadataAck: metadataMissing,
    previewFingerprint,
    notices: STRIPE_CUSTOMER_LINK_NOTICES,
    systemsUnchanged: STRIPE_CUSTOMER_LINK_SYSTEMS_UNCHANGED,
  };
}

export function computeReconciliationStatus(input: {
  hasProfile: boolean;
  profileCount: number;
  stripeCustomerId: string | null;
  stripeMode: "test" | "live" | null;
  stripeAccountId: string | null;
  expectedMode: "test" | null;
  expectedAccountId: string | null;
  customer: CommercialStripeCustomerSnapshot | null;
  customerLookupFailed: boolean;
  configurationBlocked: boolean;
  duplicateCustomerMappings: number;
}): {
  status: StripeReconciliationStatus;
  metadataOwnership: "consistent" | "missing" | "mismatch" | "not_applicable";
  internalUniqueness: "ok" | "duplicate" | "conflict" | "not_applicable";
  recommendedAction: string;
} {
  if (input.configurationBlocked) {
    return {
      status: "configuration_blocked",
      metadataOwnership: "not_applicable",
      internalUniqueness: "not_applicable",
      recommendedAction: "Resolve Stripe structural configuration before reconciling.",
    };
  }
  if (!input.hasProfile || input.profileCount === 0) {
    return {
      status: "unlinked",
      metadataOwnership: "not_applicable",
      internalUniqueness: "not_applicable",
      recommendedAction:
        "No billing profile — configure billing first. Profiles are not auto-created.",
    };
  }
  if (input.profileCount > 1) {
    return {
      status: "conflicting_billing_profiles",
      metadataOwnership: "not_applicable",
      internalUniqueness: "conflict",
      recommendedAction: "Resolve duplicate billing profiles before linking.",
    };
  }
  if (!input.stripeCustomerId) {
    return {
      status: "unlinked",
      metadataOwnership: "not_applicable",
      internalUniqueness: "ok",
      recommendedAction: "No Stripe customer mapping on this profile.",
    };
  }
  if (input.duplicateCustomerMappings > 1) {
    return {
      status: "duplicate_internal_mapping",
      metadataOwnership: "not_applicable",
      internalUniqueness: "duplicate",
      recommendedAction: "Resolve duplicate Stripe customer mappings.",
    };
  }
  if (
    input.stripeMode &&
    input.expectedMode &&
    input.stripeMode !== input.expectedMode
  ) {
    return {
      status: "mode_mismatch",
      metadataOwnership: "not_applicable",
      internalUniqueness: "ok",
      recommendedAction: "Stored mapping mode does not match the current test-mode environment.",
    };
  }
  if (input.customerLookupFailed) {
    return {
      status: "connectivity_failed",
      metadataOwnership: "not_applicable",
      internalUniqueness: "ok",
      recommendedAction: "Retry reconciliation after connectivity is restored.",
    };
  }
  if (!input.customer) {
    return {
      status: "customer_missing",
      metadataOwnership: "not_applicable",
      internalUniqueness: "ok",
      recommendedAction: "Mapped customer was not found in the authenticated test account.",
    };
  }
  if (input.customer.deleted) {
    return {
      status: "customer_deleted",
      metadataOwnership: "not_applicable",
      internalUniqueness: "ok",
      recommendedAction: "Unlink the deleted customer mapping.",
    };
  }
  if (
    input.expectedAccountId &&
    input.stripeAccountId &&
    input.expectedAccountId !== input.stripeAccountId
  ) {
    return {
      status: "account_mismatch",
      metadataOwnership: "not_applicable",
      internalUniqueness: "ok",
      recommendedAction: "Mapping account does not match the authenticated Stripe account.",
    };
  }

  const meta =
    input.customer.metadata[KXD_STRIPE_CLIENT_METADATA_KEY]?.trim() || null;
  // client id comparison left to service; here we only know metadata presence on customer
  if (!meta) {
    return {
      status: "client_metadata_missing",
      metadataOwnership: "missing",
      internalUniqueness: "ok",
      recommendedAction:
        "Mapping exists but kxd_client_id metadata is missing. Review ownership; metadata is not written in this phase.",
    };
  }

  return {
    status: "linked_healthy",
    metadataOwnership: "consistent",
    internalUniqueness: "ok",
    recommendedAction: "Mapping appears healthy. No repair performed.",
  };
}

export function refineReconciliationForClientMetadata(
  status: StripeReconciliationStatus,
  metadataOwnership: "consistent" | "missing" | "mismatch" | "not_applicable",
  customerMetaClientId: string | null,
  clientId: number,
): {
  status: StripeReconciliationStatus;
  metadataOwnership: "consistent" | "missing" | "mismatch" | "not_applicable";
  recommendedAction: string;
} {
  if (!customerMetaClientId) {
    if (status === "linked_healthy" || status === "client_metadata_missing") {
      return {
        status: "client_metadata_missing",
        metadataOwnership: "missing",
        recommendedAction:
          "Mapping exists but kxd_client_id metadata is missing. Review ownership; metadata is not written in this phase.",
      };
    }
    return { status, metadataOwnership, recommendedAction: stripeReconciliationStatusLabel(status) };
  }
  if (customerMetaClientId !== String(clientId)) {
    return {
      status: "client_metadata_mismatch",
      metadataOwnership: "mismatch",
      recommendedAction: "Stripe metadata kxd_client_id does not match this KXD client.",
    };
  }
  if (status === "linked_healthy" || status === "client_metadata_missing") {
    return {
      status: "linked_healthy",
      metadataOwnership: "consistent",
      recommendedAction: "Mapping appears healthy. No repair performed.",
    };
  }
  return { status, metadataOwnership, recommendedAction: stripeReconciliationStatusLabel(status) };
}

/**
 * Reject browser authority for Phase 37I link/connectivity bodies.
 * Allows operator-selected customer ID and confirmations; rejects secrets and account/mode claims.
 */
export function rejectBrowserStripeLinkAuthority(body: unknown):
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
    "createCustomer",
    "sync",
    "stripeAccountId",
    "accountId",
    "mode",
    "livemode",
    "stripeMode",
    "stripeSubscriptionId",
    "subscriptionId",
    "priceId",
    "productId",
    "invoiceId",
    "paymentMethodId",
  ] as const;
  for (const key of forbidden) {
    if (key in row && row[key] !== undefined) {
      return {
        ok: false,
        message:
          "Browser-supplied Stripe credentials, account/mode claims, or financial object IDs are not accepted.",
      };
    }
  }
  return { ok: true };
}

export function parseConnectivityVerifyBody(body: unknown):
  | { ok: true }
  | { ok: false; message: string } {
  const authority = rejectBrowserStripeLinkAuthority(body);
  if (!authority.ok) return authority;
  if (body == null || body === "") {
    return {
      ok: false,
      message:
        "Connectivity verification requires confirmedReadOnly: true (one read-only Stripe request).",
    };
  }
  if (typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, message: "Unexpected request body." };
  }
  const row = body as Record<string, unknown>;
  const allowed = new Set(["confirmedReadOnly"]);
  for (const key of Object.keys(row)) {
    if (!allowed.has(key)) {
      return {
        ok: false,
        message: `Unsupported field “${key}” on connectivity verification.`,
      };
    }
  }
  if (row.confirmedReadOnly !== true) {
    return {
      ok: false,
      message:
        "Connectivity verification requires confirmedReadOnly: true (one read-only Stripe request).",
    };
  }
  return { ok: true };
}

export function parseCustomerSearchBody(body: unknown):
  | {
      ok: true;
      clientId: number;
      exactCustomerId: string | null;
      searchTerm: string | null;
    }
  | { ok: false; message: string } {
  const authority = rejectBrowserStripeLinkAuthority(body);
  if (!authority.ok) return authority;
  if (typeof body !== "object" || body == null || Array.isArray(body)) {
    return { ok: false, message: "Request body is required." };
  }
  const row = body as Record<string, unknown>;
  const allowed = new Set(["clientId", "exactCustomerId", "searchTerm"]);
  for (const key of Object.keys(row)) {
    if (!allowed.has(key)) {
      return { ok: false, message: `Unsupported field “${key}”.` };
    }
  }
  const clientId = Number(row.clientId);
  if (!Number.isInteger(clientId) || clientId <= 0) {
    return { ok: false, message: "Valid clientId is required." };
  }
  const exact =
    typeof row.exactCustomerId === "string" && row.exactCustomerId.trim()
      ? row.exactCustomerId.trim()
      : null;
  const term =
    typeof row.searchTerm === "string" && row.searchTerm.trim()
      ? row.searchTerm.trim()
      : null;
  if (!exact && !term) {
    return {
      ok: false,
      message: "Provide exactCustomerId or a constrained searchTerm.",
    };
  }
  if (exact && !isStripeCustomerIdFormat(exact)) {
    return { ok: false, message: "exactCustomerId format is invalid." };
  }
  if (term && term.length > 120) {
    return { ok: false, message: "searchTerm is too long." };
  }
  return { ok: true, clientId, exactCustomerId: exact, searchTerm: term };
}

export function parseLinkPreviewBody(body: unknown):
  | {
      ok: true;
      clientId: number;
      stripeCustomerId: string;
      acknowledgeMissingMetadata: boolean;
    }
  | { ok: false; message: string } {
  const authority = rejectBrowserStripeLinkAuthority(body);
  if (!authority.ok) return authority;
  if (typeof body !== "object" || body == null || Array.isArray(body)) {
    return { ok: false, message: "Request body is required." };
  }
  const row = body as Record<string, unknown>;
  const allowed = new Set([
    "clientId",
    "stripeCustomerId",
    "acknowledgeMissingMetadata",
  ]);
  for (const key of Object.keys(row)) {
    if (!allowed.has(key)) {
      return { ok: false, message: `Unsupported field “${key}”.` };
    }
  }
  const clientId = Number(row.clientId);
  if (!Number.isInteger(clientId) || clientId <= 0) {
    return { ok: false, message: "Valid clientId is required." };
  }
  if (
    typeof row.stripeCustomerId !== "string" ||
    !isStripeCustomerIdFormat(row.stripeCustomerId)
  ) {
    return { ok: false, message: "Valid stripeCustomerId is required." };
  }
  return {
    ok: true,
    clientId,
    stripeCustomerId: row.stripeCustomerId.trim(),
    acknowledgeMissingMetadata: row.acknowledgeMissingMetadata === true,
  };
}

export function parseLinkApplyBody(body: unknown):
  | {
      ok: true;
      clientId: number;
      billingProfileId: number;
      stripeCustomerId: string;
      previewFingerprint: string;
      confirmed: true;
      linkingDoesNotActivateBilling: true;
      acknowledgeMissingMetadata: boolean;
    }
  | { ok: false; message: string; code?: StripeCustomerLinkBlockCode } {
  const authority = rejectBrowserStripeLinkAuthority(body);
  if (!authority.ok) {
    return { ok: false, message: authority.message, code: "browser_authority_rejected" };
  }
  if (typeof body !== "object" || body == null || Array.isArray(body)) {
    return { ok: false, message: "Request body is required." };
  }
  const row = body as Record<string, unknown>;
  const allowed = new Set([
    "clientId",
    "billingProfileId",
    "stripeCustomerId",
    "previewFingerprint",
    "confirmed",
    "linkingDoesNotActivateBilling",
    "acknowledgeMissingMetadata",
  ]);
  for (const key of Object.keys(row)) {
    if (!allowed.has(key)) {
      return { ok: false, message: `Unsupported field “${key}”.` };
    }
  }
  const clientId = Number(row.clientId);
  const billingProfileId = Number(row.billingProfileId);
  if (!Number.isInteger(clientId) || clientId <= 0) {
    return { ok: false, message: "Valid clientId is required." };
  }
  if (!Number.isInteger(billingProfileId) || billingProfileId <= 0) {
    return { ok: false, message: "Valid billingProfileId is required." };
  }
  if (
    typeof row.stripeCustomerId !== "string" ||
    !isStripeCustomerIdFormat(row.stripeCustomerId)
  ) {
    return { ok: false, message: "Valid stripeCustomerId is required." };
  }
  if (
    typeof row.previewFingerprint !== "string" ||
    !row.previewFingerprint.trim()
  ) {
    return {
      ok: false,
      message: "previewFingerprint is required.",
      code: "stale_preview",
    };
  }
  if (row.confirmed !== true) {
    return { ok: false, message: "Explicit confirmed: true is required." };
  }
  if (row.linkingDoesNotActivateBilling !== true) {
    return {
      ok: false,
      message:
        "Acknowledge linkingDoesNotActivateBilling: true — linking does not activate billing.",
    };
  }
  return {
    ok: true,
    clientId,
    billingProfileId,
    stripeCustomerId: row.stripeCustomerId.trim(),
    previewFingerprint: row.previewFingerprint.trim(),
    confirmed: true,
    linkingDoesNotActivateBilling: true,
    acknowledgeMissingMetadata: row.acknowledgeMissingMetadata === true,
  };
}

export function parseUnlinkBody(body: unknown):
  | {
      ok: true;
      clientId: number;
      billingProfileId: number;
      previewFingerprint: string;
      confirmed: true;
    }
  | { ok: false; message: string; code?: StripeCustomerLinkBlockCode } {
  const authority = rejectBrowserStripeLinkAuthority(body);
  if (!authority.ok) {
    return { ok: false, message: authority.message, code: "browser_authority_rejected" };
  }
  if (typeof body !== "object" || body == null || Array.isArray(body)) {
    return { ok: false, message: "Request body is required." };
  }
  const row = body as Record<string, unknown>;
  const allowed = new Set([
    "clientId",
    "billingProfileId",
    "previewFingerprint",
    "confirmed",
    "unlinkDoesNotAffectAccess",
  ]);
  for (const key of Object.keys(row)) {
    if (!allowed.has(key)) {
      return { ok: false, message: `Unsupported field “${key}”.` };
    }
  }
  const clientId = Number(row.clientId);
  const billingProfileId = Number(row.billingProfileId);
  if (!Number.isInteger(clientId) || clientId <= 0) {
    return { ok: false, message: "Valid clientId is required." };
  }
  if (!Number.isInteger(billingProfileId) || billingProfileId <= 0) {
    return { ok: false, message: "Valid billingProfileId is required." };
  }
  if (
    typeof row.previewFingerprint !== "string" ||
    !row.previewFingerprint.trim()
  ) {
    return { ok: false, message: "previewFingerprint is required.", code: "stale_preview" };
  }
  if (row.confirmed !== true || row.unlinkDoesNotAffectAccess !== true) {
    return {
      ok: false,
      message:
        "Unlink requires confirmed: true and unlinkDoesNotAffectAccess: true.",
    };
  }
  return {
    ok: true,
    clientId,
    billingProfileId,
    previewFingerprint: row.previewFingerprint.trim(),
    confirmed: true,
  };
}

export function parseReconcileBody(body: unknown):
  | { ok: true; clientId: number }
  | { ok: false; message: string } {
  const authority = rejectBrowserStripeLinkAuthority(body);
  if (!authority.ok) return authority;
  if (typeof body !== "object" || body == null || Array.isArray(body)) {
    return { ok: false, message: "Request body is required." };
  }
  const row = body as Record<string, unknown>;
  const allowed = new Set(["clientId"]);
  for (const key of Object.keys(row)) {
    if (!allowed.has(key)) {
      return { ok: false, message: `Unsupported field “${key}”.` };
    }
  }
  const clientId = Number(row.clientId);
  if (!Number.isInteger(clientId) || clientId <= 0) {
    return { ok: false, message: "Valid clientId is required." };
  }
  return { ok: true, clientId };
}

export function buildUnlinkPreviewFingerprint(input: {
  clientId: number;
  billingProfileId: number;
  stripeCustomerId: string | null;
  accountId: string | null;
  mode: string | null;
  profileUpdatedAt: string | null;
}): string {
  return createHash("sha256")
    .update(JSON.stringify({ v: 1, action: "unlink", ...input }))
    .digest("hex")
    .slice(0, 40);
}
