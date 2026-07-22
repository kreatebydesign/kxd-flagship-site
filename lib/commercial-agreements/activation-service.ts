/**
 * Phase 37B — Operator-only commercial agreement activation service.
 *
 * Reuses canonical `assignPlanOnClientCreate` / `updateClientPlanAssignment`.
 * Does not send email, connect providers, mutate infrastructure, or change
 * commercial terms. Preview fingerprints protect against stale activation.
 */
import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import { publishActivity } from "@/lib/activity-engine/publish";
import {
  assignPlanOnClientCreate,
} from "@/lib/client-plans/update";
import { assignmentFromClientDoc } from "@/lib/client-plans/data";
import { resolveEntitlementsFromAssignment } from "@/lib/client-plans/resolve";
import { isClientPlanKey } from "@/lib/client-plans/catalog";
import type { ClientPlanKey, ClientPlanStatus } from "@/lib/client-plans/types";
import { isCommercialAgreementId } from "./definitions";
import { CommercialOpsError } from "./ops-service";
import {
  buildActivationPreview,
  type ActivationClientState,
} from "./activation-logic";
import type {
  ActivationPreview,
  ActivationResult,
} from "./activation-types";

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

async function loadLegacyEnabledModules(
  clientId: number,
): Promise<string[]> {
  const payload = await getPayload({ config });
  const result = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "client-experience-profiles" as any,
    where: { client: { equals: clientId } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  const doc = result.docs[0] as { enabledModules?: unknown } | undefined;
  return asStringArray(doc?.enabledModules);
}

async function loadActivationClientState(
  clientId: number,
): Promise<ActivationClientState> {
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
  const legacyEnabledModules = await loadLegacyEnabledModules(clientId);
  const resolved = resolveEntitlementsFromAssignment({
    clientId,
    assignment,
    legacyEnabledModules,
  });

  const rawAgreement = asString(doc.commercialAgreementId);

  return {
    clientId: Number(doc.id),
    clientName: asString(doc.name) ?? `Client ${doc.id}`,
    updatedAt: asString(doc.updatedAt),
    commercialAgreementId: isCommercialAgreementId(rawAgreement)
      ? rawAgreement
      : null,
    monthlyRetainerAmount: asNumber(doc.monthlyRetainerAmount),
    setupFee: asNumber(doc.setupFee),
    monthlyServiceCredits: asNumber(doc.monthlyServiceCredits),
    commercialAddOns: asStringArray(doc.commercialAddOns),
    planKey: assignment.planKey,
    planStatus: assignment.planStatus,
    addOnModules: [...assignment.addOnModules],
    removedModules: [...assignment.removedModules],
    currentEffectiveModules: [...resolved.effectiveModules],
  };
}

/**
 * Generate a fresh server-side activation preview from current client state
 * and canonical plan definitions. Never trusts browser-supplied plan data.
 */
export async function previewCommercialAgreementActivation(
  clientId: number,
): Promise<ActivationPreview> {
  const state = await loadActivationClientState(clientId);
  return buildActivationPreview(state);
}

/**
 * Apply activation after revalidating eligibility and preview fingerprint.
 * Uses canonical plan assignment only — no billing, email, or provider side effects.
 */
export async function activateCommercialAgreement(
  clientId: number,
  input: {
    previewFingerprint: string;
    confirmed: boolean;
    actor?: string | null;
  },
): Promise<ActivationResult> {
  if (!input.confirmed) {
    throw new CommercialOpsError(
      "Explicit confirmation is required before activation.",
      400,
      "confirmation_required",
    );
  }

  const state = await loadActivationClientState(clientId);
  const preview = buildActivationPreview(state);

  if (preview.previewFingerprint !== input.previewFingerprint) {
    throw new CommercialOpsError(
      "This activation preview is out of date. Review a fresh preview and try again.",
      409,
      "stale_preview",
    );
  }

  if (preview.alreadyActive && preview.proposedPlanKey) {
    return {
      status: "already_active",
      message: "Client is already active on this plan. No changes were made.",
      clientId,
      agreementId: preview.agreementId,
      previousPlanKey: state.planKey,
      previousPlanStatus: state.planStatus,
      activatedPlanKey: preview.proposedPlanKey,
      activatedPlanStatus: (state.planStatus as ClientPlanStatus) ?? "active",
      capabilityChanges: preview.capabilityChanges,
      preview,
    };
  }

  if (!preview.canActivate || !preview.proposedPlanKey) {
    const message =
      preview.blockers[0]?.message ??
      "Activation is blocked for this client.";
    throw new CommercialOpsError(
      message,
      400,
      preview.blockers[0]?.code ?? "inconsistent_state",
    );
  }

  const proposedPlanKey = preview.proposedPlanKey;
  if (!isClientPlanKey(proposedPlanKey) || proposedPlanKey === "custom") {
    throw new CommercialOpsError(
      "Proposed plan is not valid for automated activation.",
      400,
      "custom_legacy_manual",
    );
  }

  const previousPlanKey = state.planKey;
  const previousPlanStatus = state.planStatus;
  const actor =
    typeof input.actor === "string" && input.actor.trim()
      ? input.actor.trim()
      : "KXD Operator";

  // Canonical provisioning path — plan fields + CES sync only.
  const resolved = await assignPlanOnClientCreate(clientId, {
    planKey: proposedPlanKey,
    addOnModules: [],
    removedModules: [],
    actor,
  });

  // Reload commercial fields to confirm they were not mutated
  const after = await loadActivationClientState(clientId);
  if (
    after.commercialAgreementId !== state.commercialAgreementId ||
    after.monthlyRetainerAmount !== state.monthlyRetainerAmount ||
    after.setupFee !== state.setupFee ||
    after.monthlyServiceCredits !== state.monthlyServiceCredits
  ) {
    console.error(
      "[KXD Commercial Activation] Commercial fields changed unexpectedly",
      { clientId },
    );
    throw new CommercialOpsError(
      "Activation unexpectedly affected commercial terms. Review required.",
      500,
      "plan_integrity",
    );
  }

  const capabilityChanges = preview.capabilityChanges;
  const activatedPlanKey = resolved.planKey as ClientPlanKey | null;
  const activatedPlanStatus = resolved.planStatus as ClientPlanStatus;

  try {
    await publishActivity({
      eventType: "commercial.plan.activated",
      title: `Plan activated · ${preview.agreementName ?? proposedPlanKey}`,
      summary: `Activated ${preview.proposedPlanLabel ?? proposedPlanKey} from recorded commercial agreement. Billing, providers, and infrastructure were not changed.`,
      clientId,
      sourceModule: "Client Command",
      sourceType: "commercial-activation",
      sourceId: clientId,
      author: actor,
      internalOnly: true,
      dedupe: true,
      metadata: {
        commercialAgreementId: preview.agreementId,
        previousPlanKey,
        previousPlanStatus,
        activatedPlanKey,
        activatedPlanStatus,
        modulesAdded: capabilityChanges
          .filter((row) => row.kind === "added")
          .map((row) => row.key),
        modulesRemoved: capabilityChanges
          .filter((row) => row.kind === "removed")
          .map((row) => row.key),
      },
    });
  } catch (err) {
    console.error("[KXD Commercial Activation] Activity publish failed:", err);
  }

  const refreshed = buildActivationPreview(after);

  return {
    status: "activated",
    message: `Activated ${preview.proposedPlanLabel ?? proposedPlanKey}. Client access now follows this plan.`,
    clientId,
    agreementId: preview.agreementId,
    previousPlanKey,
    previousPlanStatus,
    activatedPlanKey,
    activatedPlanStatus,
    capabilityChanges,
    preview: refreshed,
  };
}
