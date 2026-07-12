import "server-only";

import { getWorkspaceInsight } from "../workspace";
import { getOperationalWarnings } from "../warning";
import { contextForWorkspace } from "./registry";

/** Activity Center — briefing tone over alert spam. */
export async function loadActivityCenterIntelligence() {
  const context = contextForWorkspace("activity-center");
  const [insight, warnings] = await Promise.all([
    getWorkspaceInsight("activity-center", context),
    getOperationalWarnings({ ...context, limit: 3 }),
  ]);
  return { insight, warnings, workspaceId: "activity-center" as const };
}
