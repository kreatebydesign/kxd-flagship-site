import "server-only";

import type { GrowthOpportunity } from "@/lib/intelligence/types";
import type { BrainSignal } from "./types";

export function extractTopOpportunities(signals: BrainSignal[]): BrainSignal[] {
  return signals
    .filter((s) =>
      ["growth-opportunity", "retainer-opportunity", "seo-opportunity"].includes(s.kind),
    )
    .sort((a, b) => (b.estimatedValue ?? 0) - (a.estimatedValue ?? 0))
    .slice(0, 8);
}

export function mergeGrowthOpportunities(
  opportunities: GrowthOpportunity[],
): BrainSignal[] {
  return opportunities.slice(0, 6).map((o) => ({
    id: o.id,
    kind: "growth-opportunity" as const,
    title: o.title,
    reason: o.reason,
    urgency: o.urgency,
    confidence: o.confidence,
    estimatedValue: o.estimatedBusinessValue,
    suggestedAction: o.recommendedAction,
    relatedModule: o.relatedModules[0] ?? "Growth",
    clientId: o.clientId,
    clientName: o.clientName,
    href: o.href,
  }));
}
