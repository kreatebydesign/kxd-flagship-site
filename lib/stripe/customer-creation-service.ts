/**
 * Phase 37J — Operator-only Stripe test customer creation service.
 *
 * Creates exactly one test-mode Stripe customer with allowlisted metadata,
 * then links internally. Never updates/deletes existing customers.
 * Never creates subscriptions, invoices, or other financial objects.
 */
import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import { publishActivity } from "@/lib/activity-engine/publish";
import { CommercialOpsError } from "@/lib/commercial-agreements/ops-service";
import type { CommercialStripeAdapter } from "./commercial-stripe-adapter";
import { getCommercialStripeAdapter } from "./commercial-client";
import {
  assessCreateEligibility,
  assessPhase37JCreateGate,
  buildAllowlistedCreateMetadata,
  deriveStripeCustomerCreateIdempotencyKey,
  verifyCreatedCustomerOwnership,
} from "./customer-creation-logic";
import type {
  StripeCustomerCreatePreview,
  StripeCustomerCreateResult,
} from "./customer-creation-types";
import { KXD_STRIPE_CLIENT_METADATA_KEY } from "./customer-linking-types";

function asString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const t = value.trim();
  return t || null;
}

function relationId(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) {
    return value;
  }
  if (value && typeof value === "object" && "id" in value) {
    return relationId((value as { id: unknown }).id);
  }
  if (typeof value === "string" && /^\d+$/.test(value)) return Number(value);
  return null;
}

type ProfileRow = {
  id: number;
  clientId: number;
  stripeCustomerId: string | null;
  billingEmail: string | null;
  billingContact: string | null;
  updatedAt: string | null;
};

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
  const rows: ProfileRow[] = profiles.docs.map((doc) => {
    const row = doc as unknown as Record<string, unknown>;
    return {
      id: Number(row.id),
      clientId: relationId(row.client) ?? 0,
      stripeCustomerId: asString(row.stripeCustomerId),
      billingEmail: asString(row.billingEmail),
      billingContact: asString(row.billingContact),
      updatedAt: asString(row.updatedAt),
    };
  });
  return {
    payload,
    clientName: asString((client as { name?: unknown }).name) || `Client ${clientId}`,
    profiles: rows,
  };
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
    if (type === "StripeIdempotencyError") {
      return "Creation intent conflict. Review a fresh preview and try again.";
    }
  }
  return "Unable to complete the Stripe customer creation request.";
}

async function collectOwnershipEvidence(
  adapter: CommercialStripeAdapter,
  clientId: number,
  name: string | null,
  email: string | null,
) {
  const metadataMatches = await adapter.searchCustomersByClientMetadata(
    clientId,
    5,
  );
  const informational: Array<{
    id: string;
    name: string | null;
    email: string | null;
  }> = [];
  if (email) {
    for (const row of await adapter.listCustomersByEmail(email, 5)) {
      if (
        row.metadata[KXD_STRIPE_CLIENT_METADATA_KEY] !== String(clientId) &&
        !informational.some((x) => x.id === row.id)
      ) {
        informational.push({ id: row.id, name: row.name, email: row.email });
      }
    }
  }
  if (name) {
    for (const row of await adapter.listCustomersByName(name, 5)) {
      if (
        row.metadata[KXD_STRIPE_CLIENT_METADATA_KEY] !== String(clientId) &&
        !informational.some((x) => x.id === row.id)
      ) {
        informational.push({ id: row.id, name: row.name, email: row.email });
      }
    }
  }
  return { metadataMatches, informational };
}

export async function previewStripeCustomerCreate(
  input: {
    clientId: number;
    acknowledgeInformationalDuplicates: boolean;
  },
  options?: { adapter?: CommercialStripeAdapter },
): Promise<StripeCustomerCreatePreview> {
  const gate = assessPhase37JCreateGate({
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
  const adapter = getCommercialStripeAdapter(
    "customer_lookup",
    options?.adapter,
  );
  const account = await adapter.verifyAccount();
  if (account.livemode) {
    throw new CommercialOpsError(
      "Live-mode account rejected.",
      400,
      "live_mode_rejected",
    );
  }

  const evidence = await collectOwnershipEvidence(
    adapter,
    input.clientId,
    profile?.billingContact || clientName,
    profile?.billingEmail ?? null,
  );

  return assessCreateEligibility({
    clientId: input.clientId,
    clientName,
    billingProfileId: profile?.id ?? 0,
    profileCount: profiles.length,
    billingContact: profile?.billingContact ?? null,
    billingEmail: profile?.billingEmail ?? null,
    currentMappedCustomerId: profile?.stripeCustomerId ?? null,
    accountId: account.accountId,
    accountLivemode: account.livemode,
    profileUpdatedAt: profile?.updatedAt ?? null,
    metadataMatches: evidence.metadataMatches.map((c) => ({ id: c.id })),
    informationalMatches: evidence.informational,
    acknowledgeInformationalDuplicates:
      input.acknowledgeInformationalDuplicates,
  });
}

async function persistInternalMapping(input: {
  payload: Awaited<ReturnType<typeof getPayload>>;
  profileId: number;
  clientId: number;
  stripeCustomerId: string;
  accountId: string;
  actor?: string;
  eventType: "commercial.stripe_customer.created" | "commercial.stripe_customer.linked";
  title: string;
  summary: string;
  action: "created" | "recovered";
}): Promise<boolean> {
  const now = new Date().toISOString();
  await input.payload.update({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "billing-profiles" as any,
    id: input.profileId,
    data: {
      stripeCustomerId: input.stripeCustomerId,
      stripeMode: "test",
      stripeAccountId: input.accountId,
      stripeCustomerMappingStatus: "linked",
      stripeCustomerVerifiedAt: now,
      stripeCustomerReconciliationStatus: "linked_healthy",
      stripeCustomerLastReconciledAt: now,
    } as Record<string, unknown>,
    overrideAccess: true,
    depth: 0,
  });

  let activityEmitted = false;
  try {
    await publishActivity({
      eventType: input.eventType,
      title: input.title,
      summary: input.summary,
      clientId: input.clientId,
      sourceModule: "Client Command",
      sourceType: "commercial-stripe-customer-create",
      sourceId: `${input.clientId}:${input.profileId}:${input.action}:${input.stripeCustomerId}`,
      author: input.actor || "operator",
      internalOnly: true,
      dedupe: true,
      category: "finance",
      metadata: {
        action: input.action,
        billingProfileId: input.profileId,
        stripeMode: "test",
        stripeAccountId: input.accountId,
        stripeCustomerId: input.stripeCustomerId,
        reconciliationStatus: "linked_healthy",
      },
    });
    activityEmitted = true;
  } catch {
    console.error("[KXD Stripe Customer Create] Activity publish failed");
  }
  return activityEmitted;
}

export async function applyStripeCustomerCreate(
  input: {
    clientId: number;
    billingProfileId: number;
    previewFingerprint: string;
    acknowledgeInformationalDuplicates: boolean;
    actor?: string;
  },
  options?: { adapter?: CommercialStripeAdapter },
): Promise<StripeCustomerCreateResult> {
  const preview = await previewStripeCustomerCreate(
    {
      clientId: input.clientId,
      acknowledgeInformationalDuplicates:
        input.acknowledgeInformationalDuplicates,
    },
    options,
  );

  if (preview.billingProfileId !== input.billingProfileId) {
    return {
      outcome: "blocked",
      clientId: input.clientId,
      billingProfileId: input.billingProfileId,
      stripeCustomerId: null,
      accountId: null,
      mode: null,
      mappingStatus: null,
      reconciliationStatus: null,
      message: "Billing profile mismatch.",
      blockers: [
        { code: "profile_not_eligible", message: "Billing profile mismatch." },
      ],
      activityEmitted: false,
      stripeCustomerCreated: false,
      stripeCustomerUpdated: false,
    };
  }

  if (preview.previewFingerprint !== input.previewFingerprint) {
    return {
      outcome: "stale",
      clientId: input.clientId,
      billingProfileId: input.billingProfileId,
      stripeCustomerId: null,
      accountId: null,
      mode: null,
      mappingStatus: null,
      reconciliationStatus: null,
      message:
        "This creation preview is out of date. Review a fresh preview and try again.",
      blockers: [{ code: "stale_preview", message: "Stale preview fingerprint." }],
      activityEmitted: false,
      stripeCustomerCreated: false,
      stripeCustomerUpdated: false,
    };
  }

  if (!preview.canCreate) {
    return {
      outcome: "blocked",
      clientId: input.clientId,
      billingProfileId: input.billingProfileId,
      stripeCustomerId: null,
      accountId: preview.accountId,
      mode: "test",
      mappingStatus: null,
      reconciliationStatus: null,
      message: preview.blockers[0]?.message || "Creation blocked.",
      blockers: preview.blockers,
      activityEmitted: false,
      stripeCustomerCreated: false,
      stripeCustomerUpdated: false,
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

  // Already linked to a customer for this profile
  if (profile.stripeCustomerId) {
    return {
      outcome: "unchanged",
      clientId: input.clientId,
      billingProfileId: profile.id,
      stripeCustomerId: profile.stripeCustomerId,
      accountId: preview.accountId,
      mode: "test",
      mappingStatus: "linked",
      reconciliationStatus: "linked_healthy",
      message: "Mapping already present — no customer created.",
      blockers: [],
      activityEmitted: false,
      stripeCustomerCreated: false,
      stripeCustomerUpdated: false,
    };
  }

  const metadata = buildAllowlistedCreateMetadata({
    clientId: input.clientId,
    billingProfileId: profile.id,
    creationIntentVersion: preview.creationIntentVersion,
  });
  const idempotencyKey = deriveStripeCustomerCreateIdempotencyKey({
    clientId: input.clientId,
    billingProfileId: profile.id,
    accountId: preview.accountId,
    mode: "test",
    creationIntentVersion: preview.creationIntentVersion,
  });

  const adapter = getCommercialStripeAdapter(
    "customer_create",
    options?.adapter,
  );

  // Recovery path: existing metadata customer for this client
  const existingMeta = await adapter.searchCustomersByClientMetadata(
    input.clientId,
    5,
  );
  if (existingMeta.length === 1) {
    const recovered = existingMeta[0];
    const ownership = verifyCreatedCustomerOwnership({
      customerId: recovered.id,
      clientId: input.clientId,
      billingProfileId: profile.id,
      creationIntentVersion: preview.creationIntentVersion,
      livemode: recovered.livemode,
      metadata: recovered.metadata,
    });
    // If intent version differs but client/profile match, still allow recovery link
    const softOk =
      !recovered.livemode &&
      !recovered.deleted &&
      recovered.metadata[KXD_STRIPE_CLIENT_METADATA_KEY] ===
        String(input.clientId);
    if (!ownership.ok && !softOk) {
      return {
        outcome: "partial_recovery_required",
        clientId: input.clientId,
        billingProfileId: profile.id,
        stripeCustomerId: recovered.id,
        accountId: preview.accountId,
        mode: "test",
        mappingStatus: "unlinked",
        reconciliationStatus: "requires_operator_review",
        message:
          "An existing metadata customer was found but ownership could not be verified for automatic recovery. Use linking after review.",
        blockers: [
          {
            code: "partial_recovery_required",
            message: ownership.message,
          },
        ],
        activityEmitted: false,
        stripeCustomerCreated: false,
        stripeCustomerUpdated: false,
      };
    }

    const activityEmitted = await persistInternalMapping({
      payload,
      profileId: profile.id,
      clientId: input.clientId,
      stripeCustomerId: recovered.id,
      accountId: preview.accountId,
      actor: input.actor,
      eventType: "commercial.stripe_customer.created",
      title: "Stripe customer recovered and linked (test mode)",
      summary: `Existing test-mode Stripe customer recovered and linked for client ${input.clientId}. No second customer created. Billing not activated.`,
      action: "recovered",
    });

    return {
      outcome: "recovered",
      clientId: input.clientId,
      billingProfileId: profile.id,
      stripeCustomerId: recovered.id,
      accountId: preview.accountId,
      mode: "test",
      mappingStatus: "linked",
      reconciliationStatus: "linked_healthy",
      message:
        "Recovered an existing ownership-matched test customer and linked internally. No duplicate created. Billing not activated.",
      blockers: [],
      activityEmitted,
      stripeCustomerCreated: false,
      stripeCustomerUpdated: false,
    };
  }
  if (existingMeta.length > 1) {
    return {
      outcome: "blocked",
      clientId: input.clientId,
      billingProfileId: profile.id,
      stripeCustomerId: null,
      accountId: preview.accountId,
      mode: "test",
      mappingStatus: null,
      reconciliationStatus: "requires_operator_review",
      message:
        "Multiple Stripe customers claim this client ID. Creation is blocked.",
      blockers: [
        {
          code: "multiple_metadata_customers",
          message: "Multiple metadata matches.",
        },
      ],
      activityEmitted: false,
      stripeCustomerCreated: false,
      stripeCustomerUpdated: false,
    };
  }

  let created;
  try {
    created = await adapter.createCustomer({
      name: preview.payload.name,
      email: preview.payload.email,
      metadata,
      idempotencyKey,
    });
  } catch (err) {
    // Timeout/retry: attempt metadata recovery before failing
    const recoveredAfterFail = await adapter.searchCustomersByClientMetadata(
      input.clientId,
      5,
    );
    if (recoveredAfterFail.length === 1) {
      created = recoveredAfterFail[0];
    } else {
      return {
        outcome: "blocked",
        clientId: input.clientId,
        billingProfileId: profile.id,
        stripeCustomerId: null,
        accountId: preview.accountId,
        mode: "test",
        mappingStatus: null,
        reconciliationStatus: null,
        message: sanitizeStripeError(err),
        blockers: [
          {
            code: "execution_prohibited",
            message: sanitizeStripeError(err),
          },
        ],
        activityEmitted: false,
        stripeCustomerCreated: false,
        stripeCustomerUpdated: false,
      };
    }
  }

  const ownership = verifyCreatedCustomerOwnership({
    customerId: created.id,
    clientId: input.clientId,
    billingProfileId: profile.id,
    creationIntentVersion: preview.creationIntentVersion,
    livemode: created.livemode,
    metadata: created.metadata,
  });
  if (!ownership.ok) {
    return {
      outcome: "partial_recovery_required",
      clientId: input.clientId,
      billingProfileId: profile.id,
      stripeCustomerId: created.id,
      accountId: preview.accountId,
      mode: "test",
      mappingStatus: "unlinked",
      reconciliationStatus: "requires_operator_review",
      message:
        "Stripe customer was created but ownership verification failed before linking. Manual review required — no uncontrolled retry will create another customer for this intent.",
      blockers: [
        {
          code: "partial_recovery_required",
          message: ownership.message,
        },
      ],
      activityEmitted: false,
      stripeCustomerCreated: true,
      stripeCustomerUpdated: false,
    };
  }

  try {
    const activityEmitted = await persistInternalMapping({
      payload,
      profileId: profile.id,
      clientId: input.clientId,
      stripeCustomerId: created.id,
      accountId: preview.accountId,
      actor: input.actor,
      eventType: "commercial.stripe_customer.created",
      title: "Stripe customer created (test mode)",
      summary: `Test-mode Stripe customer created and linked for client ${input.clientId}. No subscription, invoice, or payment. Access unchanged.`,
      action: "created",
    });

    return {
      outcome: "created",
      clientId: input.clientId,
      billingProfileId: profile.id,
      stripeCustomerId: created.id,
      accountId: preview.accountId,
      mode: "test",
      mappingStatus: "linked",
      reconciliationStatus: "linked_healthy",
      message:
        "Stripe test customer created and linked internally. No subscription, invoice, payment, or access change.",
      blockers: [],
      activityEmitted,
      stripeCustomerCreated: true,
      stripeCustomerUpdated: false,
    };
  } catch {
    return {
      outcome: "partial_recovery_required",
      clientId: input.clientId,
      billingProfileId: profile.id,
      stripeCustomerId: created.id,
      accountId: preview.accountId,
      mode: "test",
      mappingStatus: "unlinked",
      reconciliationStatus: "requires_operator_review",
      message:
        "Stripe customer was created but the internal mapping write failed. Retry the same creation intent to recover and link — a second customer will not be created.",
      blockers: [
        {
          code: "partial_recovery_required",
          message: "Internal mapping write failed after Stripe create.",
        },
      ],
      activityEmitted: false,
      stripeCustomerCreated: true,
      stripeCustomerUpdated: false,
    };
  }
}
