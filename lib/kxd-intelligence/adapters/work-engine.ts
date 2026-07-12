import "server-only";

import { getWorkInsight, getWorkIntelligenceView } from "../work";
import { contextForWorkspace } from "./registry";

/** Work Engine — priority architecture without local overdue heuristics. */
export async function loadWorkEngineIntelligence(workId?: number | null) {
  const context = contextForWorkspace("work-engine", { workId: workId ?? null });
  const [insight, view] = await Promise.all([
    getWorkInsight(workId, context),
    getWorkIntelligenceView(workId, context),
  ]);
  return { insight, view, workspaceId: "work-engine" as const };
}
