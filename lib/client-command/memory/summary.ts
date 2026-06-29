import type { ClientWorkspaceBundle } from "../workspace-types";
import { extractClientMemorySignals } from "./signals";
import {
  buildMemoryInsights,
  computeMemoryScores,
  describeRelationshipHealth,
} from "./insights";
import { buildMemoryRecommendations } from "./recommendations";
import type { ClientMemoryAiPayload, ClientMemorySnapshot } from "./types";

function buildExecutiveSummaryLines(
  bundle: Omit<ClientWorkspaceBundle, "memory" | "actions">,
  scores: ClientMemorySnapshot["scores"],
  signalCount: number,
): string[] {
  const lines: string[] = [];
  const name = bundle.header.companyName;

  lines.push(
    `${name} — ${bundle.header.relationshipStatus.replace(/-/g, " ")} relationship with health score ${scores.relationshipHealthScore}/100.`,
  );

  if (bundle.analytics.activeProjects > 0) {
    lines.push(
      `${bundle.analytics.activeProjects} active project${bundle.analytics.activeProjects === 1 ? "" : "s"} and ${bundle.analytics.openRequests} open request${bundle.analytics.openRequests === 1 ? "" : "s"} in the queue.`,
    );
  }

  if (bundle.communications.needsReplyCount > 0) {
    lines.push(
      `${bundle.communications.needsReplyCount} communication${bundle.communications.needsReplyCount === 1 ? "" : "s"} awaiting reply.`,
    );
  }

  if (bundle.retainerDocs.length > 0) {
    const mrr = bundle.header.monthlyRevenue;
    lines.push(
      mrr != null
        ? `Retainer in place — approximately ${new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(mrr)}/month tracked.`
        : "Active retainer relationship on file.",
    );
  } else if (bundle.header.status === "active") {
    lines.push("No retainer agreement — recurring revenue opportunity remains open.");
  }

  if (scores.urgencyScore >= 60) {
    lines.push("Elevated urgency — address follow-ups and blockers this week.");
  } else if (scores.momentumScore >= 70) {
    lines.push("Positive momentum — recent wins support expansion conversations.");
  }

  if (signalCount === 0) {
    lines.push("Limited workspace signals — log communications and projects to enrich memory.");
  }

  return lines.slice(0, 6);
}

function deriveCurrentStatus(
  bundle: Omit<ClientWorkspaceBundle, "memory" | "actions">,
  scores: ClientMemorySnapshot["scores"],
): string {
  if (scores.urgencyScore >= 70) return "Needs immediate attention";
  if (scores.retentionRiskScore >= 60) return "Retention risk — engage proactively";
  if (scores.momentumScore >= 75) return "Strong momentum";
  if (bundle.analytics.activeProjects > 0) return "Active delivery";
  if (bundle.header.status !== "active") return String(bundle.header.status).replace(/-/g, " ");
  return "Stable — monitor follow-ups";
}

export interface ClientMemoryBuildOptions {
  dismissedCounts?: Map<string, number>;
  fastCompletions48h?: number;
}

function filterActionsByDismissals(
  actions: ClientMemorySnapshot["nextBestActions"],
  dismissedCounts?: Map<string, number>,
): ClientMemorySnapshot["nextBestActions"] {
  if (!dismissedCounts || dismissedCounts.size === 0) return actions;
  return actions.filter((a) => {
    const ref = `intel:${a.id}`;
    const count = dismissedCounts.get(ref) ?? 0;
    return count < 3;
  });
}

export function buildClientMemory(
  bundle: Omit<ClientWorkspaceBundle, "memory" | "actions">,
  options?: ClientMemoryBuildOptions,
): ClientMemorySnapshot {
  const signals = extractClientMemorySignals(bundle);
  const insights = buildMemoryInsights(signals);
  const scores = computeMemoryScores(
    signals,
    bundle.header.healthScore,
    options?.fastCompletions48h ?? 0,
  );
  const nextBestActions = filterActionsByDismissals(
    buildMemoryRecommendations(bundle, signals),
    options?.dismissedCounts,
  );
  const relationshipHealth = describeRelationshipHealth(scores.relationshipHealthScore);

  return {
    clientId: bundle.clientId,
    clientName: bundle.header.companyName,
    executiveSummary: buildExecutiveSummaryLines(bundle, scores, signals.length),
    currentStatus: deriveCurrentStatus(bundle, scores),
    wins: insights.wins,
    risks: insights.risks,
    followUpsNeeded: insights.followUpsNeeded,
    revenueOpportunities: insights.revenueOpportunities,
    retainerOpportunities: insights.retainerOpportunities,
    upsellIdeas: insights.upsellIdeas,
    relationshipHealth,
    memoryNotes: insights.memoryNotes,
    scores,
    nextBestActions,
    generatedAt: new Date().toISOString(),
  };
}

/** Structured payload for future KXD Brain / LLM adapters. */
export function buildClientMemoryAiPayload(
  bundle: Omit<ClientWorkspaceBundle, "memory" | "actions">,
  options?: ClientMemoryBuildOptions,
): ClientMemoryAiPayload {
  const memory = buildClientMemory(bundle, options);
  const signals = extractClientMemorySignals(bundle);
  return {
    clientId: memory.clientId,
    clientName: memory.clientName,
    scores: memory.scores,
    executiveSummary: memory.executiveSummary,
    signals,
    nextBestActions: memory.nextBestActions,
    generatedAt: memory.generatedAt,
  };
}
