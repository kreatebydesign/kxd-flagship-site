import "server-only";

import { createTaskFromSource } from "@/lib/client-tasks/runner";
import type { WorkItemSourceType } from "./types";

export interface SpawnWorkItemInput {
  clientId: number;
  title: string;
  description?: string;
  category?: string;
  sourceType: WorkItemSourceType;
  priority?: string;
  projectId?: number;
  relatedRequestId?: number;
  relatedDeliverableId?: number;
  relatedPlaybookId?: number;
  relatedRetainerId?: number;
  relatedUpgradeOfferId?: number;
  clientVisible?: boolean;
}

function legacyCreatedFrom(sourceType: WorkItemSourceType): string {
  return sourceType;
}

export async function spawnWorkItem(
  input: SpawnWorkItemInput,
): Promise<{ success: boolean; taskId?: number; href?: string; error?: string }> {
  return createTaskFromSource({
    clientId: input.clientId,
    title: input.title,
    description: input.description,
    category: input.category,
    createdFrom: legacyCreatedFrom(input.sourceType),
    sourceType: input.sourceType,
    relatedRequestId: input.relatedRequestId,
    relatedDeliverableId: input.relatedDeliverableId,
    relatedPlaybookId: input.relatedPlaybookId,
    projectId: input.projectId,
    relatedRetainerId: input.relatedRetainerId,
    relatedUpgradeOfferId: input.relatedUpgradeOfferId,
    clientVisible: input.clientVisible,
  });
}

export async function spawnWorkItemFromPortalRequest(input: {
  clientId: number;
  requestId: number;
  requestTitle: string;
  requestType?: string | null;
  requestDetails?: string | null;
  relatedProjectId?: number | null;
}): Promise<{ success: boolean; taskId?: number; error?: string }> {
  const category = mapRequestTypeToCategory(input.requestType);

  const result = await spawnWorkItem({
    clientId: input.clientId,
    title: `Portal request · ${input.requestTitle}`,
    description: input.requestDetails ?? undefined,
    category,
    sourceType: "portal-request",
    relatedRequestId: input.requestId,
    projectId: input.relatedProjectId ?? undefined,
    clientVisible: true,
    priority: "medium",
  });

  return { success: result.success, taskId: result.taskId, error: result.error };
}

function mapRequestTypeToCategory(requestType?: string | null): string {
  switch (requestType) {
    case "seo":
      return "seo";
    case "content":
      return "content";
    case "design":
      return "design";
    case "bug":
    case "update":
      return "website";
    default:
      return "general";
  }
}
