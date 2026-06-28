import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import { createExecutiveEvent } from "@/lib/executive-timeline/create-event";
import { persistAutomationEvent } from "@/lib/automation/actions";
import { recordBrainMemory } from "@/lib/brain/memory";
import { clearBrainCache } from "@/lib/brain/engine";
import {
  publishPlaybookNotification,
  recordPlaybookAutomationHook,
} from "./automation";
import {
  computePercentComplete,
  durationMinutesSince,
  findNextStepId,
  parseIdArray,
  resolveRunStatus,
} from "./progress";
import type { LaunchPlaybookInput, LaunchPlaybookResult, PlaybookDoc, PlaybookRunDetail } from "./types";

const PLAYBOOKS = "playbooks";
const STEPS = "playbook-steps";
const RUNS = "playbook-runs";

async function loadStepsForPlaybook(payload: Awaited<ReturnType<typeof getPayload>>, playbookId: number) {
  const result = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: STEPS as any,
    where: { playbook: { equals: playbookId } },
    limit: 100,
    sort: "order",
    depth: 0,
    overrideAccess: true,
  });
  return result.docs as PlaybookDoc[];
}

export async function launchPlaybookRun(input: LaunchPlaybookInput): Promise<LaunchPlaybookResult> {
  const payload = await getPayload({ config });

  const playbookR = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: PLAYBOOKS as any,
    where: { slug: { equals: input.playbookSlug } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });

  const playbook = playbookR.docs[0] as PlaybookDoc | undefined;
  if (!playbook) return { success: false, error: "Playbook not found" };

  const steps = await loadStepsForPlaybook(payload, playbook.id as number);
  const now = new Date().toISOString();
  const firstStep = steps[0];

  const run = await payload.create({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: RUNS as any,
    data: {
      playbook: playbook.id,
      client: input.clientId,
      project: input.projectId,
      startedBy: input.startedByUserId,
      status: "in-progress",
      startedAt: now,
      percentComplete: 0,
      currentStep: firstStep?.id,
      completedSteps: [],
      skippedSteps: [],
      timelineEventIds: [],
      automationEventIds: [],
      metadata: { launchedAt: now },
    },
    overrideAccess: true,
  });

  const runId = run.id as number;
  const href = `/admin/operations/playbooks/runs/${runId}`;

  const timeline = await createExecutiveEvent(
    {
      client: input.clientId,
      project: input.projectId,
      eventType: "playbook",
      title: `Playbook started — ${String(playbook.name)}`,
      summary: `Run #${runId} initiated`,
      category: "system",
      importance: "normal",
      sourceModule: "Manual",
      metadata: { runId, playbookSlug: input.playbookSlug },
    },
    payload,
  );

  const autoId = await persistAutomationEventWrapper(payload, {
    eventName: "playbook.started",
    clientId: input.clientId,
    payload: { runId, playbookSlug: input.playbookSlug, playbookName: playbook.name },
  });

  await publishPlaybookNotification(payload, {
    title: `Playbook started — ${String(playbook.name)}`,
    summary: "New operational run initiated",
    clientId: input.clientId,
    severity: "info",
    href,
    runId,
  });

  await payload.update({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: RUNS as any,
    id: runId,
    data: {
      timelineEventIds: [timeline.id],
      automationEventIds: autoId ? [autoId] : [],
    },
    overrideAccess: true,
  });

  return { success: true, runId, href };
}

async function persistAutomationEventWrapper(
  payload: Awaited<ReturnType<typeof getPayload>>,
  input: { eventName: string; clientId: number; payload: Record<string, unknown> },
): Promise<number | null> {
  const doc = await persistAutomationEvent(
    {
      module: "Automation",
      eventName: input.eventName,
      clientId: input.clientId,
      payload: input.payload,
      skipRules: true,
    },
    payload,
  );
  return doc.id as number;
}

export async function completePlaybookStep(
  runId: number,
  stepId: number,
): Promise<{ success: boolean; error?: string }> {
  const payload = await getPayload({ config });
  const run = (await payload.findByID({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: RUNS as any,
    id: runId,
    depth: 1,
    overrideAccess: true,
  })) as PlaybookDoc;

  const playbookId =
    typeof run.playbook === "object" ? (run.playbook as PlaybookDoc).id : run.playbook;
  const clientId = typeof run.client === "object" ? (run.client as PlaybookDoc).id : run.client;
  const playbookName =
    typeof run.playbook === "object" ? String((run.playbook as PlaybookDoc).name) : "Playbook";

  const steps = await loadStepsForPlaybook(payload, playbookId as number);
  const step = steps.find((s) => s.id === stepId);
  if (!step) return { success: false, error: "Step not found" };

  const completed = parseIdArray(run.completedSteps);
  const skipped = parseIdArray(run.skippedSteps);
  if (!completed.includes(stepId)) completed.push(stepId);

  const percent = computePercentComplete(steps.length, completed, skipped);
  const status = resolveRunStatus(steps.length, completed, skipped, String(run.status) as PlaybookRunDetail["status"]);
  const nextStepId = findNextStepId(steps, completed, skipped);
  const now = new Date().toISOString();
  const completedAt = status === "completed" ? now : run.completedAt;

  const timeline = await createExecutiveEvent(
    {
      client: clientId as number,
      eventType: "playbook-step",
      title: `Step completed — ${String(step.title)}`,
      summary: `${playbookName} · ${percent}% complete`,
      category: "system",
      sourceModule: "Manual",
      metadata: { runId, stepId },
    },
    payload,
  );

  const hookId = await recordPlaybookAutomationHook(payload, {
    trigger: String(step.automationTrigger ?? "none"),
    clientId: clientId as number,
    playbookName,
    stepTitle: String(step.title),
    runId,
  });

  const timelineIds = [...parseIdArray(run.timelineEventIds), timeline.id as number];
  const automationIds = [...parseIdArray(run.automationEventIds)];
  if (hookId) automationIds.push(hookId);

  const autoStepId = await persistAutomationEventWrapper(payload, {
    eventName: "playbook.step.completed",
    clientId: clientId as number,
    payload: { runId, stepId, title: step.title, percent },
  });
  if (autoStepId) automationIds.push(autoStepId);

  const playbookSlug =
    typeof run.playbook === "object" && run.playbook !== null && "slug" in run.playbook
      ? String((run.playbook as PlaybookDoc).slug)
      : "";
  if (playbookSlug === "website-launch") {
    const { isWebsiteLaunchQaStep, launchQaHrefForClient } = await import("@/lib/launch-qa/playbooks");
    if (isWebsiteLaunchQaStep(String(step.title))) {
      await createExecutiveEvent(
        {
          client: clientId as number,
          eventType: "launch-qa.playbook-step",
          title: "Website Launch QA checkpoint",
          summary: `Complete Launch QA before go-live — ${launchQaHrefForClient(clientId as number)}`,
          category: "launch",
          importance: "high",
          sourceModule: "Manual",
          metadata: { runId, stepId, href: launchQaHrefForClient(clientId as number) },
        },
        payload,
      );
    }
  }

  await payload.update({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: RUNS as any,
    id: runId,
    data: {
      completedSteps: completed,
      percentComplete: percent,
      status,
      currentStep: nextStepId,
      completedAt,
      durationMinutes: durationMinutesSince(run.startedAt as string),
      timelineEventIds: timelineIds,
      automationEventIds: automationIds,
    },
    overrideAccess: true,
  });

  if (status === "completed") {
    await finalizePlaybookRun(payload, runId, clientId as number, playbookName, percent);
  }

  return { success: true };
}

export async function skipPlaybookStep(runId: number, stepId: number) {
  const payload = await getPayload({ config });
  const run = (await payload.findByID({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: RUNS as any,
    id: runId,
    depth: 1,
    overrideAccess: true,
  })) as PlaybookDoc;

  const playbookId =
    typeof run.playbook === "object" ? (run.playbook as PlaybookDoc).id : run.playbook;
  const steps = await loadStepsForPlaybook(payload, playbookId as number);
  const completed = parseIdArray(run.completedSteps);
  const skipped = parseIdArray(run.skippedSteps);
  if (!skipped.includes(stepId)) skipped.push(stepId);

  const percent = computePercentComplete(steps.length, completed, skipped);
  const status = resolveRunStatus(steps.length, completed, skipped, String(run.status) as PlaybookRunDetail["status"]);
  const nextStepId = findNextStepId(steps, completed, skipped);

  await payload.update({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: RUNS as any,
    id: runId,
    data: {
      skippedSteps: skipped,
      percentComplete: percent,
      status,
      currentStep: nextStepId,
      durationMinutes: durationMinutesSince(run.startedAt as string),
    },
    overrideAccess: true,
  });

  return { success: true };
}

export async function blockPlaybookRun(runId: number, reason?: string) {
  const payload = await getPayload({ config });
  const run = (await payload.findByID({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: RUNS as any,
    id: runId,
    depth: 1,
    overrideAccess: true,
  })) as PlaybookDoc;

  const clientId = typeof run.client === "object" ? (run.client as PlaybookDoc).id : run.client;
  const playbookName =
    typeof run.playbook === "object" ? String((run.playbook as PlaybookDoc).name) : "Playbook";
  const href = `/admin/operations/playbooks/runs/${runId}`;

  await payload.update({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: RUNS as any,
    id: runId,
    data: { status: "blocked" },
    overrideAccess: true,
  });

  await publishPlaybookNotification(payload, {
    title: `Playbook blocked — ${playbookName}`,
    summary: reason ?? "Run marked as blocked",
    clientId: clientId as number,
    severity: "warning",
    href,
    runId,
  });

  await persistAutomationEventWrapper(payload, {
    eventName: "playbook.blocked",
    clientId: clientId as number,
    payload: { runId, reason },
  });

  return { success: true };
}

async function finalizePlaybookRun(
  payload: Awaited<ReturnType<typeof getPayload>>,
  runId: number,
  clientId: number,
  playbookName: string,
  percent: number,
) {
  const href = `/admin/operations/playbooks/runs/${runId}`;

  await publishPlaybookNotification(payload, {
    title: `Playbook completed — ${playbookName}`,
    summary: `Run finished at ${percent}%`,
    clientId,
    severity: "success",
    href,
    runId,
  });

  await persistAutomationEventWrapper(payload, {
    eventName: "playbook.completed",
    clientId,
    payload: { runId, playbookName },
  });

  await recordBrainMemory({
    recommendationId: `playbook-run-${runId}`,
    action: "completed",
    clientId,
    title: playbookName,
  });
  clearBrainCache();
}
