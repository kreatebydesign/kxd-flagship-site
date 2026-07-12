import "server-only";

import { getClientIntelligenceView, getClientInsight } from "../client";
import { contextForWorkspace } from "./registry";

/** Client Success — relationship intelligence without static recommendation sprawl. */
export async function loadClientSuccessIntelligence(clientId: number) {
  const context = contextForWorkspace("client-success", { clientId });
  const [insight, view] = await Promise.all([
    getClientInsight(clientId, context),
    getClientIntelligenceView(clientId, context),
  ]);
  return { insight, view, workspaceId: "client-success" as const };
}
