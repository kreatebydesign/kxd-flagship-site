import "server-only";

import { cache } from "react";
import { getPayload } from "payload";
import config from "@payload-config";
import { buildCommunicationsSnapshot } from "@/lib/client-command/communications/data";
import type { ClientCommunicationDoc } from "@/lib/client-command/communications/types";
import { loadIntelligenceContext } from "../context";
import { getWorkWorkspace } from "@/lib/work/engine";
import { getReviewInbox } from "@/lib/website-review-inbox/data";
import {
  buildBusinessHealth,
  buildOperationalHealth,
  buildRelationshipHealth,
} from "./health";
import {
  KXD_BUSINESS_TIMEZONE,
  resolveRequestTimezone,
} from "@/lib/platform/timezone";
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
import type {
  BriefingCommunicationItem,
  BriefingInputContext,
  ExecutiveBriefing,
} from "./types";

function resolveCommunicationClient(doc: ClientCommunicationDoc): {
  clientId: number | null;
  clientName: string;
} {
  const raw = doc.client;
  if (typeof raw === "number") {
    return { clientId: raw, clientName: `Client #${raw}` };
  }
  if (raw && typeof raw === "object") {
    const id = typeof raw.id === "number" ? raw.id : Number(raw.id) || null;
    const name = raw.name ? String(raw.name) : id != null ? `Client #${id}` : "Client";
    return { clientId: id, clientName: name };
  }
  return { clientId: null, clientName: "Client" };
}

async function loadPortfolioCommunications(): Promise<BriefingInputContext["communications"]> {
  const payload = await getPayload({ config });
  try {
    const result = await payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "client-communications" as any,
      limit: 300,
      depth: 1,
      sort: "-date",
      overrideAccess: true,
    });
    const docs = result.docs as ClientCommunicationDoc[];
    const snapshot = buildCommunicationsSnapshot(docs);
    const needsReply: BriefingCommunicationItem[] = docs
      .filter((doc) => String(doc.status ?? "") === "needs_reply")
      .map((doc) => {
        const { clientId, clientName } = resolveCommunicationClient(doc);
        const subject =
          (doc.subject ? String(doc.subject) : null) ||
          (doc.summary ? String(doc.summary) : null) ||
          "Communication needs reply";
        return {
          id: doc.id as number,
          clientId,
          clientName,
          subject,
          date: String(doc.date ?? doc.createdAt ?? ""),
          status: "needs_reply",
          href: `/admin/collections/client-communications/${doc.id}`,
        };
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return {
      needsReplyCount: snapshot.needsReplyCount,
      staleUnresolvedCount: snapshot.staleUnresolvedCount,
      overdueFollowUpCount: snapshot.overdueFollowUps.length,
      openCount: snapshot.openCount,
      needsReply,
    };
  } catch {
    return {
      needsReplyCount: 0,
      staleUnresolvedCount: 0,
      overdueFollowUpCount: 0,
      openCount: 0,
      needsReply: [],
    };
  }
}

async function loadBriefingContextUncached(): Promise<BriefingInputContext> {
  const [intelligence, work, reviewInbox, communications] = await Promise.all([
    loadIntelligenceContext(),
    getWorkWorkspace(),
    getReviewInbox(),
    loadPortfolioCommunications(),
  ]);

  return {
    intelligence,
    work,
    reviewInbox: {
      newCount: reviewInbox.newCount,
      activeCount: reviewInbox.activeCount,
      items: reviewInbox.items,
    },
    communications,
    generatedAt: new Date().toISOString(),
  };
}

/** Request-scoped — Morning Brief + Observer share one load. */
export const loadBriefingContext = cache(loadBriefingContextUncached);

export function buildExecutiveBriefing(
  input: BriefingInputContext,
  memory: BrainMemoryRecord[] = [],
  timeZone: string = KXD_BUSINESS_TIMEZONE,
): ExecutiveBriefing {
  const { greeting, dateDisplay, timeDisplay } = buildBriefingGreeting(
    new Date(input.generatedAt),
    timeZone,
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
  const [context, memory, timeZone] = await Promise.all([
    loadBriefingContext(),
    loadBrainMemory(200),
    resolveRequestTimezone(),
  ]);
  return buildExecutiveBriefing(context, memory, timeZone);
}
