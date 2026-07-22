/**
 * Phase 37I — Operator-only Stripe customer linking & reconciliation service.
 *
 * Test-mode reads only. Links existing verified customers to billing profiles.
 * Does not create/update Stripe customers or any financial objects.
 */
import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import { publishActivity } from "@/lib/activity-engine/publish";
import { CommercialOpsError } from "@/lib/commercial-agreements/ops-service";
import type { CommercialStripeAdapter } from "./commercial-stripe-adapter";
import { getCommercialStripeAdapter } from "./commercial-client";
import {
  assessLinkEligibility,
  assessPhase37IStructuralGate,
  buildCustomerCandidate,
  buildUnlinkPreviewFingerprint,
  computeReconciliationStatus,
  refineReconciliationForClientMetadata,
} from "./customer-linking-logic";
import {
  KXD_STRIPE_CLIENT_METADATA_KEY,
  STRIPE_CUSTOMER_LINK_NOTICES,
  STRIPE_CUSTOMER_LINK_SYSTEMS_UNCHANGED,
  stripeReconciliationStatusLabel,
  type StripeConnectivityResult,
  type StripeCustomerLinkPreview,
  type StripeCustomerLinkResult,
  type StripeCustomerMappingStatus,
  type StripeCustomerReconciliationSnapshot,
  type StripeCustomerSearchResult,
  type StripeCustomerUnlinkResult,
  type StripeReconciliationStatus,
} from "./customer-linking-types";

function asString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const t = value.trim();
  return t || null;
}

function asMappingStatus(value: unknown): StripeCustomerMappingStatus | null {
  if (value === "unlinked" || value === "linked" || value === "requires_review") {
    return value;
  }
  return null;
}

function asMode(value: unknown): "test" | "live" | null {
  if (value === "test" || value === "live") return value;
  return null;
}

function asReconciliationStatus(value: unknown): StripeReconciliationStatus | null {
  const allowed: StripeReconciliationStatus[] = [
    "unlinked",
    "linked_healthy",
    "customer_missing",
    "customer_deleted",
    "account_mismatch",
    "mode_mismatch",
    "client_metadata_missing",
    "client_metadata_mismatch",
    "duplicate_internal_mapping",
    "conflicting_billing_profiles",
    "configuration_blocked",
    "connectivity_failed",
    "requires_operator_review",
  ];
  if (typeof value === "string" && (allowed as string[]).includes(value)) {
    return value as StripeReconciliationStatus;
  }
  return null;
}

function relationId(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) {
    return value;
  }
  if (value && typeof value === "object" && "id" in value) {
    return relationId((value as { id: unknown }).id);
  }
  if (typeof value === "string" && /^\d+$/.test(value)) {
    return Number(value);
  }
  return null;
}

type ProfileRow = {
  id: number;
  clientId: number;
  stripeCustomerId: string | null;
  stripeMode: "test" | "live" | null;
  stripeAccountId: string | null;
  mappingStatus: StripeCustomerMappingStatus | null;
  verifiedAt: string | null;
  lastReconciledAt: string | null;
  reconciliationStatus: StripeReconciliationStatus | null;
  billingEmail: string | null;
  updatedAt: string | null;
};

function mapProfileDoc(doc: Record<string, unknown>): ProfileRow {
  return {
    id: Number(doc.id),
    clientId: relationId(doc.client) ?? 0,
    stripeCustomerId: asString(doc.stripeCustomerId),
    stripeMode: asMode(doc.stripeMode),
    stripeAccountId: asString(doc.stripeAccountId),
    mappingStatus: asMappingStatus(doc.stripeCustomerMappingStatus),
    verifiedAt: asString(doc.stripeCustomerVerifiedAt),
    lastReconciledAt: asString(doc.stripeCustomerLastReconciledAt),
    reconciliationStatus: asReconciliationStatus(
      doc.stripeCustomerReconciliationStatus,
    ),
    billingEmail: asString(doc.billingEmail),
    updatedAt: asString(doc.updatedAt),
  };
}

async function loadClientAndProfiles(clientId: number) {
  const payload = await getPayload({ config });
  const client = await payload.findByID({
    collection: "clients",
    id: clientId,
    depth: 0,
    overrideAccess: true,
  });
  if (!client) {
    throw new CommercialOpsError("Client not found.", 404, "not_found");
  }
  const profiles = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "billing-profiles" as any,
    where: { client: { equals: clientId } },
    limit: 10,
    depth: 0,
    overrideAccess: true,
  });
  const rows = profiles.docs.map((d) =>
    mapProfileDoc(d as unknown as Record<string, unknown>),
  );
  return {
    payload,
    client: client as unknown as Record<string, unknown>,
    clientName: asString((client as { name?: unknown }).name) || `Client ${clientId}`,
    profiles: rows,
  };
}

async function findLinkedClientForCustomer(
  stripeCustomerId: string,
  mode: "test" | "live",
): Promise<number | null> {
  const payload = await getPayload({ config });
  const result = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "billing-profiles" as any,
    where: {
      and: [
        { stripeCustomerId: { equals: stripeCustomerId } },
        { stripeMode: { equals: mode } },
      ],
    },
    limit: 5,
    depth: 0,
    overrideAccess: true,
  });
  if (result.docs.length === 0) return null;
  const first = mapProfileDoc(result.docs[0] as unknown as Record<string, unknown>);
  return first.clientId || null;
}

async function countDuplicateCustomerMappings(
  stripeCustomerId: string,
  mode: "test" | "live",
): Promise<number> {
  const payload = await getPayload({ config });
  const result = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "billing-profiles" as any,
    where: {
      and: [
        { stripeCustomerId: { equals: stripeCustomerId } },
        { stripeMode: { equals: mode } },
      ],
    },
    limit: 20,
    depth: 0,
    overrideAccess: true,
  });
  return result.docs.length;
}

function sanitizeStripeError(err: unknown): string {
  if (err && typeof err === "object" && "type" in err) {
    const type = String((err as { type?: string }).type || "");
    if (type === "StripeAuthenticationError") {
      return "Stripe authentication failed for the configured test-mode key.";
    }
    if (type === "StripeConnectionError" || type === "StripeAPIError") {
      return "Stripe is temporarily unavailable.";
    }
  }
  return "Unable to complete the Stripe request.";
}

function getAdapter(
  operation: "customer_lookup" | "reconciliation_read",
  inject?: CommercialStripeAdapter,
): CommercialStripeAdapter {
  return getCommercialStripeAdapter(operation, inject);
}

export async function verifyTestModeConnectivity(options?: {
  adapter?: CommercialStripeAdapter;
}): Promise<StripeConnectivityResult> {
  const gate = assessPhase37IStructuralGate({
    secretKey: process.env.STRIPE_SECRET_KEY,
    publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  });
  if (!gate.allowed) {
    return {
      outcome: gate.outcome || "structurally_blocked",
      mode: null,
      accountId: null,
      stripeRequestPerformed: false,
      stripeObjectsCreated: "none",
      notices: STRIPE_CUSTOMER_LINK_NOTICES,
      blockers: gate.blockers,
      message: gate.blockers[0]?.message || "Structurally blocked.",
    };
  }

  try {
    const adapter = getAdapter("customer_lookup", options?.adapter);
    const account = await adapter.verifyAccount();
    if (account.livemode) {
      return {
        outcome: "live_mode_rejected",
        mode: null,
        accountId: null,
        stripeRequestPerformed: true,
        stripeObjectsCreated: "none",
        notices: STRIPE_CUSTOMER_LINK_NOTICES,
        blockers: [
          {
            code: "live_mode_rejected",
            message: "Authenticated Stripe account reported live mode — rejected.",
          },
        ],
        message: "Live-mode account rejected for Phase 37I.",
      };
    }
    return {
      outcome: "authenticated_test_account",
      mode: "test",
      accountId: account.accountId,
      stripeRequestPerformed: true,
      stripeObjectsCreated: "none",
      notices: STRIPE_CUSTOMER_LINK_NOTICES,
      blockers: [],
      message:
        "Test-mode connectivity verified with one read-only Stripe account request. Billing is not activated.",
    };
  } catch (err) {
    const authFailed =
      err &&
      typeof err === "object" &&
      ("type" in err
        ? String((err as { type?: string }).type) === "StripeAuthenticationError"
        : String(err).includes("fake_auth_failed"));
    return {
      outcome: authFailed ? "authentication_failed" : "unavailable",
      mode: null,
      accountId: null,
      stripeRequestPerformed: true,
      stripeObjectsCreated: "none",
      notices: STRIPE_CUSTOMER_LINK_NOTICES,
      blockers: [
        {
          code: authFailed ? "authentication_failed" : "unavailable",
          message: sanitizeStripeError(err),
        },
      ],
      message: sanitizeStripeError(err),
    };
  }
}

export async function searchStripeCustomers(
  input: {
    clientId: number;
    exactCustomerId: string | null;
    searchTerm: string | null;
  },
  options?: { adapter?: CommercialStripeAdapter },
): Promise<StripeCustomerSearchResult> {
  const gate = assessPhase37IStructuralGate({
    secretKey: process.env.STRIPE_SECRET_KEY,
    publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  });
  if (!gate.allowed) {
    return {
      queryKind: "empty",
      candidates: [],
      notices: STRIPE_CUSTOMER_LINK_NOTICES,
      blockers: gate.blockers.map((b) => ({
        code: "configuration_blocked" as const,
        message: b.message,
      })),
      stripeRequestPerformed: false,
    };
  }

  const { clientName, profiles } = await loadClientAndProfiles(input.clientId);
  const billingEmail = profiles[0]?.billingEmail ?? null;
  const adapter = getAdapter("customer_lookup", options?.adapter);
  const notices: string[] = [...STRIPE_CUSTOMER_LINK_NOTICES];

  if (input.exactCustomerId) {
    const customer = await adapter.retrieveCustomer(input.exactCustomerId);
    if (!customer) {
      return {
        queryKind: "exact_id",
        candidates: [],
        notices: [
          ...notices,
          "No Stripe customer matched the exact ID. Nothing was created.",
        ],
        blockers: [
          {
            code: "customer_not_found",
            message: "No customer found for that exact ID in the test account.",
          },
        ],
        stripeRequestPerformed: true,
      };
    }
    const linkedClientId = await findLinkedClientForCustomer(customer.id, "test");
    return {
      queryKind: "exact_id",
      candidates: [
        buildCustomerCandidate({
          customer,
          targetClientId: input.clientId,
          linkedClientId,
          billingEmail,
          clientName,
        }),
      ],
      notices,
      blockers: [],
      stripeRequestPerformed: true,
    };
  }

  const term = input.searchTerm!.trim();
  const looksLikeEmail = term.includes("@");
  const list = looksLikeEmail
    ? await adapter.listCustomersByEmail(term, 5)
    : await adapter.listCustomersByName(term, 5);

  if (list.length === 0) {
    return {
      queryKind: looksLikeEmail ? "email" : "name",
      candidates: [],
      notices: [
        ...notices,
        "No candidates found. Email/name search never creates customers or auto-links.",
      ],
      blockers: [],
      stripeRequestPerformed: true,
    };
  }

  if (list.length > 1) {
    notices.push(
      "Multiple matches require operator review. Nothing is auto-selected or linked.",
    );
  }

  const candidates = [];
  for (const customer of list) {
    const linkedClientId = await findLinkedClientForCustomer(customer.id, "test");
    candidates.push(
      buildCustomerCandidate({
        customer,
        targetClientId: input.clientId,
        linkedClientId,
        billingEmail,
        clientName,
      }),
    );
  }

  return {
    queryKind: looksLikeEmail ? "email" : "name",
    candidates,
    notices: [
      ...notices,
      "Email/name matches are informational candidates only — not identity.",
    ],
    blockers: [],
    stripeRequestPerformed: true,
  };
}

export async function previewStripeCustomerLink(
  input: {
    clientId: number;
    stripeCustomerId: string;
    acknowledgeMissingMetadata: boolean;
  },
  options?: { adapter?: CommercialStripeAdapter },
): Promise<StripeCustomerLinkPreview> {
  const gate = assessPhase37IStructuralGate({
    secretKey: process.env.STRIPE_SECRET_KEY,
    publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  });
  if (!gate.allowed) {
    throw new CommercialOpsError(
      gate.blockers[0]?.message || "Configuration blocked.",
      400,
      "configuration_blocked",
    );
  }

  const { clientName, profiles } = await loadClientAndProfiles(input.clientId);
  const profile = profiles[0];
  const adapter = getAdapter("customer_lookup", options?.adapter);
  const account = await adapter.verifyAccount();
  if (account.livemode) {
    throw new CommercialOpsError(
      "Live-mode account rejected.",
      400,
      "live_mode_rejected",
    );
  }
  const customer = await adapter.retrieveCustomer(input.stripeCustomerId);
  if (!customer) {
    throw new CommercialOpsError(
      "Stripe customer not found in the test account.",
      404,
      "customer_not_found",
    );
  }
  const linkedClientId = await findLinkedClientForCustomer(customer.id, "test");

  return assessLinkEligibility({
    clientId: input.clientId,
    clientName,
    billingProfileId: profile?.id ?? 0,
    profileCount: profiles.length,
    customer,
    accountId: account.accountId,
    accountLivemode: account.livemode,
    linkedClientId,
    currentMappedCustomerId: profile?.stripeCustomerId ?? null,
    billingEmail: profile?.billingEmail ?? null,
    acknowledgeMissingMetadata: input.acknowledgeMissingMetadata,
    profileUpdatedAt: profile?.updatedAt ?? null,
  });
}

export async function applyStripeCustomerLink(
  input: {
    clientId: number;
    billingProfileId: number;
    stripeCustomerId: string;
    previewFingerprint: string;
    acknowledgeMissingMetadata: boolean;
    actor?: string;
  },
  options?: { adapter?: CommercialStripeAdapter },
): Promise<StripeCustomerLinkResult> {
  const preview = await previewStripeCustomerLink(
    {
      clientId: input.clientId,
      stripeCustomerId: input.stripeCustomerId,
      acknowledgeMissingMetadata: input.acknowledgeMissingMetadata,
    },
    options,
  );

  if (preview.billingProfileId !== input.billingProfileId) {
    throw new CommercialOpsError(
      "Billing profile mismatch.",
      400,
      "profile_not_eligible",
    );
  }

  if (preview.previewFingerprint !== input.previewFingerprint) {
    return {
      outcome: "stale",
      clientId: input.clientId,
      billingProfileId: input.billingProfileId,
      stripeCustomerId: null,
      accountId: null,
      mode: null,
      mappingStatus: "unlinked",
      reconciliationStatus: "requires_operator_review",
      message:
        "This link preview is out of date. Review a fresh preview and try again.",
      blockers: [
        {
          code: "stale_preview",
          message: "Stale preview fingerprint.",
        },
      ],
      activityEmitted: false,
    };
  }

  if (!preview.canLink) {
    return {
      outcome: "blocked",
      clientId: input.clientId,
      billingProfileId: input.billingProfileId,
      stripeCustomerId: preview.stripeCustomerId,
      accountId: preview.accountId,
      mode: "test",
      mappingStatus: preview.mappingStatus,
      reconciliationStatus: "requires_operator_review",
      message: preview.blockers[0]?.message || "Linking blocked.",
      blockers: preview.blockers,
      activityEmitted: false,
    };
  }

  const { payload, profiles } = await loadClientAndProfiles(input.clientId);
  const profile = profiles.find((p) => p.id === input.billingProfileId);
  if (!profile) {
    throw new CommercialOpsError(
      "Billing profile not found.",
      404,
      "missing_billing_profile",
    );
  }

  // Idempotent: already linked to same customer
  if (
    profile.stripeCustomerId === input.stripeCustomerId &&
    profile.stripeMode === "test" &&
    profile.stripeAccountId === preview.accountId &&
    profile.mappingStatus === "linked"
  ) {
    return {
      outcome: "unchanged",
      clientId: input.clientId,
      billingProfileId: profile.id,
      stripeCustomerId: profile.stripeCustomerId,
      accountId: profile.stripeAccountId,
      mode: "test",
      mappingStatus: "linked",
      reconciliationStatus:
        profile.reconciliationStatus || "linked_healthy",
      message: "Mapping already linked — no change.",
      blockers: [],
      activityEmitted: false,
    };
  }

  const now = new Date().toISOString();
  await payload.update({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "billing-profiles" as any,
    id: profile.id,
    data: {
      stripeCustomerId: input.stripeCustomerId,
      stripeMode: "test",
      stripeAccountId: preview.accountId,
      stripeCustomerMappingStatus: "linked",
      stripeCustomerVerifiedAt: now,
      stripeCustomerReconciliationStatus: preview.ownership.metadataMissing
        ? "client_metadata_missing"
        : "linked_healthy",
      stripeCustomerLastReconciledAt: now,
    } as Record<string, unknown>,
    overrideAccess: true,
    depth: 0,
  });

  let activityEmitted = false;
  try {
    await publishActivity({
      eventType: "commercial.stripe_customer.linked",
      title: "Stripe customer linked (test mode)",
      summary: `Test-mode Stripe customer mapping linked for client ${input.clientId}. No billing activated. No Stripe customer created or updated.`,
      clientId: input.clientId,
      sourceModule: "Client Command",
      sourceType: "commercial-stripe-customer-link",
      sourceId: `${input.clientId}:${profile.id}:${input.stripeCustomerId}`,
      author: input.actor || "operator",
      internalOnly: true,
      dedupe: true,
      category: "finance",
      metadata: {
        action: "linked",
        billingProfileId: profile.id,
        stripeMode: "test",
        stripeAccountId: preview.accountId,
        stripeCustomerId: input.stripeCustomerId,
        reconciliationStatus: preview.ownership.metadataMissing
          ? "client_metadata_missing"
          : "linked_healthy",
      },
    });
    activityEmitted = true;
  } catch {
    console.error("[KXD Stripe Customer Link] Activity publish failed");
  }

  return {
    outcome: "changed",
    clientId: input.clientId,
    billingProfileId: profile.id,
    stripeCustomerId: input.stripeCustomerId,
    accountId: preview.accountId,
    mode: "test",
    mappingStatus: "linked",
    reconciliationStatus: preview.ownership.metadataMissing
      ? "client_metadata_missing"
      : "linked_healthy",
    message:
      "Stripe customer linked internally in test mode. No Stripe object was created or updated. Billing is not activated.",
    blockers: [],
    activityEmitted,
  };
}

export async function previewStripeCustomerUnlink(clientId: number): Promise<{
  clientId: number;
  billingProfileId: number;
  stripeCustomerId: string | null;
  previewFingerprint: string;
  canUnlink: boolean;
  message: string;
}> {
  const { profiles } = await loadClientAndProfiles(clientId);
  if (profiles.length !== 1) {
    return {
      clientId,
      billingProfileId: 0,
      stripeCustomerId: null,
      previewFingerprint: "",
      canUnlink: false,
      message:
        profiles.length === 0
          ? "No billing profile — nothing to unlink."
          : "Duplicate billing profiles block unlinking.",
    };
  }
  const profile = profiles[0];
  if (!profile.stripeCustomerId) {
    return {
      clientId,
      billingProfileId: profile.id,
      stripeCustomerId: null,
      previewFingerprint: buildUnlinkPreviewFingerprint({
        clientId,
        billingProfileId: profile.id,
        stripeCustomerId: null,
        accountId: profile.stripeAccountId,
        mode: profile.stripeMode,
        profileUpdatedAt: profile.updatedAt,
      }),
      canUnlink: false,
      message: "No Stripe customer mapping to unlink.",
    };
  }
  // Phase 37I: no commercial subscription dependency exists yet — unlink is safe.
  return {
    clientId,
    billingProfileId: profile.id,
    stripeCustomerId: profile.stripeCustomerId,
    previewFingerprint: buildUnlinkPreviewFingerprint({
      clientId,
      billingProfileId: profile.id,
      stripeCustomerId: profile.stripeCustomerId,
      accountId: profile.stripeAccountId,
      mode: profile.stripeMode,
      profileUpdatedAt: profile.updatedAt,
    }),
    canUnlink: true,
    message:
      "Unlink removes the internal mapping only. Stripe customer is not deleted or modified. Access is unchanged.",
  };
}

export async function applyStripeCustomerUnlink(
  input: {
    clientId: number;
    billingProfileId: number;
    previewFingerprint: string;
    actor?: string;
  },
): Promise<StripeCustomerUnlinkResult> {
  const preview = await previewStripeCustomerUnlink(input.clientId);
  if (preview.billingProfileId !== input.billingProfileId) {
    return {
      outcome: "blocked",
      clientId: input.clientId,
      billingProfileId: input.billingProfileId,
      message: "Billing profile mismatch.",
      activityEmitted: false,
      blockers: [
        { code: "profile_not_eligible", message: "Billing profile mismatch." },
      ],
    };
  }
  if (preview.previewFingerprint !== input.previewFingerprint) {
    return {
      outcome: "stale",
      clientId: input.clientId,
      billingProfileId: input.billingProfileId,
      message: "Unlink preview is out of date.",
      activityEmitted: false,
      blockers: [{ code: "stale_preview", message: "Stale preview." }],
    };
  }
  if (!preview.canUnlink) {
    return {
      outcome: preview.stripeCustomerId ? "blocked" : "unchanged",
      clientId: input.clientId,
      billingProfileId: input.billingProfileId,
      message: preview.message,
      activityEmitted: false,
      blockers: [],
    };
  }

  const { payload, profiles } = await loadClientAndProfiles(input.clientId);
  const profile = profiles.find((p) => p.id === input.billingProfileId);
  if (!profile?.stripeCustomerId) {
    return {
      outcome: "unchanged",
      clientId: input.clientId,
      billingProfileId: input.billingProfileId,
      message: "Already unlinked.",
      activityEmitted: false,
      blockers: [],
    };
  }

  const priorCustomerId = profile.stripeCustomerId;
  const priorAccountId = profile.stripeAccountId;
  const now = new Date().toISOString();

  await payload.update({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "billing-profiles" as any,
    id: profile.id,
    data: {
      stripeCustomerId: null,
      stripeMode: null,
      stripeAccountId: null,
      stripeCustomerMappingStatus: "unlinked",
      stripeCustomerVerifiedAt: null,
      stripeCustomerReconciliationStatus: "unlinked",
      stripeCustomerLastReconciledAt: now,
    } as Record<string, unknown>,
    overrideAccess: true,
    depth: 0,
  });

  let activityEmitted = false;
  try {
    await publishActivity({
      eventType: "commercial.stripe_customer.unlinked",
      title: "Stripe customer unlinked (test mode)",
      summary: `Internal Stripe customer mapping removed for client ${input.clientId}. Stripe customer was not deleted. Access unchanged.`,
      clientId: input.clientId,
      sourceModule: "Client Command",
      sourceType: "commercial-stripe-customer-link",
      sourceId: `${input.clientId}:${profile.id}:unlink:${priorCustomerId}`,
      author: input.actor || "operator",
      internalOnly: true,
      dedupe: true,
      category: "finance",
      metadata: {
        action: "unlinked",
        billingProfileId: profile.id,
        stripeMode: "test",
        stripeAccountId: priorAccountId,
        stripeCustomerId: priorCustomerId,
        reconciliationStatus: "unlinked",
      },
    });
    activityEmitted = true;
  } catch {
    console.error("[KXD Stripe Customer Unlink] Activity publish failed");
  }

  return {
    outcome: "changed",
    clientId: input.clientId,
    billingProfileId: profile.id,
    message:
      "Internal mapping removed. Stripe customer was not modified. Access unchanged.",
    activityEmitted,
    blockers: [],
  };
}

export async function reconcileStripeCustomer(
  clientId: number,
  options?: { adapter?: CommercialStripeAdapter; persist?: boolean },
): Promise<StripeCustomerReconciliationSnapshot> {
  const gate = assessPhase37IStructuralGate({
    secretKey: process.env.STRIPE_SECRET_KEY,
    publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  });

  const { payload, profiles } = await loadClientAndProfiles(clientId);
  const profile = profiles[0] ?? null;
  const persist = options?.persist !== false;

  if (!gate.allowed) {
    const snapshot: StripeCustomerReconciliationSnapshot = {
      clientId,
      billingProfileId: profile?.id ?? null,
      status: "configuration_blocked",
      statusLabel: stripeReconciliationStatusLabel("configuration_blocked"),
      mode: profile?.stripeMode ?? null,
      accountId: profile?.stripeAccountId ?? null,
      stripeCustomerId: profile?.stripeCustomerId ?? null,
      customerExists: null,
      customerDeleted: null,
      metadataOwnership: "not_applicable",
      internalUniqueness: "not_applicable",
      lastVerifiedAt: profile?.verifiedAt ?? null,
      lastReconciledAt: profile?.lastReconciledAt ?? null,
      blockers: gate.blockers,
      recommendedAction:
        "Resolve Stripe structural configuration before reconciling.",
      notices: STRIPE_CUSTOMER_LINK_NOTICES,
      stripeRequestPerformed: false,
      systemsUnchanged: STRIPE_CUSTOMER_LINK_SYSTEMS_UNCHANGED,
    };
    return snapshot;
  }

  let accountId: string | null = null;
  let customer = null;
  let customerLookupFailed = false;
  let stripeRequestPerformed = false;

  try {
    const adapter = getAdapter("reconciliation_read", options?.adapter);
    const account = await adapter.verifyAccount();
    accountId = account.accountId;
    stripeRequestPerformed = true;
    if (profile?.stripeCustomerId) {
      customer = await adapter.retrieveCustomer(profile.stripeCustomerId);
    }
  } catch {
    customerLookupFailed = true;
    stripeRequestPerformed = true;
  }

  const duplicateCount = profile?.stripeCustomerId
    ? await countDuplicateCustomerMappings(profile.stripeCustomerId, "test")
    : 0;

  let computed = computeReconciliationStatus({
    hasProfile: Boolean(profile),
    profileCount: profiles.length,
    stripeCustomerId: profile?.stripeCustomerId ?? null,
    stripeMode: profile?.stripeMode ?? null,
    stripeAccountId: profile?.stripeAccountId ?? null,
    expectedMode: "test",
    expectedAccountId: accountId,
    customer,
    customerLookupFailed,
    configurationBlocked: false,
    duplicateCustomerMappings: duplicateCount,
  });

  if (customer && profile) {
    const meta =
      customer.metadata[KXD_STRIPE_CLIENT_METADATA_KEY]?.trim() || null;
    computed = {
      ...computed,
      ...refineReconciliationForClientMetadata(
        computed.status,
        computed.metadataOwnership,
        meta,
        clientId,
      ),
    };
  }

  const now = new Date().toISOString();
  if (persist && profile) {
    try {
      await payload.update({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "billing-profiles" as any,
        id: profile.id,
        data: {
          stripeCustomerReconciliationStatus: computed.status,
          stripeCustomerLastReconciledAt: now,
        } as Record<string, unknown>,
        overrideAccess: true,
        depth: 0,
      });
    } catch {
      console.error("[KXD Stripe Reconcile] Failed to persist status");
    }
  }

  return {
    clientId,
    billingProfileId: profile?.id ?? null,
    status: computed.status,
    statusLabel: stripeReconciliationStatusLabel(computed.status),
    mode: profile?.stripeMode ?? (gate.mode === "test" ? "test" : null),
    accountId: profile?.stripeAccountId ?? accountId,
    stripeCustomerId: profile?.stripeCustomerId ?? null,
    customerExists: customer ? !customer.deleted : customer === null && profile?.stripeCustomerId ? false : null,
    customerDeleted: customer?.deleted ?? null,
    metadataOwnership: computed.metadataOwnership,
    internalUniqueness: computed.internalUniqueness,
    lastVerifiedAt: profile?.verifiedAt ?? null,
    lastReconciledAt: persist && profile ? now : profile?.lastReconciledAt ?? null,
    blockers: [],
    recommendedAction: computed.recommendedAction,
    notices: [
      ...STRIPE_CUSTOMER_LINK_NOTICES,
      "Reconciliation compares mapping intent with external customer facts. No repair, access change, or Stripe mutation occurred.",
    ],
    stripeRequestPerformed,
    systemsUnchanged: STRIPE_CUSTOMER_LINK_SYSTEMS_UNCHANGED,
  };
}

export async function listLinkableBillingClients(): Promise<
  Array<{
    clientId: number;
    clientName: string;
    billingProfileId: number | null;
    eligible: boolean;
    reason: string;
    mappingStatus: StripeCustomerMappingStatus | null;
    stripeCustomerId: string | null;
  }>
> {
  const payload = await getPayload({ config });
  const profiles = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "billing-profiles" as any,
    limit: 200,
    depth: 1,
    overrideAccess: true,
  });

  const byClient = new Map<number, ProfileRow[]>();
  for (const doc of profiles.docs) {
    const row = mapProfileDoc(doc as unknown as Record<string, unknown>);
    if (!row.clientId) continue;
    const list = byClient.get(row.clientId) || [];
    list.push(row);
    byClient.set(row.clientId, list);
  }

  const out: Array<{
    clientId: number;
    clientName: string;
    billingProfileId: number | null;
    eligible: boolean;
    reason: string;
    mappingStatus: StripeCustomerMappingStatus | null;
    stripeCustomerId: string | null;
  }> = [];

  for (const [clientId, rows] of byClient) {
    let clientName = `Client ${clientId}`;
    try {
      const client = await payload.findByID({
        collection: "clients",
        id: clientId,
        depth: 0,
        overrideAccess: true,
      });
      clientName =
        asString((client as { name?: unknown })?.name) || clientName;
    } catch {
      /* keep default */
    }
    if (rows.length !== 1) {
      out.push({
        clientId,
        clientName,
        billingProfileId: null,
        eligible: false,
        reason:
          rows.length === 0
            ? "No billing profile"
            : "Duplicate billing profiles",
        mappingStatus: null,
        stripeCustomerId: null,
      });
      continue;
    }
    const profile = rows[0];
    out.push({
      clientId,
      clientName,
      billingProfileId: profile.id,
      eligible: true,
      reason: profile.stripeCustomerId
        ? "Eligible · mapping present"
        : "Eligible · unlinked",
      mappingStatus:
        profile.mappingStatus ||
        (profile.stripeCustomerId ? "linked" : "unlinked"),
      stripeCustomerId: profile.stripeCustomerId,
    });
  }

  return out.sort((a, b) => a.clientName.localeCompare(b.clientName));
}
