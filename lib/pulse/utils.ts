import type { BusinessSignal, BusinessSignalSeverity } from "@/lib/business-brain";
import type { BusinessSignalTaxonomy } from "@/lib/business-brain/taxonomy";
import type { ExecutivePriorityDomain, PulseSignificance } from "./types";

const SEVERITY_RANK: Record<BusinessSignalSeverity, number> = {
  critical: 0,
  high: 1,
  moderate: 2,
  low: 3,
  positive: 4,
};

export function changeId(key: string): string {
  return `pulse-change:${key}`;
}

export function watchId(key: string): string {
  return `pulse-watch:${key}`;
}

export function stableId(key: string): string {
  return `pulse-stable:${key}`;
}

export function priorityId(domain: ExecutivePriorityDomain): string {
  return `pulse-priority:${domain}`;
}

export function pulseItemId(kind: string, key: string): string {
  return `pulse-item:${kind}:${key}`;
}

export function severityRank(severity: BusinessSignalSeverity): number {
  return SEVERITY_RANK[severity];
}

export function significanceFromSeverity(
  severity: BusinessSignalSeverity,
): PulseSignificance {
  if (severity === "critical" || severity === "high") return "high";
  if (severity === "moderate") return "moderate";
  return "low";
}

export function severityWeight(severity: BusinessSignalSeverity): number {
  switch (severity) {
    case "critical":
      return 100;
    case "high":
      return 75;
    case "moderate":
      return 50;
    case "low":
      return 25;
    case "positive":
      return 10;
  }
}

export function taxonomyToDomain(
  taxonomy: BusinessSignalTaxonomy,
): ExecutivePriorityDomain {
  switch (taxonomy) {
    case "business.delivery.pressure":
      return "delivery";
    case "business.operations.load":
    case "business.execution.momentum":
      return "operations";
    case "business.relationship.engagement":
    case "business.client-requests.open":
      return "relationships";
    case "business.health.pressure":
      return "financial-health";
    case "business.review.backlog":
      return "reviews";
    case "business.communications.attention":
    case "business.overdue.risk":
      return "communications";
    case "business.memory.lifecycle":
      return "brand";
    default:
      return "operations";
  }
}

export function domainLabel(domain: ExecutivePriorityDomain): string {
  const labels: Record<ExecutivePriorityDomain, string> = {
    delivery: "Delivery",
    operations: "Operations",
    relationships: "Relationships",
    "financial-health": "Financial Health",
    marketing: "Marketing",
    reviews: "Reviews",
    brand: "Brand",
    communications: "Communications",
  };
  return labels[domain];
}

export function signalsByTaxonomy(
  signals: BusinessSignal[],
): Map<BusinessSignalTaxonomy, BusinessSignal[]> {
  const map = new Map<BusinessSignalTaxonomy, BusinessSignal[]>();
  for (const signal of signals) {
    const list = map.get(signal.taxonomy) ?? [];
    list.push(signal);
    map.set(signal.taxonomy, list);
  }
  return map;
}
