import type { BusinessPattern, BusinessSignal } from "@/lib/business-brain";
import { BUSINESS_SIGNAL_TAXONOMY } from "@/lib/business-brain/taxonomy";
import type { ExecutivePriority, ExecutivePriorityDomain } from "./types";
import {
  domainLabel,
  priorityId,
  severityWeight,
  taxonomyToDomain,
} from "./utils";

const DOMAIN_CONTEXT: Record<ExecutivePriorityDomain, string> = {
  delivery: "Delivery timelines and upcoming commitments deserve executive awareness.",
  operations: "Studio execution load and operational flow are active attention domains.",
  relationships: "Client relationship health and engagement are part of the current posture.",
  "financial-health": "Business health indicators are visible in the portfolio.",
  marketing: "Growth and market-facing activity may warrant founder awareness.",
  reviews: "Website review volume and revision flow are part of the current state.",
  brand: "Brand memory and recommendation lifecycle are being tracked.",
  communications: "Client communication threads are part of the executive landscape.",
};

interface DomainAccumulator {
  domain: ExecutivePriorityDomain;
  weight: number;
  signalIds: string[];
  patternIds: string[];
}

/**
 * Generate executive attention domains from brain signals and patterns.
 * These are domains — not actions or recommendations.
 */
export function buildExecutivePriorities(
  signals: BusinessSignal[],
  patterns: BusinessPattern[],
): ExecutivePriority[] {
  const accumulators = new Map<ExecutivePriorityDomain, DomainAccumulator>();

  function accumulate(
    domain: ExecutivePriorityDomain,
    weight: number,
    signalId?: string,
    patternId?: string,
  ) {
    const existing = accumulators.get(domain) ?? {
      domain,
      weight: 0,
      signalIds: [],
      patternIds: [],
    };
    existing.weight = Math.min(100, existing.weight + weight);
    if (signalId && !existing.signalIds.includes(signalId)) {
      existing.signalIds.push(signalId);
    }
    if (patternId && !existing.patternIds.includes(patternId)) {
      existing.patternIds.push(patternId);
    }
    accumulators.set(domain, existing);
  }

  for (const signal of signals) {
    if (signal.severity === "positive") continue;
    const domain = taxonomyToDomain(signal.taxonomy);
    accumulate(domain, severityWeight(signal.severity), signal.id);
  }

  for (const pattern of patterns) {
    const domain = taxonomyToDomain(pattern.taxonomy);
    const weight = pattern.trend === "repeated" ? 30 : pattern.trend === "increasing" ? 40 : 15;
    accumulate(domain, weight, undefined, pattern.id);
  }

  // Marketing domain — derived from relationship engagement volume without duplicating logic
  const timelineSignals = signals.filter(
    (s) => s.taxonomy === BUSINESS_SIGNAL_TAXONOMY.RELATIONSHIP_ENGAGEMENT,
  );
  if (timelineSignals.some((s) => s.severity === "positive" || s.confidence === "high")) {
    accumulate("marketing", 20, timelineSignals[0]?.id);
  }

  const priorities: ExecutivePriority[] = [...accumulators.values()]
    .filter((acc) => acc.weight > 0)
    .sort((a, b) => b.weight - a.weight)
    .map((acc) => ({
      id: priorityId(acc.domain),
      domain: acc.domain,
      label: domainLabel(acc.domain),
      context: DOMAIN_CONTEXT[acc.domain],
      weight: acc.weight,
      signalIds: acc.signalIds,
      patternIds: acc.patternIds,
    }));

  return priorities.slice(0, 7);
}
