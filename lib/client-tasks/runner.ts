import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import { onTaskBlocked, onTaskCompleted, recordTaskAutomationEvent } from "./automation";
import type { TaskStatus } from "./types";

const COLLECTION = "client-tasks";

export interface UpdateTaskStatusResult {
  success: boolean;
  taskId?: number;
  status?: TaskStatus;
  error?: string;
}

export async function updateTaskStatus(
  taskId: number,
  status: TaskStatus,
  blockedReason?: string,
): Promise<UpdateTaskStatusResult> {
  const payload = await getPayload({ config });

  try {
    const existing = await payload.findByID({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: COLLECTION as any,
      id: taskId,
      depth: 1,
      overrideAccess: true,
    });

    const client =
      typeof existing.client === "object" ? (existing.client as { id: number }) : existing.client;
    const clientId = Number(client);

    const data: Record<string, unknown> = { status };
    if (status === "blocked" && blockedReason) data.blockedReason = blockedReason;
    if (status === "completed") {
      data.completedDate = new Date().toISOString();
    }

    const updated = await payload.update({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: COLLECTION as any,
      id: taskId,
      data,
      overrideAccess: true,
    });

    const title = String(updated.title ?? "Task");

    if (status === "completed") {
      await onTaskCompleted(payload, {
        clientId,
        taskId,
        taskTitle: title,
        category: String(updated.category ?? "general"),
      });
    } else if (status === "blocked") {
      await onTaskBlocked(payload, {
        clientId,
        taskId,
        taskTitle: title,
        reason: blockedReason,
      });
    } else {
      await recordTaskAutomationEvent(payload, {
        eventName: `client-task.status.${status}`,
        clientId,
        taskId,
        taskTitle: title,
        status,
      });
    }

    return { success: true, taskId, status };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Update failed" };
  }
}

export async function completeTask(taskId: number): Promise<UpdateTaskStatusResult> {
  return updateTaskStatus(taskId, "completed");
}

export async function createTask(input: {
  clientId: number;
  title: string;
  description?: string;
  category?: string;
  priority?: string;
  status?: TaskStatus;
  projectId?: number;
  dueDate?: string;
  estimatedHours?: number;
  assignedTo?: number;
  createdFrom?: string;
}): Promise<{ success: boolean; taskId?: number; href?: string; error?: string }> {
  const payload = await getPayload({ config });

  try {
    const doc = await payload.create({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: COLLECTION as any,
      data: {
        client: input.clientId,
        title: input.title,
        description: input.description,
        category: input.category ?? "general",
        status: input.status ?? "to-do",
        priority: input.priority ?? "medium",
        createdFrom: input.createdFrom ?? "manual",
        project: input.projectId,
        dueDate: input.dueDate,
        estimatedHours: input.estimatedHours,
        assignedTo: input.assignedTo,
        clientVisible: true,
      },
      overrideAccess: true,
    });

    return {
      success: true,
      taskId: doc.id as number,
      href: `/admin/operations/work/${input.clientId}`,
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Create failed" };
  }
}

export async function assignTask(
  taskId: number,
  userId: number | null,
): Promise<UpdateTaskStatusResult> {
  const payload = await getPayload({ config });

  try {
    const updated = await payload.update({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: COLLECTION as any,
      id: taskId,
      data: { assignedTo: userId },
      depth: 1,
      overrideAccess: true,
    });

    const client =
      typeof updated.client === "object" ? (updated.client as { id: number }).id : updated.client;

    await recordTaskAutomationEvent(payload, {
      eventName: "client-task.assigned",
      clientId: Number(client),
      taskId,
      taskTitle: String(updated.title ?? "Task"),
      status: updated.status as TaskStatus,
    });

    return { success: true, taskId, status: updated.status as TaskStatus };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Assign failed" };
  }
}

export async function createTaskFromSource(input: {
  clientId: number;
  title: string;
  description?: string;
  category?: string;
  createdFrom: string;
  relatedRequestId?: number;
  relatedDeliverableId?: number;
  relatedPlaybookId?: number;
  projectId?: number;
}): Promise<{ success: boolean; taskId?: number; href?: string; error?: string }> {
  const payload = await getPayload({ config });

  try {
    const doc = await payload.create({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: COLLECTION as any,
      data: {
        client: input.clientId,
        title: input.title,
        description: input.description,
        category: input.category ?? "general",
        status: "to-do",
        priority: "medium",
        createdFrom: input.createdFrom,
        project: input.projectId,
        relatedRequest: input.relatedRequestId,
        relatedDeliverable: input.relatedDeliverableId,
        relatedPlaybook: input.relatedPlaybookId,
        clientVisible: true,
      },
      overrideAccess: true,
    });

    return {
      success: true,
      taskId: doc.id as number,
      href: `/admin/operations/work/${input.clientId}`,
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Create failed" };
  }
}
