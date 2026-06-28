import "server-only";

import type { Payload } from "payload";
import { getPayload } from "payload";
import config from "@payload-config";
import { publishers } from "@/lib/automation/publishers";
import { createExecutiveNote } from "@/lib/executive-notes/engine";
import { createExecutiveEvent } from "@/lib/executive-timeline/create-event";
import { launchClientWorkflow } from "@/lib/client-launch/launch-client-workflow";
import { createTask } from "@/lib/client-tasks/runner";
import { launchPlaybookRun } from "@/lib/playbooks/runner";
import { blueprintSummaryText } from "./blueprints";
import {
  generateSessionBlueprints,
  getGenesisSession,
} from "./engine";
import { genesisToLaunchDraft } from "./launch-map";
import { getGenesisTemplate } from "./templates";
import type { GenesisCompletionResult } from "./types";

export async function completeGenesisSession(
  sessionId: number,
  createdBy: string,
  payloadInstance?: Payload,
): Promise<GenesisCompletionResult> {
  const payload = payloadInstance ?? await getPayload({ config });
  let session = await getGenesisSession(sessionId);
  if (!session) return { success: false, sessionId, error: "Genesis session not found." };

  if (!session.discovery.businessFoundation.businessName.trim()) {
    return { success: false, sessionId, error: "Business name is required." };
  }

  if (!session.blueprints || session.blueprintStatus === "pending") {
    session = await generateSessionBlueprints(sessionId) ?? session;
  }

  const blueprints = session.blueprints;
  if (!blueprints) {
    return { success: false, sessionId, error: "Blueprint generation failed." };
  }

  const template = getGenesisTemplate(session.templateId);
  const launchDraft = genesisToLaunchDraft(session.discovery, session.templateId);

  let clientId = session.clientId;
  let projectId = session.projectId;

  if (!clientId) {
    const launch = await launchClientWorkflow(payload, launchDraft, createdBy, {
      timeline: {
        eventType: "client-milestone",
        title: "Genesis engagement initiated",
        summary: `${session.discovery.businessFoundation.businessName} began through KXD Genesis.`,
        source: "kxd-genesis",
      },
      rawNotes: blueprintSummaryText(blueprints),
    });
    clientId = launch.clientId;
  }

  if (!projectId) {
    const project = await payload.create({
      collection: "client-projects",
      data: {
        projectName: `${session.discovery.businessFoundation.businessName} — Genesis Engagement`,
        client: clientId,
        projectType: "website",
        status: "active",
        priority: "high",
        notes: `Created from KXD Genesis session ${sessionId}. ${session.discovery.businessFoundation.businessGoals}`,
      },
      overrideAccess: true,
    });
    projectId = project.id as number;
  }

  await createExecutiveEvent({
    client: clientId,
    project: projectId,
    eventType: "genesis.completed",
    title: "KXD Genesis blueprint applied",
    summary: `Engagement architecture completed via Genesis (${template.name}).`,
    category: "onboarding",
    importance: "high",
    sourceModule: "Launch",
    createdBy,
    metadata: { genesisSessionId: sessionId, templateId: session.templateId },
    internalOnly: true,
  }, payload);

  await createExecutiveNote({
    clientId,
    title: "Genesis Executive Strategy Blueprint",
    summary: blueprintSummaryText(blueprints).slice(0, 4000),
    noteType: "strategy",
    priority: "high",
    pinned: true,
    author: createdBy,
  });

  await createExecutiveNote({
    clientId,
    title: "Genesis Production Drafts",
    summary: template.productionDrafts.join("\n"),
    noteType: "research",
    priority: "normal",
    author: createdBy,
  });

  const playbookRunIds: number[] = [];
  for (const slug of template.playbookSlugs) {
    const result = await launchPlaybookRun({
      playbookSlug: slug,
      clientId,
      projectId,
    });
    if (result.success && result.runId) playbookRunIds.push(result.runId);
  }

  const taskIds: number[] = [];
  for (const item of template.workTemplates) {
    const result = await createTask({
      clientId,
      projectId,
      title: item.title,
      description: item.description ?? `Genesis work template — ${template.name}`,
      category: item.category,
      priority: item.priority,
      status: "to-do",
      createdFrom: `genesis:${sessionId}`,
    });
    if (result.success && result.taskId) taskIds.push(result.taskId);
  }

  const existingPlan = await payload.find({
    collection: "client-success-plans",
    where: { client: { equals: clientId } },
    limit: 1,
    overrideAccess: true,
  });

  if (existingPlan.docs.length === 0) {
    await payload.create({
      collection: "client-success-plans",
      data: {
        client: clientId,
        quarterlyGoals: session.discovery.launchPlanning.successMetrics,
        yearlyGoals: session.discovery.businessFoundation.growthTargets,
        currentFocus: session.discovery.launchPlanning.clientSuccessPlan || template.name,
        carePlan: session.discovery.launchPlanning.reportingSchedule,
        opportunities: session.discovery.businessFoundation.businessGoals,
        risks: session.discovery.businessFoundation.currentPainPoints,
        successScore: session.launchReadiness,
      },
      overrideAccess: true,
    });
  }

  const kickoffDate = new Date();
  kickoffDate.setDate(kickoffDate.getDate() + 7);
  await payload.create({
    collection: "success-check-ins",
    data: {
      client: clientId,
      meetingDate: kickoffDate.toISOString(),
      summary: "Genesis kickoff meeting — placeholder scheduled from Genesis completion.",
      wins: session.discovery.businessFoundation.businessGoals,
      completed: false,
      followUpDate: kickoffDate.toISOString(),
    },
    overrideAccess: true,
  });

  try {
    await publishers.onboarding.submitted(
      {
        clientId,
        summary: `Genesis engagement blueprint applied (${template.name}).`,
        readinessScore: session.launchReadiness,
      },
      payload,
    );
  } catch (err) {
    console.error("[KXD Genesis] Automation publish failed:", err);
  }

  await payload.update({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "genesis-sessions" as any,
    id: sessionId,
    data: {
      client: clientId,
      project: projectId,
      status: "completed",
      blueprintStatus: "applied",
      completedAt: new Date().toISOString(),
      launchReadiness: 100,
      recommendedNextStep: "Open Client Command Center — engagement is live.",
    },
    overrideAccess: true,
  });

  const clientName = session.discovery.businessFoundation.businessName;

  return {
    success: true,
    sessionId,
    clientId,
    clientName,
    projectId,
    commandCenterHref: `/admin/operations/client-command/${clientId}`,
    genesisHref: `/admin/operations/genesis/${sessionId}`,
    playbookRunIds,
    taskIds,
  };
}
