/**
 * Phase 37C — Operator-only modern plan-change service.
 *
 * Reuses canonical `updateClientPlanAssignment`. Does not send email, connect
 * providers, mutate infrastructure, or change commercial terms.
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
import type { ActivationClientState } from "./activation-logic";
import { buildPlanChangePreview } from "./plan-change-logic";
import type {
  PlanChangePreview,
  PlanChangeResult,
} from "./plan-change-types";

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

async function loadLegacyEnabledModules(clientId: number): Promise<string[]> {
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

async function loadPlanChangeClientState(
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

export async function previewCommercialPlanChange(
  clientId: number,
): Promise<PlanChangePreview> {
  const state = await loadPlanChangeClientState(clientId);
  return buildPlanChangePreview(state);
}

export async function changeCommercialPlan(
  clientId: number,
  input: {
    previewFingerprint: string;
    confirmed: boolean;
    removalsAcknowledged: boolean;
    actor?: string | null;
  },
): Promise<PlanChangeResult> {
  if (!input.confirmed) {
    throw new CommercialOpsError(
      "Explicit confirmation is required before changing the plan.",
      400,
      "confirmation_required",
    );
  }

  const state = await loadPlanChangeClientState(clientId);
  const preview = buildPlanChangePreview(state);

  if (preview.previewFingerprint !== input.previewFingerprint) {
    throw new CommercialOpsError(
      "This plan-change preview is out of date. Review a fresh preview and try again.",
      409,
      "stale_preview",
    );
  }

  if (preview.alreadyAligned && preview.proposedPlanKey) {
    return {
      status: "aligned",
      message: "Client plan already matches the recorded agreement. No changes were made.",
      clientId,
      agreementId: preview.agreementId,
      classification: "aligned",
      previousPlanKey: state.planKey,
      previousPlanStatus: state.planStatus,
      newPlanKey: preview.proposedPlanKey,
      newPlanStatus: state.planStatus,
      capabilityChanges: preview.capabilityChanges,
      preview,
    };
  }

  if (!preview.canChange || !preview.proposedPlanKey || !preview.proposedPlanStatus) {
    const message =
      preview.blockers[0]?.message ?? "Plan change is blocked for this client.";
    throw new CommercialOpsError(
      message,
      400,
      preview.blockers[0]?.code ?? "inconsistent_state",
    );
  }

  // Removals recomputed server-side — never trust browser claim
  if (preview.hasRemovals && input.removalsAcknowledged !== true) {
    throw new CommercialOpsError(
      "Acknowledge that listed modules will no longer be included before confirming this plan change.",
      400,
      "removal_acknowledgment_required",
    );
  }

  const proposedPlanKey = preview.proposedPlanKey;
  if (!isClientPlanKey(proposedPlanKey) || proposedPlanKey === "custom") {
    throw new CommercialOpsError(
      "Proposed plan is not valid for automated plan change.",
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

  const nextStatus: ClientPlanStatus =
    preview.proposedPlanStatus === "trial" ? "trial" : "active";

  // Canonical provisioning — plan fields + CES sync. Empty overrides (baseline).
  const resolved = await updateClientPlanAssignment(
    clientId,
    {
      planKey: proposedPlanKey,
      planStatus: nextStatus,
      planEffectiveAt: new Date().toISOString(),
      addOnModules: [],
      removedModules: [],
      planNote: null,
    },
    { actor },
  );

  const after = await loadPlanChangeClientState(clientId);
  if (
    after.commercialAgreementId !== state.commercialAgreementId ||
    after.monthlyRetainerAmount !== state.monthlyRetainerAmount ||
    after.setupFee !== state.setupFee ||
    after.monthlyServiceCredits !== state.monthlyServiceCredits
  ) {
    console.error(
      "[KXD Commercial Plan Change] Commercial fields changed unexpectedly",
      { clientId },
    );
    throw new CommercialOpsError(
      "Plan change unexpectedly affected commercial terms. Review required.",
      500,
      "plan_integrity",
    );
  }

  const capabilityChanges = preview.capabilityChanges;
  const newPlanKey = resolved.planKey as ClientPlanKey | null;
  const newPlanStatus = resolved.planStatus as ClientPlanStatus;

  try {
    await publishActivity({
      eventType: "commercial.plan.changed",
      title: `Plan ${preview.classificationLabel?.toLowerCase() ?? "changed"} · ${preview.proposedPlanLabel ?? proposedPlanKey}`,
      summary: `Changed plan from ${preview.currentPlanLabel ?? previousPlanKey ?? "none"} to ${preview.proposedPlanLabel ?? proposedPlanKey}. Billing, providers, and infrastructure were not changed.`,
      clientId,
      sourceModule: "Client Command",
      sourceType: "commercial-plan-change",
      sourceId: `${clientId}:${previousPlanKey ?? "none"}:${proposedPlanKey}`,
      author: actor,
      internalOnly: true,
      dedupe: true,
      metadata: {
        commercialAgreementId: preview.agreementId,
        classification: preview.classification,
        previousPlanKey,
        previousPlanStatus,
        newPlanKey,
        newPlanStatus,
        modulesAdded: capabilityChanges
          .filter((row) => row.kind === "added")
          .map((row) => row.key),
        modulesRemoved: capabilityChanges
          .filter((row) => row.kind === "removed")
          .map((row) => row.key),
        modulesUnchangedCount: capabilityChanges.filter(
          (row) => row.kind === "unchanged",
        ).length,
      },
    });
  } catch (err) {
    console.error("[KXD Commercial Plan Change] Activity publish failed:", err);
  }

  const refreshed = buildPlanChangePreview(after);

  return {
    status: "changed",
    message: `${preview.classificationLabel ?? "Plan change"} complete. Client access now follows ${preview.proposedPlanLabel ?? proposedPlanKey}.`,
    clientId,
    agreementId: preview.agreementId,
    classification: preview.classification,
    previousPlanKey,
    previousPlanStatus,
    newPlanKey,
    newPlanStatus,
    capabilityChanges,
    preview: refreshed,
  };
}
