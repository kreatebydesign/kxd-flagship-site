import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import { calculateClientHealth } from "@/lib/client-health/health-engine";
import { fetchClientWorkspace } from "@/lib/executive-client-workspace/fetch-client-workspace";
import { getExecutiveTimelineClient } from "@/lib/executive-timeline/data";
import { getClientInfrastructure } from "@/lib/infrastructure/data";
import { buildClientInsightSections } from "@/lib/intelligence/summaries";
import { buildClientRecommendations } from "@/lib/intelligence/recommendations";
import { loadIntelligenceContext } from "@/lib/intelligence/context";
import { buildQuickActions } from "./actions";
import { getClientPlaybookSummary } from "@/lib/playbooks";
import { getClientStrategySummary } from "@/lib/executive-notes/vault";
import {
  buildCommandHero,
  buildCommandRecommendations,
  buildCommandSections,
  buildExecutiveBrief,
  buildWidgetInputFromContext,
} from "./widgets";
import type { ClientCommandCenterData, CommandDoc } from "./types";

async function fetchClientBrandKits(cid: number): Promise<CommandDoc[]> {
  const payload = await getPayload({ config });
  try {
    const result = await payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "brand-kits" as any,
      where: { client: { equals: cid } },
      limit: 12,
      depth: 0,
      sort: "-updatedAt",
      overrideAccess: true,
    });
    return result.docs as CommandDoc[];
  } catch {
    return [];
  }
}

async function fetchClientCreativeAssets(cid: number): Promise<CommandDoc[]> {
  const payload = await getPayload({ config });
  try {
    const result = await payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "creative-assets" as any,
      where: { client: { equals: cid } },
      limit: 12,
      depth: 0,
      sort: "-updatedAt",
      overrideAccess: true,
    });
    return result.docs as CommandDoc[];
  } catch {
    return [];
  }
}

async function fetchClientAutomation(cid: number): Promise<{
  events: CommandDoc[];
  notifications: CommandDoc[];
  failures: CommandDoc[];
  healthRecalculations: number;
}> {
  const payload = await getPayload({ config });

  const [eventsR, notificationsR, failuresR, healthR] = await Promise.allSettled([
    payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "automation-events" as any,
      where: { client: { equals: cid } },
      limit: 15,
      sort: "-createdAt",
      depth: 0,
      overrideAccess: true,
    }),
    payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "automation-notifications" as any,
      where: { client: { equals: cid } },
      limit: 8,
      sort: "-createdAt",
      depth: 0,
      overrideAccess: true,
    }),
    payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "automation-events" as any,
      where: {
        and: [{ client: { equals: cid } }, { status: { equals: "failed" } }],
      },
      limit: 6,
      sort: "-createdAt",
      depth: 0,
      overrideAccess: true,
    }),
    payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "automation-events" as any,
      where: {
        and: [
          { client: { equals: cid } },
          { eventName: { equals: "health.recalculated" } },
        ],
      },
      limit: 100,
      depth: 0,
      overrideAccess: true,
    }),
  ]);

  return {
    events: eventsR.status === "fulfilled" ? (eventsR.value.docs as CommandDoc[]) : [],
    notifications:
      notificationsR.status === "fulfilled" ? (notificationsR.value.docs as CommandDoc[]) : [],
    failures: failuresR.status === "fulfilled" ? (failuresR.value.docs as CommandDoc[]) : [],
    healthRecalculations:
      healthR.status === "fulfilled" ? healthR.value.docs.length : 0,
  };
}

export async function loadClientCommandCenter(
  clientId: number,
): Promise<ClientCommandCenterData | null> {
  const ctx = await loadIntelligenceContext();
  if (!ctx.clientsById.has(clientId)) return null;

  const [
    workspace,
    infrastructure,
    timeline,
    brandKits,
    creativeAssets,
    automation,
    strategy,
    playbookSummary,
  ] = await Promise.all([
    fetchClientWorkspace(clientId),
    getClientInfrastructure(clientId),
    getExecutiveTimelineClient(clientId),
    fetchClientBrandKits(clientId),
    fetchClientCreativeAssets(clientId),
    fetchClientAutomation(clientId),
    getClientStrategySummary(clientId),
    getClientPlaybookSummary(clientId),
  ]);

  const insights = await buildClientInsightSections(clientId, ctx);
  const recommendations = buildClientRecommendations(clientId, ctx);
  const health = calculateClientHealth(clientId, ctx.healthCtx);

  const widgetInput = buildWidgetInputFromContext(clientId, ctx, {
    workspace,
    infrastructure,
    timeline,
    insights,
    health,
    brandKits,
    creativeAssets,
    automation,
    strategy,
  });

  const hero = buildCommandHero(widgetInput);
  const sections = buildCommandSections(widgetInput);
  const executiveBrief = buildExecutiveBrief({
    insights,
    health,
    proposals: widgetInput.proposals,
    reports: widgetInput.reports,
    profile: widgetInput.profile,
    recommendations,
  });

  return {
    clientId,
    hero,
    executiveBrief,
    sections,
    recommendations: buildCommandRecommendations(recommendations),
    quickActions: buildQuickActions(clientId),
    playbooks: playbookSummary,
    insights,
    health,
    row: widgetInput.row,
    generatedAt: new Date().toISOString(),
  };
}
