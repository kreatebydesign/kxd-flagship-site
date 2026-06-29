import type { MemoryInsightItem, MemorySignal } from "./types";

function toInsight(signal: MemorySignal): MemoryInsightItem {
  return {
    id: signal.id,
    title: signal.title,
    detail: signal.detail,
    severity: signal.severity,
    source: signal.href
      ? { label: signal.source ?? "Source", href: signal.href }
      : undefined,
  };
}

export function buildMemoryInsights(signals: MemorySignal[]): {
  wins: MemoryInsightItem[];
  risks: MemoryInsightItem[];
  followUpsNeeded: MemoryInsightItem[];
  revenueOpportunities: MemoryInsightItem[];
  retainerOpportunities: MemoryInsightItem[];
  upsellIdeas: MemoryInsightItem[];
  memoryNotes: MemoryInsightItem[];
} {
  const wins = signals.filter((s) => s.category === "win").map(toInsight);
  const risks = signals.filter((s) => s.category === "risk").map(toInsight);
  const followUpsNeeded = signals.filter((s) => s.category === "follow_up").map(toInsight);
  const revenueOpportunities = signals
    .filter((s) => s.category === "opportunity")
    .map(toInsight);
  const retainerOpportunities = signals.filter((s) => s.category === "retainer").map(toInsight);
  const upsellIdeas = signals.filter((s) => s.category === "upsell").map(toInsight);
  const memoryNotes = signals.filter((s) => s.category === "context").map(toInsight);

  return {
    wins,
    risks,
    followUpsNeeded,
    revenueOpportunities,
    retainerOpportunities,
    upsellIdeas,
    memoryNotes,
  };
}

export function computeMemoryScores(
  signals: MemorySignal[],
  baseHealthScore: number | null,
  fastCompletions48h = 0,
): {
  relationshipHealthScore: number;
  revenueOpportunityScore: number;
  urgencyScore: number;
  retentionRiskScore: number;
  momentumScore: number;
} {
  const severityWeight = (s: MemorySignal) =>
    s.severity === "critical"
      ? 4
      : s.severity === "high"
        ? 3
        : s.severity === "medium"
          ? 2
          : 1;

  const riskWeight = signals
    .filter((s) => s.category === "risk" || s.category === "follow_up")
    .reduce((sum, s) => sum + severityWeight(s), 0);

  const opportunityWeight = signals
    .filter(
      (s) =>
        s.category === "opportunity" ||
        s.category === "retainer" ||
        s.category === "upsell",
    )
    .reduce((sum, s) => sum + severityWeight(s), 0);

  const winWeight = signals
    .filter((s) => s.category === "win")
    .reduce((sum, s) => sum + severityWeight(s), 0);

  const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

  const relationshipHealthScore = clamp(
    baseHealthScore != null ? baseHealthScore - riskWeight * 3 + winWeight * 2 : 70 - riskWeight * 4,
  );

  const revenueOpportunityScore = clamp(
    35 + opportunityWeight * 12 + (signals.some((s) => s.id === "no-retainer") ? 20 : 0),
  );

  const urgencyScore = clamp(riskWeight * 14 + signals.filter((s) => s.severity === "critical").length * 15);

  const retentionRiskScore = clamp(
    riskWeight * 10 +
      signals.filter((s) => s.id === "stale-contact").length * 15 +
      signals.filter((s) => s.id === "no-retainer").length * 10,
  );

  const momentumScore = clamp(
    40 +
      winWeight * 10 -
      riskWeight * 5 +
      (baseHealthScore != null ? baseHealthScore / 5 : 0) +
      fastCompletions48h * 4,
  );

  const relationshipHealthScoreAdjusted = clamp(
    relationshipHealthScore + Math.min(fastCompletions48h * 3, 12),
  );

  return {
    relationshipHealthScore: relationshipHealthScoreAdjusted,
    revenueOpportunityScore,
    urgencyScore,
    retentionRiskScore,
    momentumScore,
  };
}

export function describeRelationshipHealth(score: number): string {
  if (score >= 80) return "Strong — active engagement and healthy delivery signals.";
  if (score >= 65) return "Stable — monitor follow-ups and open work.";
  if (score >= 50) return "Needs attention — risks or gaps accumulating.";
  return "At risk — prioritize contact, delivery, and revenue stability.";
}
