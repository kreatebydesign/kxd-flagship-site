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

export function buildExecutiveBriefing(input: BriefingInputContext): ExecutiveBriefing {
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
  const recommendedActions = buildRecommendedActions({ priorities: topPriorities, risks: businessRisks });
  const platformStatus = buildPlatformStatus(input);
  const confidence = computeBriefingConfidence(input);

  return {
    greeting,
    dateDisplay,
    timeDisplay,
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
  const context = await loadBriefingContext();
  return buildExecutiveBriefing(context);
}
