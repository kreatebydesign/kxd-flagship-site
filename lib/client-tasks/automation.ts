import "server-only";

import type { Payload } from "payload";
import { clearBrainCache } from "@/lib/brain/engine";
import { recordBrainMemory } from "@/lib/brain/memory";
import { createExecutiveEvent } from "@/lib/executive-timeline/create-event";
import { persistAutomationEvent, publishNotification } from "@/lib/automation/actions";
import type { TaskStatus } from "./types";

export async function recordTaskAutomationEvent(
  payload: Payload,
  input: {
    eventName: string;
    clientId: number;
    taskId: number;
    taskTitle: string;
    status?: TaskStatus;
  },
): Promise<number | null> {
  const doc = await persistAutomationEvent(
    {
      module: "Automation",
      eventName: input.eventName,
      clientId: input.clientId,
      payload: {
        taskId: input.taskId,
        taskTitle: input.taskTitle,
        status: input.status,
        architectureOnly: true,
      },
      skipRules: true,
    },
    payload,
  );
  return doc.id as number;
}

export async function onTaskCompleted(
  payload: Payload,
  input: {
    clientId: number;
    taskId: number;
    taskTitle: string;
    category: string;
  },
): Promise<void> {
  await createExecutiveEvent(
    {
      client: input.clientId,
      eventType: "client-milestone",
      title: `Task completed — ${input.taskTitle}`,
      summary: `${input.category} work completed`,
      category: "project",
      sourceModule: "Manual",
      metadata: { taskId: input.taskId },
    },
    payload,
  );

  await publishNotification(
    {
      title: `Task completed — ${input.taskTitle}`,
      summary: "Client work item marked complete",
      clientId: input.clientId,
      severity: "success",
      module: "Client Work",
      metadata: {
        href: `/admin/operations/work/${input.clientId}`,
        taskId: input.taskId,
        source: "client-tasks",
      },
    },
    payload,
  );

  await recordTaskAutomationEvent(payload, {
    eventName: "client-task.completed",
    clientId: input.clientId,
    taskId: input.taskId,
    taskTitle: input.taskTitle,
    status: "completed",
  });

  await recordBrainMemory({
    recommendationId: `task-complete-${input.taskId}`,
    action: "completed",
    clientId: input.clientId,
    title: input.taskTitle,
  });
  clearBrainCache();
}

export async function onTaskBlocked(
  payload: Payload,
  input: {
    clientId: number;
    taskId: number;
    taskTitle: string;
    reason?: string;
  },
): Promise<void> {
  await publishNotification(
    {
      title: `Task blocked — ${input.taskTitle}`,
      summary: input.reason ?? "Work item requires attention",
      clientId: input.clientId,
      severity: "warning",
      module: "Client Work",
      metadata: {
        href: `/admin/operations/work/${input.clientId}`,
        taskId: input.taskId,
        source: "client-tasks",
      },
    },
    payload,
  );

  await recordTaskAutomationEvent(payload, {
    eventName: "client-task.blocked",
    clientId: input.clientId,
    taskId: input.taskId,
    taskTitle: input.taskTitle,
    status: "blocked",
  });
}
