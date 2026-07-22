/**
 * Phase 37E — Operator-only custom plan construction service.
 *
 * Representation: planKey "custom" + selected modules as planAddOnModules.
 * Uses updateClientPlanAssignment / assignPlanOnClientCreate. Does not mutate
 * commercial terms, billing, providers, or infrastructure.
 */
import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import { publishActivity } from "@/lib/activity-engine/publish";
import { assignmentFromClientDoc } from "@/lib/client-plans/data";
import { resolveEntitlementsFromAssignment } from "@/lib/client-plans/resolve";
import { updateClientPlanAssignment } from "@/lib/client-plans/update";
import type { ClientPlanKey, ClientPlanStatus } from "@/lib/client-plans/types";
import { isCommercialAgreementId } from "./definitions";
import { CommercialOpsError } from "./ops-service";
import {
  buildCustomPlanPreview,
  type CustomPlanClientState,
} from "./custom-plan-logic";
import type {
  CustomPlanPreview,
  CustomPlanResult,
} from "./custom-plan-types";

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

function setsEqual(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  const left = [...a].sort();
  const right = [...b].sort();
  return left.every((v, i) => v === right[i]);
}

async function loadRawCesModules(clientId: number): Promise<string[]> {
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

async function loadCustomPlanClientState(
  clientId: number,
): Promise<CustomPlanClientState> {
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
  const rawCesModules = await loadRawCesModules(clientId);
  const resolved = resolveEntitlementsFromAssignment({
    clientId,
    assignment,
    legacyEnabledModules: rawCesModules,
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
    rawCesModules,
  };
}

export async function previewCustomPlan(
  clientId: number,
  requestedModules?: string[] | null,
): Promise<CustomPlanPreview> {
  const state = await loadCustomPlanClientState(clientId);
  return buildCustomPlanPreview(state, requestedModules ?? null);
}

export async function applyCustomPlan(
  clientId: number,
  input: {
    previewFingerprint: string;
    confirmed: boolean;
    removalsAcknowledged: boolean;
    requestedModules: string[];
    actor?: string | null;
  },
): Promise<CustomPlanResult> {
  if (!input.confirmed) {
    throw new CommercialOpsError(
      "Explicit confirmation is required before applying a custom plan.",
      400,
      "confirmation_required",
    );
  }

  const state = await loadCustomPlanClientState(clientId);
  const preview = buildCustomPlanPreview(state, input.requestedModules);

  if (preview.previewFingerprint !== input.previewFingerprint) {
    throw new CommercialOpsError(
      "This custom-plan preview is out of date. Refresh the review and try again.",
      409,
      "stale_preview",
    );
  }

  if (preview.alreadyAligned && preview.proposedPlanKey) {
    return {
      status: "aligned",
      message:
        "Proposed custom access already matches the current assignment. No changes were made.",
      clientId,
      agreementId: preview.agreementId,
      previousPlanKey: state.planKey,
      previousPlanStatus: state.planStatus,
      newPlanKey: preview.proposedPlanKey,
      newPlanStatus: state.planStatus,
      addedModules: [],
      removedModules: [],
      capabilityChanges: preview.capabilityChanges,
      preview,
    };
  }

  if (!preview.canApply || !preview.proposedPlanKey) {
    const message =
      preview.blockers[0]?.message ??
      "Custom plan construction is blocked for this client.";
    throw new CommercialOpsError(
      message,
      400,
      preview.blockers[0]?.code ?? "inconsistent_state",
    );
  }

  if (preview.hasRemovals && !input.removalsAcknowledged) {
    throw new CommercialOpsError(
      "Removal acknowledgment is required when modules will no longer be included.",
      400,
      "removal_acknowledgment_required",
    );
  }

  const previousPlanKey = state.planKey;
  const previousPlanStatus = state.planStatus;
  const wasFirstCustomActivation =
    previousPlanKey !== "custom" ||
    (previousPlanStatus !== "active" && previousPlanStatus !== "trial");
  const actor =
    typeof input.actor === "string" && input.actor.trim()
      ? input.actor.trim()
      : "KXD Operator";

  const addOnModules = [...preview.proposedAddOnModules];
  const proposedStatus = preview.proposedPlanStatus ?? "active";

  // Canonical provisioning path — plan fields + CES sync only.
  const resolved = await updateClientPlanAssignment(
    clientId,
    {
      planKey: "custom",
      planStatus: proposedStatus,
      planEffectiveAt: new Date().toISOString(),
      addOnModules,
      removedModules: [],
      planNote: null,
    },
    { actor },
  );

  const after = await loadCustomPlanClientState(clientId);
  if (
    after.commercialAgreementId !== state.commercialAgreementId ||
    after.monthlyRetainerAmount !== state.monthlyRetainerAmount ||
    after.setupFee !== state.setupFee ||
    after.monthlyServiceCredits !== state.monthlyServiceCredits
  ) {
    console.error(
      "[KXD Custom Plan] Commercial fields changed unexpectedly",
      { clientId },
    );
    throw new CommercialOpsError(
      "Custom plan unexpectedly affected commercial terms. Review required.",
      500,
      "plan_integrity",
    );
  }

  if (!setsEqual(after.currentEffectiveModules, preview.proposedEffectiveModules.map((m) => m.key))) {
    console.error("[KXD Custom Plan] Effective modules mismatch after apply", {
      clientId,
      expected: preview.proposedEffectiveModules.map((m) => m.key),
      actual: after.currentEffectiveModules,
    });
    throw new CommercialOpsError(
      "Custom plan failed effective-access verification after persistence.",
      500,
      "plan_integrity",
    );
  }

  if (after.planKey !== "custom") {
    throw new CommercialOpsError(
      "Custom plan failed plan-key verification after persistence.",
      500,
      "plan_integrity",
    );
  }

  const newPlanKey = (after.planKey ?? resolved.planKey) as ClientPlanKey | null;
  const newPlanStatus = after.planStatus as ClientPlanStatus;
  const addedModules = preview.addedModules.map((row) => row.key);
  const removedModules = preview.removedModules.map((row) => row.key);
  const eventType = wasFirstCustomActivation
    ? "commercial.custom_plan.activated"
    : "commercial.custom_plan.changed";
  const status: CustomPlanResult["status"] = wasFirstCustomActivation
    ? "activated"
    : "changed";

  try {
    await publishActivity({
      eventType,
      title: wasFirstCustomActivation
        ? `Custom plan activated · ${preview.clientName}`
        : `Custom plan changed · ${preview.clientName}`,
      summary: wasFirstCustomActivation
        ? `Activated custom access with ${addedModules.length} newly included module(s). Billing, providers, and infrastructure were not changed.`
        : `Revised custom access (${addedModules.length} added, ${removedModules.length} no longer included). Billing, providers, and infrastructure were not changed.`,
      clientId,
      sourceModule: "Client Command",
      sourceType: "commercial-custom-plan",
      sourceId: `${clientId}:custom:${preview.previewFingerprint}`,
      author: actor,
      internalOnly: true,
      dedupe: true,
      metadata: {
        commercialAgreementId: preview.agreementId,
        previousPlanKey,
        previousPlanStatus,
        newPlanKey,
        newPlanStatus,
        previousClassification:
          previousPlanKey === "custom"
            ? "custom"
            : previousPlanKey == null
              ? "legacy"
              : "standard",
        resultingClassification: "custom",
        addedModules,
        removedModules,
        unchangedCount: preview.unchangedModules.length,
      },
    });
  } catch (err) {
    console.error("[KXD Custom Plan] Activity publish failed:", err);
  }

  const refreshed = buildCustomPlanPreview(after, input.requestedModules);

  return {
    status,
    message: wasFirstCustomActivation
      ? "Custom plan activated. Access updated; commercial terms and systems unchanged."
      : "Custom plan updated. Access revised; commercial terms and systems unchanged.",
    clientId,
    agreementId: preview.agreementId,
    previousPlanKey,
    previousPlanStatus,
    newPlanKey,
    newPlanStatus,
    addedModules,
    removedModules,
    capabilityChanges: preview.capabilityChanges,
    preview: refreshed,
  };
}
