/**
 * Phase 37G — Operator-only billing configuration service.
 *
 * Persists only billing-profiles configuration fields.
 * Does not create Stripe objects, change agreements/plans, send email, or collect payment.
 */
import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import { publishActivity } from "@/lib/activity-engine/publish";
import { assignmentFromClientDoc } from "@/lib/client-plans/data";
import { isClientPlanKey } from "@/lib/client-plans/catalog";
import type { ClientPlanStatus } from "@/lib/client-plans/types";
import { isCommercialAgreementId } from "./definitions";
import { CommercialOpsError } from "./ops-service";
import {
  buildBillingConfigurationPreview,
  buildBillingProfilePersistencePayload,
  type BillingConfigurationProfileState,
} from "./billing-configuration-logic";
import type {
  BillingConfigurationEditableInput,
  BillingConfigurationPreview,
  BillingConfigurationResult,
} from "./billing-configuration-types";
import type { BillingReadinessClientState } from "./billing-readiness-logic";
import { buildBillingReadinessSnapshot } from "./billing-readiness-logic";

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string");
}

async function loadBillingConfigurationClientState(
  clientId: number,
): Promise<BillingReadinessClientState> {
  const payload = await getPayload({ config });
  let doc: Record<string, unknown>;
  try {
    doc = (await payload.findByID({
      collection: "clients",
      id: clientId,
      depth: 0,
      overrideAccess: true,
    })) as unknown as Record<string, unknown>;
  } catch {
    throw new CommercialOpsError("Client not found.", 404, "client_not_found");
  }

  const assignment = assignmentFromClientDoc(
    doc as Parameters<typeof assignmentFromClientDoc>[0],
  );
  const rawAgreement = asString(doc.commercialAgreementId);
  const planKey =
    assignment.planKey && isClientPlanKey(assignment.planKey)
      ? assignment.planKey
      : null;
  const planStatus = (assignment.planStatus ??
    asString(doc.planStatus)) as ClientPlanStatus | null;

  return {
    clientId: Number(doc.id),
    clientName: asString(doc.name) ?? `Client ${doc.id}`,
    clientSlug: asString(doc.slug),
    updatedAt: asString(doc.updatedAt),
    commercialAgreementId: isCommercialAgreementId(rawAgreement)
      ? rawAgreement
      : rawAgreement,
    monthlyRetainerAmount: asNumber(doc.monthlyRetainerAmount),
    setupFee: asNumber(doc.setupFee),
    monthlyServiceCredits: asNumber(doc.monthlyServiceCredits),
    commercialAddOns: asStringArray(doc.commercialAddOns),
    commercialNotes: asString(doc.commercialNotes),
    planKey,
    planStatus,
  };
}

async function loadBillingConfigurationProfileState(
  clientId: number,
): Promise<BillingConfigurationProfileState> {
  const payload = await getPayload({ config });
  const result = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "billing-profiles" as any,
    where: { client: { equals: clientId } },
    limit: 5,
    depth: 0,
    overrideAccess: true,
  });

  const docs = result.docs as Array<Record<string, unknown>>;
  if (docs.length === 0) {
    return {
      profilePresent: false,
      profileId: null,
      profileUpdatedAt: null,
      billingContact: null,
      billingEmail: null,
      invoiceCadence: null,
      paymentTerms: null,
      billingStatus: null,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      quickbooksCustomerId: null,
      waveCustomerId: null,
      currencyCode: null,
      collectionMethod: null,
      taxPosture: null,
      duplicateProfiles: false,
    };
  }

  const doc = docs[0];
  return {
    profilePresent: true,
    profileId: typeof doc.id === "number" ? doc.id : Number(doc.id),
    profileUpdatedAt: asString(doc.updatedAt),
    billingContact: asString(doc.billingContact),
    billingEmail: asString(doc.billingEmail),
    invoiceCadence: asString(doc.invoiceCadence),
    paymentTerms: asString(doc.paymentTerms),
    billingStatus: asString(doc.billingStatus),
    stripeCustomerId: asString(doc.stripeCustomerId),
    stripeSubscriptionId: asString(doc.stripeSubscriptionId),
    quickbooksCustomerId: asString(doc.quickbooksCustomerId),
    waveCustomerId: asString(doc.waveCustomerId),
    currencyCode: asString(doc.currencyCode),
    collectionMethod: asString(doc.collectionMethod),
    taxPosture: asString(doc.taxPosture),
    duplicateProfiles: docs.length > 1,
  };
}

/**
 * Preview billing configuration. No persistence, Stripe, or activity.
 */
export async function previewBillingConfiguration(
  clientId: number,
  requested: BillingConfigurationEditableInput,
): Promise<BillingConfigurationPreview> {
  const [state, profile] = await Promise.all([
    loadBillingConfigurationClientState(clientId),
    loadBillingConfigurationProfileState(clientId),
  ]);
  return buildBillingConfigurationPreview(state, profile, requested);
}

/**
 * Apply billing configuration after fingerprint + acknowledgment checks.
 */
export async function applyBillingConfiguration(
  clientId: number,
  input: {
    configuration: BillingConfigurationEditableInput;
    previewFingerprint: string;
    confirmed: boolean;
    configurationDoesNotActivateBilling: boolean;
    actor?: string | null;
  },
): Promise<BillingConfigurationResult> {
  if (!input.confirmed) {
    throw new CommercialOpsError(
      "Explicit confirmation is required before saving billing configuration.",
      400,
      "confirmation_required",
    );
  }
  if (!input.configurationDoesNotActivateBilling) {
    throw new CommercialOpsError(
      "Acknowledge that configuration does not activate billing before confirming.",
      400,
      "confirmation_required",
    );
  }

  const state = await loadBillingConfigurationClientState(clientId);
  const profile = await loadBillingConfigurationProfileState(clientId);
  const preview = buildBillingConfigurationPreview(
    state,
    profile,
    input.configuration,
  );

  if (preview.previewFingerprint !== input.previewFingerprint) {
    throw new CommercialOpsError(
      "This billing-configuration preview is out of date. Review a fresh preview and try again.",
      409,
      "stale_preview",
    );
  }

  if (!preview.canApply) {
    const message =
      preview.blockers[0]?.message ??
      "Billing configuration is blocked for this client.";
    throw new CommercialOpsError(
      message,
      400,
      preview.blockers[0]?.code ?? "inconsistent_state",
    );
  }

  if (preview.operation === "noop") {
    const readiness = buildBillingReadinessSnapshot(state, profile);
    return {
      status: "unchanged",
      message:
        "Billing configuration already matches the proposed values. No changes were made.",
      clientId,
      profileId: profile.profileId ?? 0,
      operation: "noop",
      changedFields: [],
      readiness,
      preview,
    };
  }

  const payload = await getPayload({ config });
  const persistence = buildBillingProfilePersistencePayload(preview.proposed);

  // Preserve existing Stripe / external IDs — never clear or invent them.
  const data: Record<string, unknown> = {
    client: clientId,
    ...persistence,
  };

  let profileId: number;
  try {
    if (profile.profilePresent && profile.profileId != null) {
      const updated = await payload.update({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        collection: "billing-profiles" as any,
        id: profile.profileId,
        data,
        overrideAccess: true,
      });
      profileId = Number((updated as { id: number }).id);
    } else {
      const created = await payload.create({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        collection: "billing-profiles" as any,
        data,
        overrideAccess: true,
      });
      profileId = Number((created as { id: number }).id);
    }
  } catch {
    console.error("[KXD Billing Configuration] Persistence failed:", {
      clientId,
    });
    throw new CommercialOpsError(
      "Unable to save billing configuration.",
      500,
      "persistence_failed",
    );
  }

  const afterState = await loadBillingConfigurationClientState(clientId);
  if (
    afterState.commercialAgreementId !== state.commercialAgreementId ||
    afterState.monthlyRetainerAmount !== state.monthlyRetainerAmount ||
    afterState.setupFee !== state.setupFee ||
    afterState.monthlyServiceCredits !== state.monthlyServiceCredits ||
    afterState.planKey !== state.planKey ||
    afterState.planStatus !== state.planStatus
  ) {
    console.error(
      "[KXD Billing Configuration] Agreement or plan changed unexpectedly",
      { clientId },
    );
    throw new CommercialOpsError(
      "Billing configuration unexpectedly affected commercial or access state. Review required.",
      500,
      "inconsistent_state",
    );
  }

  const afterProfile = await loadBillingConfigurationProfileState(clientId);
  if (
    (profile.stripeCustomerId || null) !==
      (afterProfile.stripeCustomerId || null) ||
    (profile.stripeSubscriptionId || null) !==
      (afterProfile.stripeSubscriptionId || null)
  ) {
    console.error(
      "[KXD Billing Configuration] External Stripe IDs changed unexpectedly",
      { clientId },
    );
    throw new CommercialOpsError(
      "Billing configuration unexpectedly affected external Stripe identifiers. Review required.",
      500,
      "inconsistent_state",
    );
  }

  const readiness = buildBillingReadinessSnapshot(afterState, afterProfile);
  const refreshed = buildBillingConfigurationPreview(
    afterState,
    afterProfile,
    preview.proposed,
  );

  const actor =
    typeof input.actor === "string" && input.actor.trim()
      ? input.actor.trim()
      : "KXD Operator";
  const eventType =
    preview.operation === "create"
      ? "commercial.billing_configuration.created"
      : "commercial.billing_configuration.changed";
  const title =
    preview.operation === "create"
      ? "Billing configuration created"
      : "Billing configuration changed";

  try {
    await publishActivity({
      eventType,
      title,
      summary: `${title} for ${state.clientName}. Commercial terms, access, and Stripe were not changed. No invoice, subscription, charge, or email was created.`,
      clientId,
      sourceModule: "Client Command",
      sourceType: "commercial-billing-configuration",
      sourceId: `${clientId}:${preview.previewFingerprint}`,
      author: actor,
      internalOnly: true,
      dedupe: true,
      category: "finance",
      metadata: {
        operation: preview.operation,
        changedFields: preview.changedFields.map((row) => row.field),
        currencyCode: preview.proposed.currencyCode,
        collectionMethod: preview.proposed.collectionMethod,
        taxPosture: preview.proposed.taxPosture,
        readiness: readiness.readiness,
      },
    });
  } catch (err) {
    console.error("[KXD Billing Configuration] Activity publish failed:", err);
  }

  return {
    status: preview.operation === "create" ? "created" : "changed",
    message:
      preview.operation === "create"
        ? "Billing configuration saved. No billing action was performed."
        : "Billing configuration updated. No billing action was performed.",
    clientId,
    profileId,
    operation: preview.operation,
    changedFields: preview.changedFields,
    readiness,
    preview: refreshed,
  };
}
