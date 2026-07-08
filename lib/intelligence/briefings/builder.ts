import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import { buildCommunicationsSnapshot } from "@/lib/client-command/communications/data";
import type { ClientCommunicationDoc } from "@/lib/client-command/communications/types";
import { loadIntelligenceContext } from "../context";
import { getWorkWorkspace } from "@/lib/work/engine";
import { getReviewInboxSummary } from "@/lib/website-review-inbox/data";
import {
  buildBusinessHealth,
  buildOperationalHealth,
  buildRelationshipHealth,
} from "./health";
import { buildBriefingGreeting } from "./overview";
import { buildWhatChanged } from "./summaries";
import { buildTopPriorities } from "./priorities";
import { buildBusinessRisks } from "./risks";
import { buildBusinessOpportunities } from "./opportunities";
import {
  buildPlatformStatus,
  buildRecommendedActions,
  computeBriefingConfidence,
} from "./sections";
import {
  buildExecutiveHealthSnapshot,
  buildExecutiveNarrative,
  detectStaleRequest,
} from "./narrative";
import { enrichRecommendations } from "./recommendation-intelligence";
import { buildExecutiveInsights } from "./insights";
import type { BrainMemoryRecord } from "@/lib/brain/types";
import type { BriefingInputContext, ExecutiveBriefing } from "./types";

async function loadPortfolioCommunications(): Promise<BriefingInputContext["communications"]> {
  const payload = await getPayload({ config });
  try {
    const result = await payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "client-communications" as any,
      limit: 300,
      depth: 0,
      sort: "-date",
      overrideAccess: true,
    });
    const snapshot = buildCommunicationsSnapshot(result.docs as ClientCommunicationDoc[]);
    return {
      needsReplyCount: snapshot.needsReplyCount,
      staleUnresolvedCount: snapshot.staleUnresolvedCount,
      overdueFollowUpCount: snapshot.overdueFollowUps.length,
      openCount: snapshot.openCount,
    };
  } catch {
    return {
      needsReplyCount: 0,
      staleUnresolvedCount: 0,
      overdueFollowUpCount: 0,
      openCount: 0,
    };
  }
}

export async function loadBriefingContext(): Promise<BriefingInputContext> {
  const [intelligence, work, reviewInbox, communications] = await Promise.all([
    loadIntelligenceContext(),
    getWorkWorkspace(),
    getReviewInboxSummary(),
    loadPortfolioCommunications(),
  ]);

  return {
    intelligence,
    work,
    reviewInbox,
    communications,
    generatedAt: new Date().toISOString(),
  };
}

export function buildExecutiveBriefing(
  input: BriefingInputContext,
  memory: BrainMemoryRecord[] = [],
): ExecutiveBriefing {
  const { greeting, dateDisplay, timeDisplay } = buildBriefingGreeting(
    new Date(input.generatedAt),
  );

  const businessHealth = buildBusinessHealth(input);
  const relationshipHealth = buildRelationshipHealth(input);
  const operationalHealth = buildOperationalHealth(input);
  const whatChanged = buildWhatChanged(input);
  const topPriorities = buildTopPriorities(input);
  const businessRisks = buildBusinessRisks(input);
  const businessOpportunities = buildBusinessOpportunities(input);
  const baseRecommendations = buildRecommendedActions({ priorities: topPriorities, risks: businessRisks });
  const recommendedActions = enrichRecommendations(
    baseRecommendations,
    input,
    memory,
    input.generatedAt,
  );
  const platformStatus = buildPlatformStatus(input);
  const confidence = computeBriefingConfidence(input);
  const primaryRecommendation = recommendedActions[0] ?? null;
  const healthSnapshot = buildExecutiveHealthSnapshot({
    businessHealth,
    relationshipHealth,
    operationalHealth,
  });
  const narrative = buildExecutiveNarrative({
    businessHealth,
    relationshipHealth,
    operationalHealth,
    whatChanged,
    topPriorities,
    businessRisks,
    businessOpportunities,
    recommendedActions,
    reviewInbox: input.reviewInbox,
    completedToday: input.work.stats.completedTodayCount,
    staleRequest: detectStaleRequest(input),
  });
  const executiveInsights = buildExecutiveInsights({
    context: input,
    businessHealth,
    relationshipHealth,
    operationalHealth,
    healthSnapshot,
    whatChanged,
    businessRisks,
    memory,
  });

  return {
    greeting,
    dateDisplay,
    timeDisplay,
    narrative,
    healthSnapshot,
    primaryRecommendation,
    executiveInsights,
    businessHealth,
    whatChanged,
    topPriorities,
    businessRisks,
    businessOpportunities,
    relationshipHealth,
    operationalHealth,
    recommendedActions,
    platformStatus,
    generatedAt: input.generatedAt,
    confidence,
  };
}

export async function getExecutiveBriefing(): Promise<ExecutiveBriefing> {
  const { loadBrainMemory } = await import("@/lib/brain/memory");
  const [context, memory] = await Promise.all([
    loadBriefingContext(),
    loadBrainMemory(200),
  ]);
  return buildExecutiveBriefing(context, memory);
}
