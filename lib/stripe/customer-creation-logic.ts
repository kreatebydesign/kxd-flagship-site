/**
 * Phase 37J — Pure Stripe test customer creation logic.
 * Free of server-only. Never contacts Stripe. Never returns secrets or idempotency keys.
 */

import { createHash } from "node:crypto";
import {
  assessPhase37IStructuralGate,
  isStripeCustomerIdFormat,
  maskBillingEmail,
  rejectBrowserStripeLinkAuthority,
} from "./customer-linking-logic";
import { KXD_STRIPE_CLIENT_METADATA_KEY } from "./customer-linking-types";
import {
  KXD_STRIPE_BILLING_PROFILE_METADATA_KEY,
  KXD_STRIPE_CREATION_INTENT_METADATA_KEY,
  KXD_STRIPE_ENVIRONMENT_METADATA_KEY,
  STRIPE_CUSTOMER_CREATE_METADATA_ALLOWLIST,
  STRIPE_CUSTOMER_CREATE_NOTICES,
  STRIPE_CUSTOMER_CREATE_SYSTEMS_UNCHANGED,
  type StripeCustomerCreateBlockCode,
  type StripeCustomerCreatePayloadPreview,
  type StripeCustomerCreatePreview,
} from "./customer-creation-types";

/** Phase 37J authorizes test-mode customer_create only (plus prior 37I reads). */
export const STRIPE_PHASE_37J_TEST_CREATE_AUTHORIZED = true;

export function normalizeCreateCustomerName(value: string | null | undefined): {
  ok: true;
  value: string;
} | { ok: false; message: string } {
  if (value == null || !String(value).trim()) {
    return { ok: false, message: "A customer display name is required." };
  }
  const name = String(value).trim().replace(/\s+/g, " ");
  if (name.length > 120) {
    return { ok: false, message: "Customer name exceeds 120 characters." };
  }
  if (name.includes("@") || /^https?:\/\//i.test(name)) {
    return {
      ok: false,
      message: "Customer name must not be an email or URL.",
    };
  }
  return { ok: true, value: name };
}

export function normalizeCreateBillingEmail(value: string | null | undefined): {
  ok: true;
  value: string;
} | { ok: false; message: string } {
  if (value == null || !String(value).trim()) {
    return {
      ok: false,
      message:
        "An explicitly configured billing-profile email is required before creating a Stripe customer.",
    };
  }
  const email = String(value).trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, message: "Billing email format is invalid." };
  }
  return { ok: true, value: email };
}

/**
 * Authoritative contact precedence:
 * - name: billingContact (if present) else clients.name
 * - email: billing-profiles.billingEmail only (never portal-user or primary contact)
 */
export function resolveAuthoritativeCustomerIdentity(input: {
  clientName: string | null;
  billingContact: string | null;
  billingEmail: string | null;
}):
  | { ok: true; name: string; email: string }
  | {
      ok: false;
      blockers: Array<{ code: StripeCustomerCreateBlockCode; message: string }>;
    } {
  const blockers: Array<{
    code: StripeCustomerCreateBlockCode;
    message: string;
  }> = [];
  const nameSource = input.billingContact?.trim()
    ? input.billingContact
    : input.clientName;
  const nameResult = normalizeCreateCustomerName(nameSource);
  if (!nameResult.ok) {
    blockers.push({ code: "missing_customer_name", message: nameResult.message });
  }
  const emailResult = normalizeCreateBillingEmail(input.billingEmail);
  if (!emailResult.ok) {
    blockers.push({ code: "missing_billing_email", message: emailResult.message });
  }
  if (blockers.length || !nameResult.ok || !emailResult.ok) {
    return { ok: false, blockers };
  }
  return { ok: true, name: nameResult.value, email: emailResult.value };
}

export function buildCreationIntentVersion(input: {
  clientId: number;
  billingProfileId: number;
  accountId: string;
  mode: "test";
  name: string;
  email: string;
  profileUpdatedAt: string | null;
}): string {
  const payload = JSON.stringify({
    v: 1,
    clientId: input.clientId,
    billingProfileId: input.billingProfileId,
    accountId: input.accountId,
    mode: input.mode,
    name: input.name,
    email: input.email,
    profileUpdatedAt: input.profileUpdatedAt,
  });
  return createHash("sha256").update(payload).digest("hex").slice(0, 24);
}

/**
 * Deterministic Stripe idempotency key material — never log or return to browser.
 * Callers must pass only the opaque key to Stripe and never expose it.
 */
export function deriveStripeCustomerCreateIdempotencyKey(input: {
  clientId: number;
  billingProfileId: number;
  accountId: string;
  mode: "test";
  creationIntentVersion: string;
}): string {
  const payload = JSON.stringify({
    v: 1,
    op: "customer_create",
    clientId: input.clientId,
    billingProfileId: input.billingProfileId,
    accountId: input.accountId,
    mode: input.mode,
    intent: input.creationIntentVersion,
  });
  // Prefix keeps Stripe keys human-classifiable without leaking PII.
  return `kxd37j_${createHash("sha256").update(payload).digest("hex").slice(0, 40)}`;
}

export function buildCreatePreviewFingerprint(input: {
  clientId: number;
  billingProfileId: number;
  accountId: string;
  mode: "test";
  name: string;
  email: string;
  creationIntentVersion: string;
  mappingCustomerId: string | null;
  profileUpdatedAt: string | null;
}): string {
  return createHash("sha256")
    .update(JSON.stringify({ v: 1, kind: "create_preview", ...input }))
    .digest("hex")
    .slice(0, 40);
}

export function buildAllowlistedCreateMetadata(input: {
  clientId: number;
  billingProfileId: number;
  creationIntentVersion: string;
}): Record<string, string> {
  const meta: Record<string, string> = {
    [KXD_STRIPE_CLIENT_METADATA_KEY]: String(input.clientId),
    [KXD_STRIPE_BILLING_PROFILE_METADATA_KEY]: String(input.billingProfileId),
    [KXD_STRIPE_ENVIRONMENT_METADATA_KEY]: "test",
    [KXD_STRIPE_CREATION_INTENT_METADATA_KEY]: input.creationIntentVersion,
  };
  for (const key of Object.keys(meta)) {
    if (
      !(STRIPE_CUSTOMER_CREATE_METADATA_ALLOWLIST as readonly string[]).includes(
        key,
      )
    ) {
      delete meta[key];
    }
  }
  return meta;
}

export function buildCreatePayloadPreview(input: {
  name: string;
  email: string;
  clientId: number;
  billingProfileId: number;
  creationIntentVersion: string;
}): StripeCustomerCreatePayloadPreview {
  return {
    name: input.name,
    email: input.email,
    emailMasked: maskBillingEmail(input.email) || "***",
    metadataKeys: STRIPE_CUSTOMER_CREATE_METADATA_ALLOWLIST,
    metadataClientId: String(input.clientId),
    metadataBillingProfileId: String(input.billingProfileId),
    metadataEnvironment: "test",
    metadataCreationIntentVersion: input.creationIntentVersion,
  };
}

export function assessCreateEligibility(input: {
  clientId: number;
  clientName: string;
  billingProfileId: number;
  profileCount: number;
  billingContact: string | null;
  billingEmail: string | null;
  currentMappedCustomerId: string | null;
  accountId: string;
  accountLivemode: boolean;
  profileUpdatedAt: string | null;
  metadataMatches: Array<{ id: string }>;
  informationalMatches: Array<{
    id: string;
    name: string | null;
    email: string | null;
  }>;
  acknowledgeInformationalDuplicates: boolean;
}): StripeCustomerCreatePreview {
  const blockers: Array<{
    code: StripeCustomerCreateBlockCode;
    message: string;
  }> = [];
  const warnings: string[] = [];

  if (input.profileCount === 0) {
    blockers.push({
      code: "missing_billing_profile",
      message:
        "No billing profile exists. Configure billing first — profiles are not auto-created.",
    });
  } else if (input.profileCount > 1) {
    blockers.push({
      code: "duplicate_billing_profiles",
      message: "Multiple billing profiles block customer creation.",
    });
  }

  if (input.accountLivemode) {
    blockers.push({
      code: "live_mode_rejected",
      message: "Live-mode Stripe account is rejected for Phase 37J.",
    });
  }

  if (input.currentMappedCustomerId) {
    blockers.push({
      code: "existing_mapping",
      message:
        "This billing profile already has a Stripe customer mapping. Use linking/unlink workflows instead of creating another customer.",
    });
  }

  if (input.metadataMatches.length === 1) {
    blockers.push({
      code: "existing_metadata_customer",
      message: `An existing test customer already claims kxd_client_id=${input.clientId}. Use the existing-customer linking workflow instead of creating a duplicate.`,
    });
  } else if (input.metadataMatches.length > 1) {
    blockers.push({
      code: "multiple_metadata_customers",
      message:
        "Multiple Stripe customers claim this client ID. Resolve ownership via reconciliation before creating.",
    });
  }

  const identity = resolveAuthoritativeCustomerIdentity({
    clientName: input.clientName,
    billingContact: input.billingContact,
    billingEmail: input.billingEmail,
  });
  if (!identity.ok) {
    blockers.push(...identity.blockers);
  }

  const requiresInformationalDuplicateAck =
    input.informationalMatches.length > 0 &&
    input.metadataMatches.length === 0;
  if (requiresInformationalDuplicateAck && !input.acknowledgeInformationalDuplicates) {
    blockers.push({
      code: "informational_duplicates_require_ack",
      message:
        "Email/name matches exist without ownership metadata. Acknowledge review before creating — they do not prove identity.",
    });
  } else if (requiresInformationalDuplicateAck) {
    warnings.push(
      "Informational email/name matches were acknowledged. Ownership remains kxd_client_id metadata after creation.",
    );
  }

  const name = identity.ok ? identity.name : "";
  const email = identity.ok ? identity.email : "";
  const creationIntentVersion =
    identity.ok && input.billingProfileId > 0
      ? buildCreationIntentVersion({
          clientId: input.clientId,
          billingProfileId: input.billingProfileId,
          accountId: input.accountId,
          mode: "test",
          name,
          email,
          profileUpdatedAt: input.profileUpdatedAt,
        })
      : "";

  const payload =
    identity.ok && creationIntentVersion
      ? buildCreatePayloadPreview({
          name,
          email,
          clientId: input.clientId,
          billingProfileId: input.billingProfileId,
          creationIntentVersion,
        })
      : {
          name: "",
          email: "",
          emailMasked: "***",
          metadataKeys: STRIPE_CUSTOMER_CREATE_METADATA_ALLOWLIST,
          metadataClientId: String(input.clientId),
          metadataBillingProfileId: String(input.billingProfileId || 0),
          metadataEnvironment: "test" as const,
          metadataCreationIntentVersion: "",
        };

  const previewFingerprint =
    identity.ok && creationIntentVersion
      ? buildCreatePreviewFingerprint({
          clientId: input.clientId,
          billingProfileId: input.billingProfileId,
          accountId: input.accountId,
          mode: "test",
          name,
          email,
          creationIntentVersion,
          mappingCustomerId: input.currentMappedCustomerId,
          profileUpdatedAt: input.profileUpdatedAt,
        })
      : "";

  return {
    clientId: input.clientId,
    clientName: input.clientName,
    billingProfileId: input.billingProfileId,
    accountId: input.accountId,
    mode: "test",
    payload,
    creationIntentVersion,
    previewFingerprint,
    canCreate: blockers.length === 0 && Boolean(creationIntentVersion),
    requiresInformationalDuplicateAck,
    informationalEmailNameMatches: input.informationalMatches.map((row) => ({
      stripeCustomerId: row.id,
      displayName: row.name,
      billingEmailMasked: maskBillingEmail(row.email),
      note: "Informational match only — not ownership.",
    })),
    existingMetadataMatches: input.metadataMatches.map((row) => ({
      stripeCustomerId: row.id,
      note: "Existing customer claims this kxd_client_id — use linking.",
    })),
    blockers,
    warnings,
    notices: STRIPE_CUSTOMER_CREATE_NOTICES,
    systemsUnchanged: STRIPE_CUSTOMER_CREATE_SYSTEMS_UNCHANGED,
  };
}

export function rejectBrowserStripeCreateAuthority(body: unknown):
  | { ok: true }
  | { ok: false; message: string } {
  const base = rejectBrowserStripeLinkAuthority(body);
  if (!base.ok) return base;
  if (body == null || body === "") return { ok: true };
  if (typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, message: "Unexpected request body." };
  }
  const row = body as Record<string, unknown>;
  const forbidden = [
    "name",
    "email",
    "customerName",
    "customerEmail",
    "billingEmail",
    "billingContact",
    "metadata",
    "idempotencyKey",
    "creationIntentVersion",
    "description",
    "phone",
    "address",
    "shipping",
  ] as const;
  for (const key of forbidden) {
    if (key in row && row[key] !== undefined) {
      return {
        ok: false,
        message:
          "Browser-supplied customer payload, metadata, contact fields, or idempotency keys are not accepted.",
      };
    }
  }
  return { ok: true };
}

export function parseCreatePreviewBody(body: unknown):
  | {
      ok: true;
      clientId: number;
      acknowledgeInformationalDuplicates: boolean;
    }
  | { ok: false; message: string } {
  const authority = rejectBrowserStripeCreateAuthority(body);
  if (!authority.ok) return authority;
  if (typeof body !== "object" || body == null || Array.isArray(body)) {
    return { ok: false, message: "Request body is required." };
  }
  const row = body as Record<string, unknown>;
  const allowed = new Set(["clientId", "acknowledgeInformationalDuplicates"]);
  for (const key of Object.keys(row)) {
    if (!allowed.has(key)) {
      return { ok: false, message: `Unsupported field “${key}”.` };
    }
  }
  const clientId = Number(row.clientId);
  if (!Number.isInteger(clientId) || clientId <= 0) {
    return { ok: false, message: "Valid clientId is required." };
  }
  return {
    ok: true,
    clientId,
    acknowledgeInformationalDuplicates:
      row.acknowledgeInformationalDuplicates === true,
  };
}

export function parseCreateApplyBody(body: unknown):
  | {
      ok: true;
      clientId: number;
      billingProfileId: number;
      previewFingerprint: string;
      confirmed: true;
      creatingTestCustomerDoesNotActivateBilling: true;
      acknowledgeInformationalDuplicates: boolean;
    }
  | { ok: false; message: string; code?: StripeCustomerCreateBlockCode } {
  const authority = rejectBrowserStripeCreateAuthority(body);
  if (!authority.ok) {
    return {
      ok: false,
      message: authority.message,
      code: "browser_authority_rejected",
    };
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
    "creatingTestCustomerDoesNotActivateBilling",
    "acknowledgeInformationalDuplicates",
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
    return {
      ok: false,
      message: "previewFingerprint is required.",
      code: "stale_preview",
    };
  }
  if (row.confirmed !== true) {
    return { ok: false, message: "Explicit confirmed: true is required." };
  }
  if (row.creatingTestCustomerDoesNotActivateBilling !== true) {
    return {
      ok: false,
      message:
        "Acknowledge creatingTestCustomerDoesNotActivateBilling: true — creation does not activate billing or access.",
    };
  }
  return {
    ok: true,
    clientId,
    billingProfileId,
    previewFingerprint: row.previewFingerprint.trim(),
    confirmed: true,
    creatingTestCustomerDoesNotActivateBilling: true,
    acknowledgeInformationalDuplicates:
      row.acknowledgeInformationalDuplicates === true,
  };
}

export function verifyCreatedCustomerOwnership(input: {
  customerId: string;
  clientId: number;
  billingProfileId: number;
  creationIntentVersion: string;
  livemode: boolean;
  metadata: Record<string, string>;
}): { ok: true } | { ok: false; message: string } {
  if (!isStripeCustomerIdFormat(input.customerId)) {
    return { ok: false, message: "Created customer ID format is invalid." };
  }
  if (input.livemode) {
    return { ok: false, message: "Created customer reported live mode." };
  }
  if (input.metadata[KXD_STRIPE_CLIENT_METADATA_KEY] !== String(input.clientId)) {
    return { ok: false, message: "Created customer missing expected kxd_client_id." };
  }
  if (
    input.metadata[KXD_STRIPE_BILLING_PROFILE_METADATA_KEY] !==
    String(input.billingProfileId)
  ) {
    return {
      ok: false,
      message: "Created customer missing expected kxd_billing_profile_id.",
    };
  }
  if (input.metadata[KXD_STRIPE_ENVIRONMENT_METADATA_KEY] !== "test") {
    return { ok: false, message: "Created customer environment metadata mismatch." };
  }
  if (
    input.metadata[KXD_STRIPE_CREATION_INTENT_METADATA_KEY] !==
    input.creationIntentVersion
  ) {
    return {
      ok: false,
      message: "Created customer creation-intent metadata mismatch.",
    };
  }
  return { ok: true };
}

export function assessPhase37JCreateGate(env: {
  secretKey: string | null | undefined;
  publishableKey: string | null | undefined;
  webhookSecret: string | null | undefined;
}) {
  const gate = assessPhase37IStructuralGate(env);
  if (!gate.allowed) return gate;
  if (!STRIPE_PHASE_37J_TEST_CREATE_AUTHORIZED) {
    return {
      ...gate,
      allowed: false,
      outcome: "structurally_blocked" as const,
      blockers: [
        {
          code: "execution_prohibited",
          message: "Phase 37J test customer creation is not authorized in server policy.",
        },
      ],
    };
  }
  return gate;
}
