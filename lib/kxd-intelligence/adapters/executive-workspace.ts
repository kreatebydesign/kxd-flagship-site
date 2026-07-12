import "server-only";

import { getExecutiveInsight } from "../executive";
import { getRecommendation } from "../recommendation";
import { getOperationalWarning } from "../warning";
import { contextForWorkspace } from "./registry";
import type { ExecutiveBusinessStatus } from "@/lib/executive-workspace/types";

/**
 * Executive Workspace — header status + quiet top insight.
 * Client chrome keeps a calm sync default; server surfaces can call this.
 */
export async function loadExecutiveWorkspaceIntelligence() {
  const context = contextForWorkspace("executive-workspace");
  const [insight, recommendation, warning] = await Promise.all([
    getExecutiveInsight(context),
    getRecommendation(context),
    getOperationalWarning(context),
  ]);

  const status = mapInsightToBusinessStatus(insight);
  return {
    insight,
    recommendation,
    warning,
    status,
    workspaceId: "executive-workspace" as const,
  };
}

export function mapInsightToBusinessStatus(
  insight: Awaited<ReturnType<typeof getExecutiveInsight>>,
): ExecutiveBusinessStatus {
  if (!insight) {
    return {
      label: "Operating",
      detail: "Studio systems online",
      tone: "calm",
    };
  }

  if (insight.urgency === "critical" || insight.shouldActNow) {
    return {
      label: "Attention",
      detail: insight.title,
      tone: "attention",
    };
  }

  if (insight.urgency === "high" || insight.urgency === "medium") {
    return {
      label: "Watching",
      detail: insight.title,
      tone: "watch",
    };
  }

  return {
    label: "Operating",
    detail: insight.title,
    tone: "calm",
  };
}
