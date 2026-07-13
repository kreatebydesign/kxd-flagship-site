/**
 * Phase 29B — MetricSnapshot composition from ReportingFacts.
 */

import type {
  BusinessDomain,
  MetricSnapshot,
  PeriodWindow,
  ReportingConfidence,
  ReportingFact,
} from "./types";
import {
  filterFactsByCapabilities,
  type ReportingCapabilityId,
  domainsForCapabilities,
} from "./capabilities";

function worstConfidence(values: ReportingConfidence[]): ReportingConfidence {
  const rank: Record<ReportingConfidence, number> = {
    unknown: 0,
    low: 1,
    medium: 2,
    high: 3,
  };
  let worst: ReportingConfidence = "high";
  for (const value of values) {
    if (rank[value] < rank[worst]) worst = value;
  }
  return values.length === 0 ? "unknown" : worst;
}

export function composeMetricSnapshot(input: {
  clientId: number;
  period: PeriodWindow;
  facts: ReportingFact[];
  enabledCapabilities: readonly ReportingCapabilityId[];
  composedAt?: string;
}): MetricSnapshot {
  const facts = filterFactsByCapabilities(input.facts, input.enabledCapabilities);
  const enabledDomains = domainsForCapabilities(input.enabledCapabilities);
  const confidence = worstConfidence(facts.map((f) => f.source.confidence));

  return {
    clientId: input.clientId,
    period: input.period,
    facts,
    enabledDomains,
    overallConfidence: facts.length === 0 ? "unknown" : confidence,
    composedAt: input.composedAt ?? new Date().toISOString(),
  };
}

export function factsForDomain(
  snapshot: MetricSnapshot,
  domain: BusinessDomain,
): ReportingFact[] {
  return snapshot.facts.filter((f) => f.domain === domain);
}
