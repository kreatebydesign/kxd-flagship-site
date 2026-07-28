/**
 * Safe recommendations — presentation only; never invent status claims.
 */

import type { WorkspaceAction, WorkspaceRecommendation } from "./types";

export function buildWorkspaceRecommendations(
  primaryActions: WorkspaceAction[],
): WorkspaceRecommendation[] {
  const recommendations: WorkspaceRecommendation[] = [];

  for (const action of primaryActions.slice(0, 3)) {
    recommendations.push({
      id: `rec-${action.id}`,
      title: action.label,
      lead:
        action.description ??
        "A useful next step available in your workspace.",
      action,
    });
  }

  return recommendations;
}
