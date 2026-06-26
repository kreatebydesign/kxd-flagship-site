import "server-only";

import type { IntelligenceRecommendation } from "@/lib/intelligence/types";
import type { BrainSignal } from "./types";
import type { BrainRecommendation } from "./types";

export function buildBrainRecommendations(
  intelligenceRecs: IntelligenceRecommendation[],
  signals: BrainSignal[],
  suppressedIds: Set<string>,
): BrainRecommendation[] {
  const fromIntelligence: BrainRecommendation[] = intelligenceRecs.map((r) => ({
    id: r.id,
    title: r.title,
    reason: r.reason,
    urgency: r.urgency,
    confidence: r.confidence,
    estimatedValue: r.estimatedBusinessValue,
    suggestedAction: r.recommendedAction,
    relatedModules: r.relatedModules,
    clientId: r.clientId,
    clientName: r.clientName,
    href: r.href,
    suppressed: suppressedIds.has(r.id),
  }));

  const fromSignals: BrainRecommendation[] = signals.slice(0, 8).map((s) => ({
    id: `brain-${s.id}`,
    title: s.title,
    reason: s.reason,
    urgency: s.urgency,
    confidence: s.confidence,
    estimatedValue: s.estimatedValue,
    suggestedAction: s.suggestedAction,
    relatedModules: [s.relatedModule],
    clientId: s.clientId,
    clientName: s.clientName,
    href: s.href,
    suppressed: suppressedIds.has(`brain-${s.id}`),
  }));

  const merged = [...fromIntelligence, ...fromSignals];
  const seen = new Set<string>();
  const unique = merged.filter((r) => {
    if (seen.has(r.id) || r.suppressed) return false;
    seen.add(r.id);
    return true;
  });

  unique.sort(
    (a, b) =>
      ({ critical: 0, high: 1, medium: 2, low: 3 }[a.urgency] ?? 9) -
      ({ critical: 0, high: 1, medium: 2, low: 3 }[b.urgency] ?? 9),
  );

  return unique.slice(0, 12);
}

export function buildReasoningDigest(input: {
  signalCount: number;
  criticalCount: number;
  opportunityValue: number;
  patternCount: number;
}): string[] {
  const lines: string[] = [];
  if (input.criticalCount > 0) {
    lines.push(`${input.criticalCount} critical signal${input.criticalCount === 1 ? "" : "s"} require immediate attention.`);
  }
  if (input.opportunityValue > 0) {
    lines.push(`Identified expansion and revenue opportunities across the portfolio.`);
  }
  if (input.patternCount > 0) {
    lines.push(`${input.patternCount} behavioral pattern${input.patternCount === 1 ? "" : "s"} detected across client relationships.`);
  }
  if (input.signalCount === 0) {
    lines.push("Agency operating normally — no urgent brain signals.");
  }
  return lines.slice(0, 5);
}
