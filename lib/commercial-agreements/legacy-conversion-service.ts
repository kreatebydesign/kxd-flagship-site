/**
 * Phase 37D — Operator-only legacy-to-modern conversion service.
 *
 * Preserves current CES access via canonical plan add-ons. Uses
 * `updateClientPlanAssignment`. Does not reduce access, delete module data,
 * or mutate commercial terms / providers / infrastructure.
 */
import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import { publishActivity } from "@/lib/activity-engine/publish";
import { assignmentFromClientDoc } from "@/lib/client-plans/data";
import { resolveEntitlementsFromAssignment } from "@/lib/client-plans/resolve";
import { isClientPlanKey } from "@/lib/client-plans/catalog";
import { updateClientPlanAssignment } from "@/lib/client-plans/update";
import type { ClientPlanKey, ClientPlanStatus } from "@/lib/client-plans/types";
import { isCommercialAgreementId } from "./definitions";
import { CommercialOpsError } from "./ops-service";
import {
  buildLegacyConversionPreview,
  type LegacyConversionClientState,
} from "./legacy-conversion-logic";
import type {
  LegacyConversionPreview,
  LegacyConversionResult,
} from "./legacy-conversion-types";

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

async function loadLegacyConversionClientState(
  clientId: number,
): Promise<LegacyConversionClientState> {
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

export async function previewLegacyConversion(
  clientId: number,
): Promise<LegacyConversionPreview> {
  const state = await loadLegacyConversionClientState(clientId);
  return buildLegacyConversionPreview(state);
}

export async function convertLegacyClient(
  clientId: number,
  input: {
    previewFingerprint: string;
    confirmed: boolean;
    actor?: string | null;
  },
): Promise<LegacyConversionResult> {
  if (!input.confirmed) {
    throw new CommercialOpsError(
      "Explicit confirmation is required before legacy conversion.",
      400,
      "confirmation_required",
    );
  }

  const state = await loadLegacyConversionClientState(clientId);
  const preview = buildLegacyConversionPreview(state);

  if (preview.previewFingerprint !== input.previewFingerprint) {
    throw new CommercialOpsError(
      "This legacy-conversion preview is out of date. Review a fresh preview and try again.",
      409,
      "stale_preview",
    );
  }

  if (preview.alreadyConverted && preview.proposedPlanKey) {
    return {
      status: "already_converted",
      message:
        "Client is already on a modern plan matching the recorded agreement. No changes were made.",
      clientId,
      agreementId: preview.agreementId,
      previousPlanKey: state.planKey,
      previousPlanStatus: state.planStatus,
      newPlanKey: preview.proposedPlanKey,
      newPlanStatus: state.planStatus,
      preservedAddOnModules: preview.proposedAddOnModules,
      newlyIncludedModules: preview.newlyIncluded.map((row) => row.key),
      capabilityChanges: preview.capabilityChanges,
      preview,
    };
  }

  if (!preview.canConvert || !preview.proposedPlanKey || !preview.noAccessLoss) {
    const message =
      preview.blockers[0]?.message ??
      "Legacy conversion is blocked for this client.";
    throw new CommercialOpsError(
      message,
      400,
      preview.blockers[0]?.code ?? "inconsistent_state",
    );
  }

  // Server-side reaffirmation: never convert with access loss
  if (!preview.noAccessLoss || preview.proposedRemovedModules.length > 0) {
    throw new CommercialOpsError(
      "Legacy conversion cannot remove current access.",
      400,
      "access_loss",
    );
  }

  const proposedPlanKey = preview.proposedPlanKey;
  if (!isClientPlanKey(proposedPlanKey) || proposedPlanKey === "custom") {
    throw new CommercialOpsError(
      "Proposed plan is not valid for automated legacy conversion.",
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

  const preservedAddOns = [...preview.proposedAddOnModules];

  const resolved = await updateClientPlanAssignment(
    clientId,
    {
      planKey: proposedPlanKey,
      planStatus: "active",
      planEffectiveAt: new Date().toISOString(),
      addOnModules: preservedAddOns,
      removedModules: [],
      planNote: null,
    },
    { actor },
  );

  const after = await loadLegacyConversionClientState(clientId);
  if (
    after.commercialAgreementId !== state.commercialAgreementId ||
    after.monthlyRetainerAmount !== state.monthlyRetainerAmount ||
    after.setupFee !== state.setupFee ||
    after.monthlyServiceCredits !== state.monthlyServiceCredits
  ) {
    console.error(
      "[KXD Legacy Conversion] Commercial fields changed unexpectedly",
      { clientId },
    );
    throw new CommercialOpsError(
      "Legacy conversion unexpectedly affected commercial terms. Review required.",
      500,
      "plan_integrity",
    );
  }

  // Verify no access loss after persistence
  for (const moduleKey of state.currentEffectiveModules) {
    if (!after.currentEffectiveModules.includes(moduleKey)) {
      console.error(
        "[KXD Legacy Conversion] Access loss detected after conversion",
        { clientId, moduleKey },
      );
      throw new CommercialOpsError(
        `Conversion failed access verification for module “${moduleKey}”.`,
        500,
        "access_loss",
      );
    }
  }

  const newPlanKey = resolved.planKey as ClientPlanKey | null;
  const newPlanStatus = resolved.planStatus as ClientPlanStatus;
  const newlyIncluded = preview.newlyIncluded.map((row) => row.key);

  try {
    await publishActivity({
      eventType: "commercial.legacy.converted",
      title: `Legacy converted · ${preview.proposedPlanLabel ?? proposedPlanKey}`,
      summary: `Converted legacy access to ${preview.proposedPlanLabel ?? proposedPlanKey} with preserved modules. Billing, providers, and infrastructure were not changed.`,
      clientId,
      sourceModule: "Client Command",
      sourceType: "commercial-legacy-conversion",
      sourceId: `${clientId}:${proposedPlanKey}`,
      author: actor,
      internalOnly: true,
      dedupe: true,
      metadata: {
        commercialAgreementId: preview.agreementId,
        previousPlanKey,
        previousPlanStatus,
        newPlanKey,
        newPlanStatus,
        baselineModuleCount: preview.targetBaselineModules.length,
        preservedAddOns,
        newlyIncluded,
      },
    });
  } catch (err) {
    console.error("[KXD Legacy Conversion] Activity publish failed:", err);
  }

  const refreshed = buildLegacyConversionPreview(after);

  return {
    status: "converted",
    message: `Converted to ${preview.proposedPlanLabel ?? proposedPlanKey}. Current access was preserved.`,
    clientId,
    agreementId: preview.agreementId,
    previousPlanKey,
    previousPlanStatus,
    newPlanKey,
    newPlanStatus,
    preservedAddOnModules: preservedAddOns,
    newlyIncludedModules: newlyIncluded,
    capabilityChanges: preview.capabilityChanges,
    preview: refreshed,
  };
}
