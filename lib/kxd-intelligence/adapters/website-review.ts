import "server-only";

import { getWorkspaceInsight } from "../workspace";
import { getRecommendation } from "../recommendation";
import { contextForWorkspace } from "./registry";

/** Website Review — future review-signal intelligence. */
export async function loadWebsiteReviewIntelligence(clientId?: number | null) {
  const context = contextForWorkspace("website-review", {
    clientId: clientId ?? null,
  });
  const [insight, recommendation] = await Promise.all([
    getWorkspaceInsight("website-review", context),
    getRecommendation(context),
  ]);
  return { insight, recommendation, workspaceId: "website-review" as const };
}
