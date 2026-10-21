import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import { WORK_COLLECTION } from "@/lib/work/constants";
import { appendWorkActivityEntry } from "@/lib/work/activity";
import { getWorkItem } from "@/lib/work/services";
import type { WorkListItem } from "@/lib/work/types";
import {
  allRequiredChecklistItemsChecked,
  buildStaffGuidedChecklistItems,
  formatChecklistActivityDetail,
  isValidChecklistPayload,
  mergeChecklistState,
  sanitizeStaffGuidedChecklist,
  STAFF_GUIDED_CHECKLIST_IDS,
  type StaffGuidedChecklistId,
} from "./guided-checklist";
import type { StaffDeliverableView } from "./work-deliverables";
import type { StaffActor } from "./types";
import {
  mergeStaffProgressNotes,
  splitWorkNotes,
  staffProgressPreview,
} from "./work-execution-notes";
import {
  allRequiredDeliverablesComplete,
  applyDeliverableToggles,
  buildAcceptanceCriteriaProgressPatch,
  buildDeliverableProgressPatch,
  formatDeliverableActivityDetail,
  mergeAcceptanceCriteriaViews,
  mergeDeliverableViews,
  parseAcceptanceCriteriaDefinition,
  parseAcceptanceCriteriaProgress,
  parseDeliverablesDefinition,
  parseDeliverableProgress,
  sanitizeDeliverableTogglePayload,
} from "./work-deliverables";
import {
  loadWorkAcceptanceCriteriaViews,
  loadWorkDeliverableViews,
  saveStaffAcceptanceCriteriaToggles,
  saveStaffDeliverableToggles,
} from "./work-deliverables-service";
import {
  buildStaffGuidedExecutionPatch,
  checklistStatesEqual,
  readRawWorkMetadata,
  readStaffGuidedExecution,
} from "./work-guided-metadata";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

export interface StaffWorkExecutionSaveInput {
  staffProgress?: string | null;
  checklist?: Record<string, unknown> | null;
  deliverables?: Record<string, unknown> | null;
  acceptanceCriteria?: Record<string, unknown> | null;
}

export interface StaffWorkExecutionSaveResult {
  studioNotes: string | null;
  staffProgress: string | null;
  checklist: Record<StaffGuidedChecklistId, boolean>;
  deliverables: StaffDeliverableView[];
  acceptanceCriteria: StaffDeliverableView[];
  progressSaved: boolean;
  checklistSaved: boolean;
  deliverablesSaved: boolean;
  acceptanceCriteriaSaved: boolean;
}

export async function loadStaffGuidedChecklistChecked(
  workId: number,
  assigneeUserId: number,
  requiresMattApproval: boolean,
): Promise<Record<StaffGuidedChecklistId, boolean>> {
  const payload = await getPayload({ config });
  const doc = await payload.findByID({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: WORK_COLLECTION as any,
    id: workId,
    depth: 0,
    overrideAccess: true,
  });
  const items = buildStaffGuidedChecklistItems(requiresMattApproval);
  if (!doc) return mergeChecklistState(items, {});
  const state = readStaffGuidedExecution(doc as AnyDoc, assigneeUserId);
  return mergeChecklistState(items, state?.checked);
}

export async function saveStaffWorkExecution(
  workId: number,
  actor: StaffActor,
  work: WorkListItem,
  requiresMattApproval: boolean,
  input: StaffWorkExecutionSaveInput,
): Promise<StaffWorkExecutionSaveResult> {
  const items = buildStaffGuidedChecklistItems(requiresMattApproval);
  const payload = await getPayload({ config });
  const doc = await payload.findByID({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: WORK_COLLECTION as any,
    id: workId,
    depth: 0,
    overrideAccess: true,
  });
  if (!doc) throw new Error("Work item not found.");
  if (work.id !== workId) throw new Error("Work mismatch.");

  const docNotes =
    (doc as AnyDoc).notes != null && String((doc as AnyDoc).notes).trim()
      ? String((doc as AnyDoc).notes)
      : null;

  const priorExecution = readStaffGuidedExecution(doc as AnyDoc, actor.userId);
  const priorChecked = mergeChecklistState(items, priorExecution?.checked);

  const { studioNotes: priorStudio } = splitWorkNotes(docNotes);

  let progressSaved = false;
  let nextNotes: string | null = docNotes;

  if (input.staffProgress !== undefined) {
    const merged = mergeStaffProgressNotes(docNotes, input.staffProgress);
    if (merged !== docNotes) {
      nextNotes = merged;
      progressSaved = true;
    }
  }

  let checklistSaved = false;
  let nextChecked = priorChecked;
  let deliverablesSaved = false;
  let deliverableViews = await loadWorkDeliverableViews(workId, actor.userId);
  let deliverableToggles: Record<string, boolean> | null = null;
  let acceptanceCriteriaSaved = false;
  let acceptanceCriteriaViews = await loadWorkAcceptanceCriteriaViews(
    workId,
    actor.userId,
    work.acceptanceCriteria,
  );
  let acceptanceCriteriaToggles: Record<string, boolean> | null = null;

  if (input.acceptanceCriteria !== undefined && input.acceptanceCriteria !== null) {
    const definition = parseAcceptanceCriteriaDefinition(work.acceptanceCriteria);
    const sanitized = sanitizeDeliverableTogglePayload(definition, input.acceptanceCriteria);
    if ("error" in sanitized) throw new Error(sanitized.error);
    acceptanceCriteriaToggles = sanitized.toggles;
    acceptanceCriteriaSaved = true;
  }

  if (input.deliverables !== undefined && input.deliverables !== null) {
    const definition = parseDeliverablesDefinition(readRawWorkMetadata(doc as AnyDoc));
    const sanitized = sanitizeDeliverableTogglePayload(definition, input.deliverables);
    if ("error" in sanitized) throw new Error(sanitized.error);
    deliverableToggles = sanitized.toggles;
    deliverablesSaved = true;
  }

  if (input.checklist !== undefined && input.checklist !== null) {
    if (!isValidChecklistPayload(input.checklist)) {
      throw new Error("Invalid checklist payload.");
    }
    const sanitized = sanitizeStaffGuidedChecklist(input.checklist);
    nextChecked = mergeChecklistState(items, sanitized);
    if (!checklistStatesEqual(priorChecked, nextChecked, STAFF_GUIDED_CHECKLIST_IDS)) {
      checklistSaved = true;
    }
  }

  const patch: AnyDoc = {};
  const needsMetadataReload =
    progressSaved || checklistSaved || deliverableToggles != null || acceptanceCriteriaToggles != null;

  if (
    acceptanceCriteriaSaved &&
    acceptanceCriteriaToggles != null &&
    !progressSaved &&
    !checklistSaved &&
    !deliverablesSaved
  ) {
    const actorLabel = actor.email || actor.displayName || null;
    const result = await saveStaffAcceptanceCriteriaToggles(
      workId,
      actor.userId,
      work.acceptanceCriteria,
      input.acceptanceCriteria as Record<string, unknown>,
      actorLabel,
    );
    acceptanceCriteriaViews = result.acceptanceCriteria;
  } else if (deliverablesSaved && deliverableToggles != null && !progressSaved && !checklistSaved) {
    const actorLabel = actor.email || actor.displayName || null;
    const result = await saveStaffDeliverableToggles(
      workId,
      actor.userId,
      input.deliverables as Record<string, unknown>,
      actorLabel,
    );
    deliverableViews = result.deliverables;
  } else if (needsMetadataReload) {
    const latest = await payload.findByID({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: WORK_COLLECTION as any,
      id: workId,
      depth: 0,
      overrideAccess: true,
    });
    if (!latest) throw new Error("Work item not found.");

    const latestNotes =
      (latest as AnyDoc).notes != null && String((latest as AnyDoc).notes).trim()
        ? String((latest as AnyDoc).notes)
        : null;
    let latestMetadata = readRawWorkMetadata(latest as AnyDoc);

    if (progressSaved) {
      patch.notes = mergeStaffProgressNotes(latestNotes, input.staffProgress);
      nextNotes = patch.notes as string | null;
    }

    if (deliverableToggles != null) {
      const definition = parseDeliverablesDefinition(latestMetadata);
      const prior = parseDeliverableProgress(latestMetadata, actor.userId);
      const nowIso = new Date().toISOString();
      const completed = applyDeliverableToggles(
        definition!,
        prior,
        deliverableToggles,
        nowIso,
      );
      latestMetadata = buildDeliverableProgressPatch(
        latestMetadata,
        actor.userId,
        completed,
      );
      deliverableViews = mergeDeliverableViews(definition, {
        v: 1,
        assigneeUserId: actor.userId,
        completed,
        updatedAt: nowIso,
      });
    }

    if (acceptanceCriteriaToggles != null) {
      const definition = parseAcceptanceCriteriaDefinition(work.acceptanceCriteria);
      const prior = parseAcceptanceCriteriaProgress(latestMetadata, actor.userId);
      const nowIso = new Date().toISOString();
      const completed = applyDeliverableToggles(
        definition!,
        prior,
        acceptanceCriteriaToggles,
        nowIso,
      );
      latestMetadata = buildAcceptanceCriteriaProgressPatch(
        latestMetadata,
        actor.userId,
        completed,
      );
      acceptanceCriteriaViews = mergeAcceptanceCriteriaViews(definition, {
        v: 1,
        assigneeUserId: actor.userId,
        completed,
        updatedAt: nowIso,
      });
    }

    if (checklistSaved) {
      latestMetadata = buildStaffGuidedExecutionPatch(
        latestMetadata,
        actor.userId,
        nextChecked,
      );
    }

    if (checklistSaved || deliverableToggles != null || acceptanceCriteriaToggles != null) {
      patch.metadata = latestMetadata;
    }
  }

  if (Object.keys(patch).length > 0) {
    await payload.update({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: WORK_COLLECTION as any,
      id: workId,
      data: patch,
      depth: 0,
      overrideAccess: true,
    });
  }

  const actorLabel = actor.email || actor.displayName || null;

  if (progressSaved) {
    const { staffProgress } = splitWorkNotes(nextNotes);
    await appendWorkActivityEntry(
      workId,
      {
        actor: actorLabel,
        action: "staff-progress-saved",
        detail: staffProgressPreview(staffProgress) ?? "Progress cleared.",
      },
      payload,
    );
  }

  if (checklistSaved) {
    await appendWorkActivityEntry(
      workId,
      {
        actor: actorLabel,
        action: "staff-checklist-updated",
        detail: formatChecklistActivityDetail(items, nextChecked),
      },
      payload,
    );
  }

  if (deliverablesSaved && deliverableToggles != null && (progressSaved || checklistSaved)) {
    await appendWorkActivityEntry(
      workId,
      {
        actor: actorLabel,
        action: "staff-deliverables-updated",
        detail: formatDeliverableActivityDetail(deliverableViews),
      },
      payload,
    );
  }

  const { studioNotes, staffProgress } = splitWorkNotes(
    progressSaved ? nextNotes : docNotes,
  );

  return {
    studioNotes: studioNotes ?? priorStudio,
    staffProgress,
    checklist: nextChecked,
    deliverables: deliverableViews,
    acceptanceCriteria: acceptanceCriteriaViews,
    progressSaved,
    checklistSaved,
    deliverablesSaved,
    acceptanceCriteriaSaved,
  };
}

export async function assertStaffGuidedChecklistReadyForSubmit(
  workId: number,
  actor: StaffActor,
  requiresMattApproval: boolean,
): Promise<{ ok: true; checked: Record<StaffGuidedChecklistId, boolean> } | { ok: false; error: string }> {
  const checked = await loadStaffGuidedChecklistChecked(
    workId,
    actor.userId,
    requiresMattApproval,
  );
  const items = buildStaffGuidedChecklistItems(requiresMattApproval);
  if (!allRequiredChecklistItemsChecked(items, checked)) {
    return {
      ok: false,
      error: "Complete every required confirmation before submitting for review.",
    };
  }

  const deliverables = await loadWorkDeliverableViews(workId, actor.userId);
  if (deliverables.length > 0 && !allRequiredDeliverablesComplete(deliverables)) {
    return {
      ok: false,
      error: "Complete every required assignment deliverable before submitting for review.",
    };
  }

  const work = await getWorkItem(workId);
  const acceptanceCriteria = work
    ? await loadWorkAcceptanceCriteriaViews(workId, actor.userId, work.acceptanceCriteria)
    : [];
  if (
    acceptanceCriteria.length > 0 &&
    !allRequiredDeliverablesComplete(acceptanceCriteria)
  ) {
    return {
      ok: false,
      error: "Complete every required acceptance criterion before submitting for review.",
    };
  }

  return { ok: true, checked };
}

export async function appendStaffSubmittedForReviewActivity(
  workId: number,
  actor: StaffActor,
  requiresMattApproval: boolean,
): Promise<void> {
  const work = await getWorkItem(workId);
  if (!work) return;
  const items = buildStaffGuidedChecklistItems(requiresMattApproval);
  const checked = await loadStaffGuidedChecklistChecked(
    workId,
    actor.userId,
    requiresMattApproval,
  );
  const { staffProgress } = splitWorkNotes(work.notes);
  const checklistLine = formatChecklistActivityDetail(items, checked);
  const deliverableViews = await loadWorkDeliverableViews(workId, actor.userId);
  const deliverableLine =
    deliverableViews.length > 0
      ? formatDeliverableActivityDetail(deliverableViews)
      : null;
  const progressLine = staffProgressPreview(staffProgress);
  const detail = [
    deliverableLine,
    checklistLine,
    progressLine ? `Progress: ${progressLine}` : null,
  ]
    .filter(Boolean)
    .join(" — ");

  await appendWorkActivityEntry(workId, {
    actor: actor.email || actor.displayName || null,
    action: "staff-submitted-for-review",
    detail: detail || "Submitted for operator review.",
  });
}
