import "server-only";

import { getExecutiveInsight, getExecutiveInsights } from "../executive";
import { getRecommendation } from "../recommendation";
import { getOperationalWarning } from "../warning";
import { contextForWorkspace } from "./registry";

/** Morning Brief — consume without redesigning the ritual UI. */
export async function loadMorningBriefIntelligence() {
  const context = contextForWorkspace("morning-brief");
  const [insight, insights, recommendation, warning] = await Promise.all([
    getExecutiveInsight(context),
    getExecutiveInsights({ ...context, limit: 5 }),
    getRecommendation(context),
    getOperationalWarning(context),
  ]);
  return { insight, insights, recommendation, warning, workspaceId: "morning-brief" as const };
}
