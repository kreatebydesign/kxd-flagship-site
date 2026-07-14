import "server-only";

import { randomUUID } from "node:crypto";
import type { Payload } from "payload";
import { emptyLaunchWizardPayload } from "./draft/empty";
import {
  isLaunchDraftStatus,
  isLaunchWizardStepId,
  normalizeLaunchWizardPayload,
} from "./draft/parse";
import { resolvePackageModuleSelections } from "./packages/resolve";
import { normalizeClientSlug } from "./validation/identity";
import { errorsOnly, validateStep } from "./validation/steps";
import { assertNoSecretsInDraftJson, sanitizeLaunchFailureMessage } from "./sanitize";
import { computeLaunchReadiness } from "./readiness/compute";
import { orchestrateClientLaunch } from "./launch/orchestrate";
import type {
  LaunchDraftStatus,
  LaunchWizardDraftPayload,
  LaunchWizardDraftRecord,
  LaunchWizardResult,
  LaunchWizardStepId,
} from "./types";

/** Collection slug until payload-types are regenerated. */
const DRAFTS = "client-launch-drafts" as const;

type DraftDoc = {
  id: string | number;
  status?: string | null;
  currentStep?: string | null;
  payload?: unknown;
  validationIssues?: unknown;
  launchOperationId?: string | null;
  launchedClient?: number | { id?: number | null } | null;
  failureSummary?: string | null;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string | null;
};

function launchedClientId(value: DraftDoc["launchedClient"]): number | null {
  if (typeof value === "number") return value;
  if (value && typeof value === "object" && typeof value.id === "number") return value.id;
  return null;
}

export function mapLaunchDraftDoc(doc: DraftDoc): LaunchWizardDraftRecord {
  return {
    id: doc.id,
    status: isLaunchDraftStatus(doc.status) ? doc.status : "draft",
    currentStep: isLaunchWizardStepId(doc.currentStep) ? doc.currentStep : "identity",
    payload: normalizeLaunchWizardPayload(doc.payload),
    validationIssues: Array.isArray(doc.validationIssues)
      ? (doc.validationIssues as LaunchWizardDraftRecord["validationIssues"])
      : [],
    launchOperationId: doc.launchOperationId ?? null,
    launchedClientId: launchedClientId(doc.launchedClient),
    failureSummary: doc.failureSummary ?? null,
    createdAt: doc.createdAt ?? new Date().toISOString(),
    updatedAt: doc.updatedAt ?? new Date().toISOString(),
    createdBy: doc.createdBy ?? null,
  };
}

export async function createLaunchDraft(
  payload: Payload,
  createdBy: string,
): Promise<LaunchWizardDraftRecord> {
  const payloadData = emptyLaunchWizardPayload();
  payloadData.modules = resolvePackageModuleSelections("starter");
  const doc = await payload.create({
    collection: DRAFTS as any,
    data: {
      status: "draft",
      currentStep: "identity",
      payload: payloadData,
      validationIssues: [],
      createdBy,
      businessName: "",
      clientSlug: "",
    } as never,
  });
  return mapLaunchDraftDoc(doc as DraftDoc);
}

export async function getLaunchDraft(
  payload: Payload,
  draftId: string | number,
): Promise<LaunchWizardDraftRecord | null> {
  try {
    const doc = await payload.findByID({
      collection: DRAFTS as any,
      id: draftId,
      depth: 0,
    });
    return mapLaunchDraftDoc(doc as DraftDoc);
  } catch {
    return null;
  }
}

export async function findSlugCollisions(
  payload: Payload,
  slug: string,
  excludeDraftId?: string | number,
): Promise<{ slugTakenByClient: boolean; slugTakenByDraft: boolean; nameTakenByClient: boolean }> {
  const normalized = normalizeClientSlug(slug);
  const [clients, drafts, names] = await Promise.all([
    payload.find({
      collection: "clients",
      where: { slug: { equals: normalized } },
      limit: 1,
      depth: 0,
    }),
    payload.find({
      collection: DRAFTS as any,
      where: {
        and: [
          { clientSlug: { equals: normalized } },
          { status: { in: ["draft", "ready", "launching", "failed"] } },
          ...(excludeDraftId != null
            ? [{ id: { not_equals: excludeDraftId } }]
            : []),
        ],
      },
      limit: 1,
      depth: 0,
    }),
    payload.find({
      collection: "clients",
      where: { name: { equals: slug } },
      limit: 1,
      depth: 0,
    }),
  ]);

  return {
    slugTakenByClient: clients.docs.length > 0,
    slugTakenByDraft: drafts.docs.length > 0,
    nameTakenByClient: false,
  };
}

export async function findIdentityCollisions(
  payload: Payload,
  identity: LaunchWizardDraftPayload["identity"],
  excludeDraftId?: string | number,
) {
  const slug = normalizeClientSlug(identity.clientSlug || identity.businessName);
  const name = identity.businessName.trim();
  const [bySlug, byDraft, byName] = await Promise.all([
    payload.find({
      collection: "clients",
      where: { slug: { equals: slug } },
      limit: 1,
      depth: 0,
    }),
    payload.find({
      collection: DRAFTS as any,
      where: {
        and: [
          { clientSlug: { equals: slug } },
          { status: { in: ["draft", "ready", "launching", "failed"] } },
          ...(excludeDraftId != null
            ? [{ id: { not_equals: excludeDraftId } }]
            : []),
        ],
      },
      limit: 1,
      depth: 0,
    }),
    name
      ? payload.find({
          collection: "clients",
          where: { name: { equals: name } },
          limit: 1,
          depth: 0,
        })
      : Promise.resolve({ docs: [] as unknown[] }),
  ]);

  return {
    slugTakenByClient: bySlug.docs.length > 0,
    slugTakenByDraft: byDraft.docs.length > 0,
    nameTakenByClient: byName.docs.length > 0,
  };
}

export async function findExistingPortalEmails(
  payload: Payload,
  emails: readonly string[],
): Promise<string[]> {
  const normalized = [
    ...new Set(emails.map((email) => email.trim().toLowerCase()).filter(Boolean)),
  ];
  if (normalized.length === 0) return [];
  const found = await payload.find({
    collection: "portal-users",
    where: { email: { in: normalized } },
    limit: 100,
    depth: 0,
  });
  return found.docs
    .map((doc) => String((doc as { email?: string }).email ?? "").toLowerCase())
    .filter(Boolean);
}

export async function saveLaunchDraftStep(input: {
  payload: Payload;
  draftId: string | number;
  stepId: LaunchWizardStepId;
  nextStep?: LaunchWizardStepId;
  patch: Partial<LaunchWizardDraftPayload>;
  expectedUpdatedAt?: string | null;
}): Promise<
  | { ok: true; draft: LaunchWizardDraftRecord }
  | {
      ok: false;
      status: number;
      message: string;
      issues?: LaunchWizardDraftRecord["validationIssues"];
      draft?: LaunchWizardDraftRecord;
    }
> {
  const existing = await getLaunchDraft(input.payload, input.draftId);
  if (!existing) {
    return { ok: false, status: 404, message: "Launch draft not found." };
  }
  if (existing.status === "launched" || existing.status === "launching") {
    return {
      ok: false,
      status: 409,
      message: "This draft can no longer be edited.",
      draft: existing,
    };
  }
  if (
    input.expectedUpdatedAt &&
    existing.updatedAt &&
    input.expectedUpdatedAt !== existing.updatedAt
  ) {
    return {
      ok: false,
      status: 409,
      message:
        "This draft changed elsewhere. Reload the latest version before saving again.",
      draft: existing,
    };
  }

  const merged: LaunchWizardDraftPayload = {
    ...existing.payload,
    ...input.patch,
    identity: { ...existing.payload.identity, ...(input.patch.identity ?? {}) },
    package: { ...existing.payload.package, ...(input.patch.package ?? {}) },
    experience: { ...existing.payload.experience, ...(input.patch.experience ?? {}) },
    infrastructure: {
      ...existing.payload.infrastructure,
      ...(input.patch.infrastructure ?? {}),
    },
    automation: { ...existing.payload.automation, ...(input.patch.automation ?? {}) },
    modules: input.patch.modules ?? existing.payload.modules,
    team: input.patch.team ?? existing.payload.team,
  };

  if (input.patch.package?.packageId && input.patch.package.packageId !== existing.payload.package.packageId) {
    merged.modules = resolvePackageModuleSelections(
      input.patch.package.packageId,
      existing.payload.modules,
    );
    const presetAutomation = (
      await import("./packages/presets")
    ).getLaunchPackagePreset(input.patch.package.packageId)?.automationDefaults;
    if (presetAutomation) {
      merged.automation = {
        ...merged.automation,
        ...presetAutomation,
      };
    }
  }

  if (merged.identity.clientSlug) {
    merged.identity.clientSlug = normalizeClientSlug(merged.identity.clientSlug);
  } else if (merged.identity.businessName) {
    merged.identity.clientSlug = normalizeClientSlug(merged.identity.businessName);
  }

  const secretHits = assertNoSecretsInDraftJson(merged);
  if (secretHits.length > 0) {
    return {
      ok: false,
      status: 400,
      message: "Draft rejected — secrets and credentials cannot be stored on launch drafts.",
    };
  }

  const uniqueness = await findIdentityCollisions(
    input.payload,
    merged.identity,
    input.draftId,
  );
  const existingPortalEmails = await findExistingPortalEmails(
    input.payload,
    merged.team.map((member) => member.email),
  );
  const issues = validateStep(input.stepId, merged, {
    ...uniqueness,
    existingPortalEmails,
  });
  const hardErrors = errorsOnly(issues);
  if (hardErrors.length > 0 && input.nextStep) {
    return {
      ok: false,
      status: 400,
      message: hardErrors[0]?.message ?? "Validation failed.",
      issues: hardErrors,
      draft: existing,
    };
  }

  const status: LaunchDraftStatus =
    existing.status === "failed" ? "draft" : existing.status === "abandoned" ? "draft" : existing.status;

  const doc = await input.payload.update({
    collection: DRAFTS as any,
    id: input.draftId,
    data: {
      status,
      currentStep: input.nextStep ?? input.stepId,
      payload: merged,
      validationIssues: issues,
      businessName: merged.identity.businessName,
      clientSlug: merged.identity.clientSlug,
      failureSummary: null,
    } as never,
  });

  return { ok: true, draft: mapLaunchDraftDoc(doc as DraftDoc) };
}

export async function launchFromDraft(input: {
  payload: Payload;
  draftId: string | number;
  createdBy: string;
  requestOrigin?: string | null;
  launchOperationId?: string;
}): Promise<
  | { ok: true; draft: LaunchWizardDraftRecord; result: LaunchWizardResult }
  | { ok: false; status: number; message: string; draft?: LaunchWizardDraftRecord }
> {
  const existing = await getLaunchDraft(input.payload, input.draftId);
  if (!existing) {
    return { ok: false, status: 404, message: "Launch draft not found." };
  }

  if (existing.status === "launched" && existing.launchedClientId) {
    return {
      ok: false,
      status: 409,
      message: "This draft was already launched. Open the client workspace instead of relaunching.",
      draft: existing,
    };
  }

  if (existing.status === "launching") {
    return {
      ok: false,
      status: 409,
      message: "Launch is already in progress for this draft.",
      draft: existing,
    };
  }

  const uniqueness = await findIdentityCollisions(
    input.payload,
    existing.payload.identity,
    input.draftId,
  );
  const existingPortalEmails = await findExistingPortalEmails(
    input.payload,
    existing.payload.team.map((member) => member.email),
  );
  const readiness = computeLaunchReadiness(existing.payload, {
    ...uniqueness,
    // Readiness compute currently uses identity uniqueness only.
  });
  const launchIssues = errorsOnly(
    validateStep("review", existing.payload, {
      ...uniqueness,
      existingPortalEmails,
    }),
  );
  if (!readiness.canLaunch || launchIssues.length > 0) {
    return {
      ok: false,
      status: 400,
      message:
        launchIssues[0]?.message ??
        readiness.blockers[0] ??
        "Launch blocked.",
      draft: existing,
    };
  }

  const operationId = input.launchOperationId || existing.launchOperationId || randomUUID();

  await input.payload.update({
    collection: DRAFTS as any,
    id: input.draftId,
    data: {
      status: "launching",
      launchOperationId: operationId,
      currentStep: "launch",
    } as never,
  });

  const outcome = await orchestrateClientLaunch({
    payload: input.payload,
    draftId: input.draftId,
    draftPayload: existing.payload,
    createdBy: input.createdBy,
    launchOperationId: operationId,
    uniqueness,
    requestOrigin: input.requestOrigin,
  });

  if (!outcome.ok) {
    const failed = await input.payload.update({
      collection: DRAFTS as any,
      id: input.draftId,
      data: {
        status: "failed",
        launchOperationId: outcome.launchOperationId,
        failureSummary: sanitizeLaunchFailureMessage(outcome.failureSummary),
        currentStep: "review",
      } as never,
    });
    return {
      ok: false,
      status: 500,
      message: outcome.failureSummary,
      draft: mapLaunchDraftDoc(failed as DraftDoc),
    };
  }

  const launched = await input.payload.update({
    collection: DRAFTS as any,
    id: input.draftId,
    data: {
      status: "launched",
      launchOperationId: outcome.result.launchOperationId,
      launchedClient: outcome.result.clientId,
      failureSummary: null,
      currentStep: "launch",
    } as never,
  });

  return {
    ok: true,
    draft: mapLaunchDraftDoc(launched as DraftDoc),
    result: outcome.result,
  };
}

export async function listOpenLaunchDrafts(
  payload: Payload,
): Promise<LaunchWizardDraftRecord[]> {
  const result = await payload.find({
    collection: DRAFTS as any,
    where: {
      status: { in: ["draft", "ready", "failed", "launching"] },
    },
    sort: "-updatedAt",
    limit: 50,
    depth: 0,
  });
  return result.docs.map((doc) => mapLaunchDraftDoc(doc as DraftDoc));
}

export async function abandonLaunchDraft(
  payload: Payload,
  draftId: string | number,
): Promise<
  | { ok: true; draft: LaunchWizardDraftRecord }
  | { ok: false; status: number; message: string }
> {
  const existing = await getLaunchDraft(payload, draftId);
  if (!existing) {
    return { ok: false, status: 404, message: "Launch draft not found." };
  }
  if (existing.status === "launched") {
    return {
      ok: false,
      status: 409,
      message: "Launched drafts cannot be abandoned.",
    };
  }
  if (existing.status === "launching") {
    return {
      ok: false,
      status: 409,
      message: "Wait for the in-progress launch to finish before abandoning.",
    };
  }
  const doc = await payload.update({
    collection: DRAFTS as any,
    id: draftId,
    data: {
      status: "abandoned",
      failureSummary: null,
    } as never,
  });
  return { ok: true, draft: mapLaunchDraftDoc(doc as DraftDoc) };
}

export async function checkSlugAvailability(
  payload: Payload,
  slug: string,
  excludeDraftId?: string | number,
): Promise<{
  slug: string;
  available: boolean;
  takenByClient: boolean;
  takenByDraft: boolean;
}> {
  const normalized = normalizeClientSlug(slug);
  const collisions = await findIdentityCollisions(
    payload,
    {
      businessName: "",
      clientSlug: normalized,
      primaryContactName: "",
      primaryContactEmail: "",
      phone: "",
      companyWebsite: "",
      industry: "",
      serviceRegion: "",
      internalNotes: "",
    },
    excludeDraftId,
  );
  return {
    slug: normalized,
    available: !collisions.slugTakenByClient && !collisions.slugTakenByDraft,
    takenByClient: collisions.slugTakenByClient,
    takenByDraft: collisions.slugTakenByDraft,
  };
}
