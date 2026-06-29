import "server-only";

import type {
  ClientActionPriority,
  ClientActionSource,
  ClientActionStatus,
  ClientActionType,
  ClientActionDoc,
} from "./types";
import type { QuickActionOperation } from "./quick-buttons";
import {
  createClientAction,
  findActionByMemoryReference,
  updateClientAction,
} from "./data";

export type { QuickActionOperation } from "./quick-buttons";

export interface PerformQuickActionInput {
  clientId: number;
  operation: QuickActionOperation;
  actionId?: number;
  memoryReference?: string;
  title?: string;
  description?: string;
  source?: ClientActionSource;
  priority?: ClientActionPriority;
  actionType?: ClientActionType;
  assignedTo?: string;
}

function tomorrowIso(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(9, 0, 0, 0);
  return d.toISOString();
}

function weekFromNowIso(): string {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  d.setHours(9, 0, 0, 0);
  return d.toISOString();
}

export async function performQuickClientAction(
  input: PerformQuickActionInput,
): Promise<ClientActionDoc> {
  let docId: number | null = input.actionId ?? null;

  if (!docId && input.memoryReference) {
    const existing = await findActionByMemoryReference(
      input.clientId,
      input.memoryReference,
    );
    if (existing) docId = existing.id as number;
  }

  const op = input.operation;

  if (op === "dismiss") {
    if (docId) {
      return (await updateClientAction(docId, { status: "dismissed" }))!;
    }
    return await createClientAction({
      clientId: input.clientId,
      title: input.title ?? "Dismissed recommendation",
      description: input.description,
      source: input.source ?? "Intelligence",
      priority: input.priority ?? "medium",
      status: "dismissed",
      actionType: input.actionType ?? "task",
      memoryReference: input.memoryReference,
    });
  }

  if (op === "complete") {
    if (docId) {
      return (await updateClientAction(docId, { status: "completed" }))!;
    }
    return await createClientAction({
      clientId: input.clientId,
      title: input.title ?? "Completed action",
      description: input.description,
      source: input.source ?? "Intelligence",
      priority: input.priority ?? "medium",
      status: "completed",
      actionType: input.actionType ?? "task",
      memoryReference: input.memoryReference,
    });
  }

  if (op === "archive") {
    if (docId) {
      return (await updateClientAction(docId, { status: "archived" }))!;
    }
    return await createClientAction({
      clientId: input.clientId,
      title: input.title ?? "Archived action",
      description: input.description,
      source: input.source ?? "Manual",
      status: "archived",
      memoryReference: input.memoryReference,
    });
  }

  if (op === "escalate") {
    const updates: Parameters<typeof updateClientAction>[1] = {
      status: "waiting",
      priority: "critical",
    };
    if (docId) {
      return (await updateClientAction(docId, updates))!;
    }
    return await createClientAction({
      clientId: input.clientId,
      title: input.title ?? "Escalated action",
      description: input.description,
      source: input.source ?? "Executive",
      priority: "critical",
      status: "waiting",
      actionType: input.actionType ?? "task",
      memoryReference: input.memoryReference,
    });
  }

  if (op === "assign") {
    const assignedTo = input.assignedTo ?? "Team";
    if (docId) {
      return (
        (await updateClientAction(docId, {
          assignedTo,
          status: "in-progress",
        }))!
      );
    }
    return await createClientAction({
      clientId: input.clientId,
      title: input.title ?? "Assigned action",
      description: input.description,
      source: input.source ?? "Executive",
      priority: input.priority ?? "high",
      status: "in-progress",
      actionType: input.actionType ?? "task",
      assignedTo,
      memoryReference: input.memoryReference,
    });
  }

  if (op === "start") {
    if (docId) {
      return (await updateClientAction(docId, { status: "in-progress" }))!;
    }
    return await createClientAction({
      clientId: input.clientId,
      title: input.title ?? "Action started",
      description: input.description,
      source: input.source ?? "Manual",
      status: "in-progress",
      memoryReference: input.memoryReference,
    });
  }

  const dueDate = op === "schedule-tomorrow" ? tomorrowIso() : weekFromNowIso();
  const status: ClientActionStatus = "pending";

  if (docId) {
    return (
      (await updateClientAction(docId, {
        dueDate,
        status,
        priority: input.priority,
      }))!
    );
  }

  return await createClientAction({
    clientId: input.clientId,
    title: input.title ?? "Scheduled follow-up",
    description: input.description,
    source: input.source ?? "Intelligence",
    priority: input.priority ?? "high",
    status,
    actionType: input.actionType ?? "follow-up",
    dueDate,
    memoryReference: input.memoryReference,
  });
}
