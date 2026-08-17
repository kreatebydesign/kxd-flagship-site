/**
 * Start commercial → Launch Wizard handoff (operator-gated).
 * Creates or reuses a draft; never provisions the client until Launch Wizard confirm.
 */

import "server-only";

import type { Payload } from "payload";
import { LAUNCH_WIZARD_ROUTE_BASE } from "@/lib/client-launch-wizard/constants";
import {
  createLaunchDraft,
  getLaunchDraft,
  listOpenLaunchDrafts,
  mapLaunchDraftDoc,
} from "@/lib/client-launch-wizard/server";
import { normalizeLifecyclePackage } from "@/lib/proposal-lifecycle/package";
import type { ContractLifecyclePackage } from "@/lib/proposal-lifecycle/types";
import { buildLaunchPrefillFromContract } from "./prefill";
import type {
  CommercialLaunchHandoffState,
  StartCommercialLaunchHandoffResult,
} from "./types";

const CONTRACTS = "contracts";
const DRAFTS = "client-launch-drafts";

function readHandoffState(
  pkg: ContractLifecyclePackage,
): CommercialLaunchHandoffState {
  const raw = (pkg as ContractLifecyclePackage & {
    launchHandoff?: CommercialLaunchHandoffState;
  }).launchHandoff;
  if (!raw || typeof raw !== "object") {
    return {
      draftId: null,
      launchedClientId: null,
      launchedAt: null,
      invitationIds: [],
    };
  }
  return {
    draftId: raw.draftId ?? null,
    launchedClientId:
      typeof raw.launchedClientId === "number" ? raw.launchedClientId : null,
    launchedAt: raw.launchedAt ?? null,
    invitationIds: Array.isArray(raw.invitationIds)
      ? raw.invitationIds.filter((id): id is number => typeof id === "number")
      : [],
    lastInvitationOutcomes: raw.lastInvitationOutcomes,
  };
}

async function persistHandoffState(
  payload: Payload,
  contractId: number,
  pkg: ContractLifecyclePackage,
  next: CommercialLaunchHandoffState,
): Promise<void> {
  const updated: ContractLifecyclePackage & {
    launchHandoff: CommercialLaunchHandoffState;
  } = {
    ...pkg,
    launchHandoff: next,
  };
  await payload.update({
    collection: CONTRACTS as never,
    id: contractId,
    data: { lifecyclePackage: updated } as never,
    overrideAccess: true,
  });
}

async function findOpenDraftForContract(
  payload: Payload,
  contractId: number,
): Promise<ReturnType<typeof mapLaunchDraftDoc> | null> {
  const open = await listOpenLaunchDrafts(payload);
  for (const draft of open) {
    const handoff = draft.payload.commercialHandoff;
    if (handoff?.contractId === contractId) return draft;
  }
  return null;
}

export async function startCommercialLaunchHandoff(input: {
  payload: Payload;
  contractId: number;
  createdBy: string;
}): Promise<StartCommercialLaunchHandoffResult> {
  const contractId = input.contractId;
  if (!Number.isFinite(contractId) || contractId <= 0) {
    return { ok: false, code: "invalid-contract", message: "Invalid contract id." };
  }

  let contractDoc: Record<string, unknown>;
  try {
    contractDoc = (await input.payload.findByID({
      collection: CONTRACTS as never,
      id: contractId,
      depth: 0,
      overrideAccess: true,
    })) as Record<string, unknown>;
  } catch {
    return { ok: false, code: "not-found", message: "Contract not found." };
  }

  const pkg = normalizeLifecyclePackage(contractDoc.lifecyclePackage);
  const handoffState = readHandoffState(pkg);

  if (handoffState.launchedClientId != null) {
    return {
      ok: true,
      draftId: handoffState.draftId ?? "launched",
      launchWizardUrl: `/admin/operations/client-command/${handoffState.launchedClientId}`,
      reusedExistingDraft: true,
      alreadyLaunched: true,
      launchedClientId: handoffState.launchedClientId,
      prefill: (await buildLaunchPrefillFromContract(contractId)).payload,
      warnings: [
        `Client #${handoffState.launchedClientId} was already launched from this agreement.`,
      ],
    };
  }

  if (!pkg.onboardingEligible) {
    return {
      ok: false,
      code: "not-eligible",
      message:
        "This agreement is not onboarding-eligible yet. Complete modern commercial execution first.",
    };
  }

  if (handoffState.draftId != null) {
    const existing = await getLaunchDraft(input.payload, handoffState.draftId);
    if (
      existing &&
      (existing.status === "draft" ||
        existing.status === "ready" ||
        existing.status === "failed")
    ) {
      return {
        ok: true,
        draftId: existing.id,
        launchWizardUrl: `${LAUNCH_WIZARD_ROUTE_BASE}/${existing.id}`,
        reusedExistingDraft: true,
        alreadyLaunched: false,
        launchedClientId: null,
        prefill: existing.payload,
        warnings: ["Resumed the existing Launch Wizard draft for this agreement."],
      };
    }
  }

  const openMatch = await findOpenDraftForContract(input.payload, contractId);
  if (openMatch) {
    await persistHandoffState(input.payload, contractId, pkg, {
      ...handoffState,
      draftId: openMatch.id,
    });
    return {
      ok: true,
      draftId: openMatch.id,
      launchWizardUrl: `${LAUNCH_WIZARD_ROUTE_BASE}/${openMatch.id}`,
      reusedExistingDraft: true,
      alreadyLaunched: false,
      launchedClientId: null,
      prefill: openMatch.payload,
      warnings: ["Resumed the existing Launch Wizard draft for this agreement."],
    };
  }

  const prefill = await buildLaunchPrefillFromContract(contractId);
  const draft = await createLaunchDraft(input.payload, input.createdBy);

  // Apply commercial prefill onto the new draft.
  const updated = await input.payload.update({
    collection: DRAFTS as never,
    id: draft.id,
    data: {
      payload: prefill.payload,
      businessName: prefill.payload.identity.businessName,
      clientSlug: prefill.payload.identity.clientSlug,
      currentStep: "review",
    } as never,
    overrideAccess: true,
  });

  const mapped = mapLaunchDraftDoc(updated as never);
  await persistHandoffState(input.payload, contractId, pkg, {
    ...handoffState,
    draftId: mapped.id,
  });

  return {
    ok: true,
    draftId: mapped.id,
    launchWizardUrl: `${LAUNCH_WIZARD_ROUTE_BASE}/${mapped.id}`,
    reusedExistingDraft: false,
    alreadyLaunched: false,
    launchedClientId: null,
    prefill: mapped.payload,
    warnings: prefill.warnings,
  };
}

export async function markCommercialLaunchCompleted(input: {
  payload: Payload;
  contractId: number;
  clientId: number;
  draftId: string | number;
  invitationIds: number[];
  invitationOutcomes: CommercialLaunchHandoffState["lastInvitationOutcomes"];
}): Promise<void> {
  const contractDoc = (await input.payload.findByID({
    collection: CONTRACTS as never,
    id: input.contractId,
    depth: 0,
    overrideAccess: true,
  })) as Record<string, unknown>;
  const pkg = normalizeLifecyclePackage(contractDoc.lifecyclePackage);
  const prior = readHandoffState(pkg);

  await persistHandoffState(input.payload, input.contractId, pkg, {
    draftId: input.draftId,
    launchedClientId: input.clientId,
    launchedAt: new Date().toISOString(),
    invitationIds: [
      ...new Set([...(prior.invitationIds ?? []), ...input.invitationIds]),
    ],
    lastInvitationOutcomes: input.invitationOutcomes,
  });

  // Ensure contract remains associated with the launched client.
  const linkedClientId =
    typeof contractDoc.client === "number"
      ? contractDoc.client
      : typeof contractDoc.client === "object" &&
          contractDoc.client &&
          "id" in (contractDoc.client as object)
        ? Number((contractDoc.client as { id: number }).id)
        : null;

  if (linkedClientId !== input.clientId) {
    await input.payload.update({
      collection: CONTRACTS as never,
      id: input.contractId,
      data: { client: input.clientId } as never,
      overrideAccess: true,
    });
  }
}

export { readHandoffState };
