import { taxonomyLabel } from "@/lib/business-brain";
import type { BusinessPattern, BusinessSignal } from "@/lib/business-brain";
import { BUSINESS_SIGNAL_TAXONOMY } from "@/lib/business-brain/taxonomy";
import type { PulseWatchItem } from "./types";
import { watchId } from "./utils";

function watchFromSignal(signal: BusinessSignal, durationRuns: number): PulseWatchItem | null {
  if (signal.severity === "low" || signal.severity === "positive") return null;

  const remains =
    signal.severity === "critical" || signal.severity === "high"
      ? "remains elevated"
      : "continues";

  return {
    id: watchId(signal.taxonomy),
    label: `${taxonomyLabel(signal.taxonomy)} ${remains}`,
    context: signal.meaning,
    durationRuns,
    severity: signal.severity,
    taxonomy: signal.taxonomy,
    signalIds: [signal.id],
    patternIds: [],
  };
}

function watchFromPattern(pattern: BusinessPattern): PulseWatchItem | null {
  if (pattern.trend !== "repeated" && pattern.trend !== "increasing") return null;
  if (pattern.occurrenceCount < 2) return null;

  const daysPhrase =
    pattern.occurrenceCount >= 5
      ? `continuing for ${pattern.occurrenceCount} runs`
      : `appearing across ${pattern.occurrenceCount} runs`;

  let label: string;
  switch (pattern.taxonomy) {
    case BUSINESS_SIGNAL_TAXONOMY.DELIVERY_PRESSURE:
      label = `Delivery pressure ${daysPhrase}`;
      break;
    case BUSINESS_SIGNAL_TAXONOMY.REVIEW_BACKLOG:
      label = `Review backlog ${daysPhrase}`;
      break;
    case BUSINESS_SIGNAL_TAXONOMY.RELATIONSHIP_ENGAGEMENT:
      label = `Relationship activity ${pattern.trend === "increasing" ? "increasing" : daysPhrase}`;
      break;
    case BUSINESS_SIGNAL_TAXONOMY.OPERATIONS_LOAD:
      label = `Operational load ${pattern.trend === "increasing" ? "increasing" : daysPhrase}`;
      break;
    default:
      label = `${pattern.label} ${daysPhrase}`;
  }

  return {
    id: watchId(`pattern:${pattern.id}`),
    label,
    context: pattern.description,
    durationRuns: pattern.occurrenceCount,
    severity:
      pattern.taxonomy === BUSINESS_SIGNAL_TAXONOMY.OPERATIONS_LOAD ? "high" : "moderate",
    taxonomy: pattern.taxonomy,
    signalIds: [],
    patternIds: [pattern.id],
  };
}

/**
 * Generate persistent watch items from signals and patterns.
 * Observe only — never recommend actions.
 */
export function buildPulseWatchlist(
  signals: BusinessSignal[],
  patterns: BusinessPattern[],
  historyRunCount: number,
): PulseWatchItem[] {
  const items: PulseWatchItem[] = [];

  for (const signal of signals) {
    const item = watchFromSignal(signal, historyRunCount);
    if (item) items.push(item);
  }

  for (const pattern of patterns) {
    const item = watchFromPattern(pattern);
    if (item && !items.some((w) => w.taxonomy === item.taxonomy && w.label === item.label)) {
      items.push(item);
    }
  }

  // Deduplicate by taxonomy — keep highest severity
  const byTaxonomy = new Map<string, PulseWatchItem>();
  for (const item of items) {
    const existing = byTaxonomy.get(item.taxonomy);
    if (!existing) {
      byTaxonomy.set(item.taxonomy, item);
      continue;
    }
    const rank = { critical: 0, high: 1, moderate: 2, low: 3, positive: 4 };
    if (rank[item.severity] < rank[existing.severity]) {
      byTaxonomy.set(item.taxonomy, item);
    }
  }

  return [...byTaxonomy.values()].slice(0, 8);
}
