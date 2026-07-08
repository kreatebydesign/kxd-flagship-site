import { BUSINESS_SIGNAL_TAXONOMY, taxonomyLabel } from "./taxonomy";
import type { BusinessPattern, BusinessSignal, ExecutiveAttentionItem } from "./types";
import { attentionId } from "./utils";

/**
 * Derive executive attention items from signals and patterns.
 * These may deserve human review — they are not recommendations.
 */
export function buildExecutiveAttention(
  signals: BusinessSignal[],
  patterns: BusinessPattern[],
): ExecutiveAttentionItem[] {
  const items: ExecutiveAttentionItem[] = [];

  const deliverySignal = signals.find((s) => s.taxonomy === BUSINESS_SIGNAL_TAXONOMY.DELIVERY_PRESSURE);
  if (deliverySignal && deliverySignal.severity !== "low" && deliverySignal.severity !== "positive") {
    items.push({
      id: attentionId("delivery-pressure"),
      title: "Upcoming deliverables may need review",
      context:
        "Delivery pressure is present in the portfolio. Worth a calm review of what is due soon.",
      severity: deliverySignal.severity,
      signalIds: [deliverySignal.id],
      patternIds: patterns
        .filter((p) => p.taxonomy === BUSINESS_SIGNAL_TAXONOMY.DELIVERY_PRESSURE)
        .map((p) => p.id),
      relatedClientId: deliverySignal.relatedClientId,
      relatedClientName: deliverySignal.relatedClientName,
    });
  }

  const reviewSignal = signals.find((s) => s.taxonomy === BUSINESS_SIGNAL_TAXONOMY.REVIEW_BACKLOG);
  if (reviewSignal && (reviewSignal.severity === "high" || reviewSignal.severity === "critical")) {
    items.push({
      id: attentionId("review-backlog"),
      title: "Website review volume may need attention",
      context:
        "The review inbox is carrying meaningful volume. A brief triage pass may be worthwhile.",
      severity: reviewSignal.severity,
      signalIds: [reviewSignal.id],
      patternIds: patterns
        .filter((p) => p.taxonomy === BUSINESS_SIGNAL_TAXONOMY.REVIEW_BACKLOG)
        .map((p) => p.id),
      relatedClientId: reviewSignal.relatedClientId,
      relatedClientName: reviewSignal.relatedClientName,
    });
  }

  const opsSignal = signals.find((s) => s.taxonomy === BUSINESS_SIGNAL_TAXONOMY.OPERATIONS_LOAD);
  if (opsSignal && (opsSignal.severity === "critical" || opsSignal.severity === "high")) {
    items.push({
      id: attentionId("operational-load"),
      title: "Operational load is elevated",
      context:
        "Execution load or blocked work is present. Worth understanding what is holding progress.",
      severity: opsSignal.severity,
      signalIds: [opsSignal.id],
      patternIds: patterns
        .filter((p) => p.taxonomy === BUSINESS_SIGNAL_TAXONOMY.OPERATIONS_LOAD)
        .map((p) => p.id),
      relatedClientId: opsSignal.relatedClientId,
      relatedClientName: opsSignal.relatedClientName,
    });
  }

  const commsSignal = signals.find(
    (s) =>
      s.taxonomy === BUSINESS_SIGNAL_TAXONOMY.COMMUNICATIONS_ATTENTION ||
      s.taxonomy === BUSINESS_SIGNAL_TAXONOMY.OVERDUE_RISK,
  );
  if (commsSignal && commsSignal.severity !== "low" && commsSignal.severity !== "positive") {
    items.push({
      id: attentionId("communications"),
      title: "Client communications may need review",
      context:
        "Threads are waiting on studio response or follow-up. Relationships benefit from timely awareness.",
      severity: commsSignal.severity,
      signalIds: signals
        .filter(
          (s) =>
            s.taxonomy === BUSINESS_SIGNAL_TAXONOMY.COMMUNICATIONS_ATTENTION ||
            s.taxonomy === BUSINESS_SIGNAL_TAXONOMY.OVERDUE_RISK,
        )
        .map((s) => s.id),
      patternIds: patterns
        .filter((p) => p.taxonomy === BUSINESS_SIGNAL_TAXONOMY.COMMUNICATIONS_ATTENTION)
        .map((p) => p.id),
      relatedClientId: commsSignal.relatedClientId,
      relatedClientName: commsSignal.relatedClientName,
    });
  }

  const healthSignal = signals.find((s) => s.taxonomy === BUSINESS_SIGNAL_TAXONOMY.HEALTH_PRESSURE);
  if (healthSignal && (healthSignal.severity === "critical" || healthSignal.severity === "high")) {
    items.push({
      id: attentionId("health-pressure"),
      title: "Business health indicators warrant awareness",
      context:
        "Portfolio health signals are elevated. The underlying observations are available for review.",
      severity: healthSignal.severity,
      signalIds: [healthSignal.id],
      patternIds: [],
      relatedClientId: null,
      relatedClientName: null,
    });
  }

  const relSignal = signals.find((s) => s.taxonomy === BUSINESS_SIGNAL_TAXONOMY.RELATIONSHIP_ENGAGEMENT);
  if (relSignal && relSignal.severity === "high") {
    items.push({
      id: attentionId("relationship-engagement"),
      title: "Relationship engagement may need review",
      context:
        "Engagement signals suggest some partnerships may benefit from founder awareness.",
      severity: relSignal.severity,
      signalIds: [relSignal.id],
      patternIds: [],
      relatedClientId: relSignal.relatedClientId,
      relatedClientName: relSignal.relatedClientName,
    });
  }

  // Pattern-driven attention (repeated issues)
  for (const pattern of patterns.filter((p) => p.trend === "repeated" && p.occurrenceCount >= 3)) {
    if (items.some((item) => item.patternIds.includes(pattern.id))) continue;

    items.push({
      id: attentionId(`pattern:${pattern.id}`),
      title: `${pattern.label} — recurring pattern`,
      context: `${pattern.description} This pattern has appeared across multiple observation runs.`,
      severity: pattern.taxonomy === BUSINESS_SIGNAL_TAXONOMY.OPERATIONS_LOAD ? "high" : "moderate",
      signalIds: [],
      patternIds: [pattern.id],
      relatedClientId: pattern.relatedClientId,
      relatedClientName: pattern.relatedClientName,
    });
  }

  // Cap attention items — calm, not overwhelming
  return items.slice(0, 8);
}

/**
 * Build a short list of dominant themes from signals for summary use.
 */
export function dominantThemes(signals: BusinessSignal[]): string[] {
  const themes = new Set<string>();
  for (const signal of signals) {
    if (signal.severity === "positive") continue;
    themes.add(taxonomyLabel(signal.taxonomy));
  }
  return [...themes].slice(0, 5);
}
