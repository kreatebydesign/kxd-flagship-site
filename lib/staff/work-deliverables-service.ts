import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import { WORK_COLLECTION } from "@/lib/work/constants";
import { appendWorkActivityEntry } from "@/lib/work/activity";
import { getWorkItem } from "@/lib/work/services";
import { deliverableSummaryFromWorkDoc } from "@/lib/work/list-enrichment";
import { readRawWorkMetadata } from "./work-guided-metadata";
import {
  applyDeliverableToggles,
  buildDeliverableProgressPatch,
  buildDeliverablesDefinitionPatch,
  formatDeliverableActivityDetail,
  mergeDeliverableViews,
  parseDeliverablesDefinition,
  parseDeliverableProgress,
  pruneDeliverableCompletionsForDefinition,
  sanitizeDeliverableTogglePayload,
  sanitizeDeliverablesInput,
  summarizeDeliverableProgress,
  type StaffAssignmentDeliverableDef,
  type StaffDeliverableView,
} from "./work-deliverables";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

function relId(value: unknown): number | null {
  if (typeof value === "number") return value;
  if (value && typeof value === "object" && "id" in value) {
    const n = Number((value as AnyDoc).id);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

async function loadWorkDoc(workId: number): Promise<AnyDoc | null> {
  const payload = await getPayload({ config });
  const doc = await payload.findByID({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: WORK_COLLECTION as any,
    id: workId,
    depth: 0,
    overrideAccess: true,
  });
  return (doc as AnyDoc) ?? null;
}

export async function loadWorkDeliverableViews(
  workId: number,
  assigneeUserId: number,
): Promise<StaffDeliverableView[]> {
  const doc = await loadWorkDoc(workId);
  if (!doc) return [];
  const metadata = readRawWorkMetadata(doc);
  const definition = parseDeliverablesDefinition(metadata);
  const progress = parseDeliverableProgress(metadata, assigneeUserId);
  return mergeDeliverableViews(definition, progress);
}

export async function saveWorkAssignmentDeliverables(
  workId: number,
  itemsInput: unknown,
  actorEmail?: string | null,
): Promise<{ items: StaffAssignmentDeliverableDef[] }> {
  const sanitized = sanitizeDeliverablesInput(itemsInput);
  if ("error" in sanitized) throw new Error(sanitized.error);

  const doc = await loadWorkDoc(workId);
  if (!doc) throw new Error("Work item not found.");

  const metadata = readRawWorkMetadata(doc);
  const prior = parseDeliverablesDefinition(metadata);
  let patch = buildDeliverablesDefinitionPatch(metadata, sanitized, actorEmail ?? null);

  const definition = parseDeliverablesDefinition(patch);
  const assigneeId = relId((doc as AnyDoc).assignedTo);
  if (definition && assigneeId != null) {
    const progress = parseDeliverableProgress(patch, assigneeId);
    const pruned = pruneDeliverableCompletionsForDefinition(definition, progress);
    patch = buildDeliverableProgressPatch(patch, assigneeId, pruned);
  }

  const payload = await getPayload({ config });
  await payload.update({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: WORK_COLLECTION as any,
    id: workId,
    data: { metadata: patch },
    depth: 0,
    overrideAccess: true,
  });

  const countChanged =
    (prior?.items.length ?? 0) !== sanitized.length ||
    JSON.stringify(prior?.items ?? []) !== JSON.stringify(sanitized);

  if (countChanged) {
    await appendWorkActivityEntry(
      workId,
      {
        actor: actorEmail ?? null,
        action: "assignment-deliverables-updated",
        detail: `${sanitized.length} deliverable${sanitized.length === 1 ? "" : "s"} on assignment`,
      },
      payload,
    );
  }

  return { items: sanitized };
}

export async function saveStaffDeliverableToggles(
  workId: number,
  assigneeUserId: number,
  togglesInput: Record<string, unknown>,
  actorLabel: string | null,
): Promise<{ deliverables: StaffDeliverableView[] }> {
  const work = await getWorkItem(workId);
  if (!work) throw new Error("Work item not found.");
  if (work.assignedToId !== assigneeUserId) {
    throw new Error("Not assigned to this work item.");
  }

  const payload = await getPayload({ config });
  const nowIso = new Date().toISOString();
  let definition = parseDeliverablesDefinition({});
  let completed: Record<string, import("./work-deliverables").StaffDeliverableCompletionRecord> =
    {};
  let nextMetadata: Record<string, unknown> = {};

  for (let attempt = 0; attempt < 3; attempt++) {
    const doc = await loadWorkDoc(workId);
    if (!doc) throw new Error("Work item not found.");

    const metadata = readRawWorkMetadata(doc);
    definition = parseDeliverablesDefinition(metadata);
    const sanitized = sanitizeDeliverableTogglePayload(definition, togglesInput);
    if ("error" in sanitized) throw new Error(sanitized.error);

    const prior = parseDeliverableProgress(metadata, assigneeUserId);
    completed = applyDeliverableToggles(
      definition!,
      prior,
      sanitized.toggles,
      nowIso,
    );
    nextMetadata = buildDeliverableProgressPatch(metadata, assigneeUserId, completed);

    const fresh = await loadWorkDoc(workId);
    if (!fresh) throw new Error("Work item not found.");
    const freshMeta = readRawWorkMetadata(fresh);
    if (JSON.stringify(freshMeta) !== JSON.stringify(metadata) && attempt < 2) {
      continue;
    }

    {
      const priorForWrite = parseDeliverableProgress(freshMeta, assigneeUserId);
      completed = applyDeliverableToggles(
        definition!,
        priorForWrite,
        sanitized.toggles,
        nowIso,
      );
      nextMetadata = buildDeliverableProgressPatch(freshMeta, assigneeUserId, completed);
      await payload.update({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        collection: WORK_COLLECTION as any,
        id: workId,
        data: { metadata: nextMetadata },
        depth: 0,
        overrideAccess: true,
      });
      break;
    }
  }

  const views = mergeDeliverableViews(definition, {
    v: 1,
    assigneeUserId,
    completed,
    updatedAt: nowIso,
  });

  await appendWorkActivityEntry(
    workId,
    {
      actor: actorLabel,
      action: "staff-deliverables-updated",
      detail: formatDeliverableActivityDetail(views),
    },
    payload,
  );

  return { deliverables: views };
}

export function deliverableSummaryFromDoc(
  doc: AnyDoc,
  assigneeUserId: number | null,
): ReturnType<typeof summarizeDeliverableProgress> | null {
  return deliverableSummaryFromWorkDoc(doc, assigneeUserId);
}
