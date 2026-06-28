import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import { createTaskFromSource } from "@/lib/client-tasks/runner";
import { createExecutiveEvent } from "@/lib/executive-timeline/create-event";
import {
  computeCategorySummaries,
  computeLaunchQaScores,
  deriveSessionStatus,
  extractBlockers,
  extractWarnings,
} from "./scoring";
import type { LaunchQaChecklistItem, LaunchQaItemStatus } from "./types";
import { getLaunchQaById } from "./engine";
import {
  checkLaunchDateReminder,
  onLaunchQaApproved,
  onLaunchQaBlockers,
  onLaunchQaReady,
} from "./automation";

const COLLECTION = "website-qa-checks";

export async function saveLaunchQaChecklist(
  qaId: number,
  input: {
    checklistItems: LaunchQaChecklistItem[];
    websiteUrl?: string;
    launchDate?: string;
    notes?: string;
    checkedBy?: string;
  },
): Promise<{ success: boolean; detail?: Awaited<ReturnType<typeof getLaunchQaById>>; error?: string }> {
  const payload = await getPayload({ config });
  const existing = await getLaunchQaById(qaId);
  if (!existing) return { success: false, error: "Launch QA not found." };

  const scores = computeLaunchQaScores(input.checklistItems);
  const blockers = extractBlockers(input.checklistItems);
  const warnings = extractWarnings(input.checklistItems);
  const status = deriveSessionStatus(scores, existing.status, existing.approvedAt);

  const doc = await payload.update({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: COLLECTION as any,
    id: qaId,
    data: {
      checklistItems: input.checklistItems,
      websiteUrl: input.websiteUrl ?? existing.websiteUrl,
      launchDate: input.launchDate ?? existing.launchDate,
      notes: input.notes ?? existing.notes,
      checkedBy: input.checkedBy,
      readinessScore: scores.readinessScore,
      recommendation: existing.approvedAt ? "approved" : scores.recommendation,
      status,
      categories: computeCategorySummaries(input.checklistItems),
      blockers,
      warnings,
    },
    overrideAccess: true,
  });

  const detail = await getLaunchQaById(doc.id as number);
  if (!detail) return { success: false, error: "Update failed." };

  if (scores.criticalBlockerCount > 0) {
    await onLaunchQaBlockers(payload, {
      clientId: detail.clientId,
      qaId: detail.id,
      blockerCount: scores.criticalBlockerCount,
    });
  }

  if (scores.recommendation === "ready-to-launch" && status === "ready") {
    await onLaunchQaReady(payload, {
      clientId: detail.clientId,
      qaId: detail.id,
      readinessScore: scores.readinessScore,
    });
  }

  if (detail.launchDate) {
    await checkLaunchDateReminder(payload, {
      clientId: detail.clientId,
      qaId: detail.id,
      launchDate: detail.launchDate,
      readinessScore: scores.readinessScore,
      status: detail.status,
    });
  }

  return { success: true, detail };
}

export async function updateLaunchQaItem(
  qaId: number,
  itemId: string,
  input: { status: LaunchQaItemStatus; notes?: string },
): Promise<{ success: boolean; detail?: Awaited<ReturnType<typeof getLaunchQaById>>; error?: string }> {
  const existing = await getLaunchQaById(qaId);
  if (!existing) return { success: false, error: "Launch QA not found." };

  const items = existing.checklistItems.map((item) => {
    if (item.id !== itemId) return item;
    return {
      ...item,
      status: input.status,
      notes: input.notes ?? item.notes,
      completedAt: input.status !== "pending" ? new Date().toISOString() : undefined,
    };
  });

  const result = await saveLaunchQaChecklist(qaId, {
    checklistItems: items,
    websiteUrl: existing.websiteUrl ?? undefined,
    launchDate: existing.launchDate ?? undefined,
    notes: existing.notes ?? undefined,
  });

  if (result.success && result.detail && input.status === "fail") {
    const payload = await getPayload({ config });
    const failedItem = items.find((i) => i.id === itemId);
    if (failedItem) {
      await createExecutiveEvent({
        client: result.detail.clientId,
        eventType: "launch-qa.item-failed",
        title: `Launch QA — ${failedItem.title}`,
        summary: failedItem.notes ?? "Checklist item marked as failed.",
        category: "launch",
        importance: failedItem.severity === "critical" ? "critical" : "normal",
        sourceModule: "Manual",
        metadata: { qaId, itemId },
      }, payload);
    }
  }

  return result;
}

export async function approveLaunchQa(
  qaId: number,
  approvedBy: string,
): Promise<{ success: boolean; detail?: Awaited<ReturnType<typeof getLaunchQaById>>; error?: string }> {
  const payload = await getPayload({ config });
  const existing = await getLaunchQaById(qaId);
  if (!existing) return { success: false, error: "Launch QA not found." };

  if (existing.scores.criticalBlockerCount > 0) {
    return { success: false, error: "Cannot approve — critical blockers remain." };
  }

  await payload.update({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: COLLECTION as any,
    id: qaId,
    data: {
      status: "approved",
      recommendation: "approved",
      approvedBy,
      approvedAt: new Date().toISOString(),
    },
    overrideAccess: true,
  });

  await onLaunchQaApproved(payload, {
    clientId: existing.clientId,
    qaId,
    approvedBy,
  });

  const detail = await getLaunchQaById(qaId);
  return { success: true, detail };
}

export async function markLaunchQaLaunched(qaId: number): Promise<{ success: boolean; error?: string }> {
  const payload = await getPayload({ config });
  const existing = await getLaunchQaById(qaId);
  if (!existing) return { success: false, error: "Launch QA not found." };

  await payload.update({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: COLLECTION as any,
    id: qaId,
    data: {
      status: "launched",
      completedAt: new Date().toISOString(),
    },
    overrideAccess: true,
  });

  await createExecutiveEvent({
    client: existing.clientId,
    eventType: "website.launched",
    title: "Website launched",
    summary: `Website launch completed — QA score ${existing.readinessScore}%.`,
    category: "launch",
    importance: "critical",
    sourceModule: "Manual",
  }, payload);

  return { success: true };
}

export async function createTaskFromFailedItem(
  qaId: number,
  itemId: string,
): Promise<{ success: boolean; taskId?: number; href?: string; error?: string }> {
  const detail = await getLaunchQaById(qaId);
  if (!detail) return { success: false, error: "Launch QA not found." };

  const item = detail.checklistItems.find((i) => i.id === itemId);
  if (!item) return { success: false, error: "Checklist item not found." };

  return createTaskFromSource({
    clientId: detail.clientId,
    projectId: detail.projectId ?? undefined,
    title: `Fix before launch — ${item.title}`,
    description: item.description + (item.notes ? `\n\nNotes: ${item.notes}` : ""),
    category: item.relatedModule?.toLowerCase().includes("seo") ? "seo" : "website",
    createdFrom: `launch-qa:${qaId}:${itemId}`,
  });
}

export async function createLaunchQaFromGenesis(input: {
  clientId: number;
  projectId?: number;
  websiteUrl?: string;
  genesisSessionId: number;
}): Promise<number | null> {
  const { createLaunchQaCheck } = await import("./engine");
  const detail = await createLaunchQaCheck({
    clientId: input.clientId,
    projectId: input.projectId,
    websiteUrl: input.websiteUrl,
    createdFrom: `genesis:${input.genesisSessionId}`,
    notes: "Auto-prepared from KXD Genesis — complete before website launch.",
  });
  return detail.id;
}
