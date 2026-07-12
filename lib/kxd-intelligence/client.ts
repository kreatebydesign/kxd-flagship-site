import "server-only";

import { runIntelligencePipeline } from "./pipeline";
import type {
  ClientIntelligenceView,
  IntelligenceInsight,
  IntelligenceQueryContext,
} from "./types";

/**
 * Client-scoped insight. Adaptive relationship scoring arrives later —
 * architecture returns structured open questions today.
 */
export async function getClientInsight(
  clientId: number,
  context: Omit<IntelligenceQueryContext, "clientId"> = {},
): Promise<IntelligenceInsight | null> {
  const view = await getClientIntelligenceView(clientId, context);
  return view.insight;
}

export async function getClientIntelligenceView(
  clientId: number,
  context: Omit<IntelligenceQueryContext, "clientId"> = {},
): Promise<ClientIntelligenceView> {
  const bundle = await runIntelligencePipeline(
    { ...context, clientId, workspaceId: "client-success", limit: 5 },
    { warmPipeline: false },
  );

  const insight =
    bundle.executive.find((item) => item.domain === "client" || item.relatedClientId === clientId) ??
    bundle.executive[0] ??
    null;

  const primaryRecommendation =
    bundle.recommendations.find((item) => item.relatedClientId === clientId) ??
    bundle.recommendations[0] ??
    null;

  return {
    insight,
    needsAttention: null,
    becomingUnhealthy: null,
    primaryRecommendation,
    openQuestions: [
      "Which relationship needs attention?",
      "Which client is becoming unhealthy?",
      "What recommendation actually matters right now?",
    ],
    architectureReady: true,
  };
}
