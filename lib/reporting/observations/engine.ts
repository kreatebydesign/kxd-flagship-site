/**
 * Phase 29B — Observation Engine.
 * Deterministic rules over facts, health, momentum, and trend memory.
 * No AI. No GPT.
 */

import type {
  BusinessHealthReport,
  MetricSnapshot,
  MomentumReport,
  ReportingObservation,
  ReportingObservationKind,
  TrendMemory,
} from "../domain/types";
import { periodKey } from "../domain/period";

const STATEMENTS: Record<ReportingObservationKind, string> = {
  traffic_increasing: "Traffic continues to increase.",
  traffic_declining: "Traffic is declining.",
  seo_improving: "SEO visibility improving.",
  seo_declining: "SEO visibility is declining.",
  leads_slowing: "Lead generation slowing.",
  leads_improving: "Lead generation improving.",
  review_velocity_increasing: "Review velocity increasing.",
  review_velocity_slowing: "Review velocity slowing.",
  budget_efficiency_improving: "Budget efficiency improving.",
  budget_efficiency_declining: "Budget efficiency declining.",
  landing_page_declining: "Landing page performance declining.",
  website_health_stable: "Website health stable.",
  website_health_attention: "Website health needs attention.",
  marketing_health_attention: "Marketing health needs attention.",
  search_health_improving: "Search health improving.",
  financial_health_attention: "Financial health needs attention.",
  overall_health_stable: "Overall business health stable.",
  overall_momentum_accelerating: "Overall business momentum accelerating.",
  overall_momentum_declining: "Overall business momentum declining.",
  domain_unknown: "Domain signals are unavailable.",
};

function hasMetric(snapshot: MetricSnapshot, key: string): boolean {
  return snapshot.facts.some((f) => f.metricKey === key);
}

function metricTrendUp(snapshot: MetricSnapshot, key: string): boolean {
  const fact = snapshot.facts.find((f) => f.metricKey === key);
  if (!fact) return false;
  if (fact.trend === "up") return true;
  if (fact.previousValue == null) return false;
  return fact.value > fact.previousValue;
}

function metricTrendDown(snapshot: MetricSnapshot, key: string): boolean {
  const fact = snapshot.facts.find((f) => f.metricKey === key);
  if (!fact) return false;
  if (fact.trend === "down") return true;
  if (fact.previousValue == null) return false;
  return fact.value < fact.previousValue;
}

function factIdsFor(snapshot: MetricSnapshot, keys: string[]): string[] {
  return snapshot.facts.filter((f) => keys.includes(f.metricKey)).map((f) => f.id);
}

export function generateReportingObservations(input: {
  snapshot: MetricSnapshot;
  health: BusinessHealthReport;
  momentum: MomentumReport;
  trends: TrendMemory;
}): ReportingObservation[] {
  const { snapshot, health, momentum, trends } = input;
  const observations: ReportingObservation[] = [];
  const pk = periodKey(snapshot.period);

  const push = (
    kind: ReportingObservationKind,
    domain: ReportingObservation["domain"],
    severity: ReportingObservation["severity"],
    keys: string[],
    confidence: ReportingObservation["confidence"] = snapshot.overallConfidence,
  ) => {
    observations.push({
      id: `obs-${snapshot.clientId}-${kind}-${pk}`,
      clientId: snapshot.clientId,
      period: snapshot.period,
      kind,
      severity,
      domain,
      statement: STATEMENTS[kind],
      factIds: factIdsFor(snapshot, keys),
      confidence,
    });
  };

  if (metricTrendUp(snapshot, "visitors") || metricTrendUp(snapshot, "sessions")) {
    push("traffic_increasing", "website", "info", ["visitors", "sessions"]);
  }
  if (metricTrendDown(snapshot, "visitors") || metricTrendDown(snapshot, "sessions")) {
    push("traffic_declining", "website", "attention", ["visitors", "sessions"]);
  }

  if (metricTrendUp(snapshot, "seo_visibility") || metricTrendUp(snapshot, "impressions")) {
    push("seo_improving", "search", "info", ["seo_visibility", "impressions", "average_position"]);
  }
  if (metricTrendDown(snapshot, "seo_visibility")) {
    push("seo_declining", "search", "attention", ["seo_visibility"]);
  }

  if (metricTrendDown(snapshot, "qualified_leads") || metricTrendDown(snapshot, "conversions")) {
    push("leads_slowing", "marketing", "attention", ["qualified_leads", "conversions", "form_submissions"]);
  }
  if (metricTrendUp(snapshot, "qualified_leads") || metricTrendUp(snapshot, "conversions")) {
    push("leads_improving", "marketing", "opportunity", ["qualified_leads", "conversions"]);
  }

  if (metricTrendUp(snapshot, "review_velocity") || metricTrendUp(snapshot, "review_count")) {
    push("review_velocity_increasing", "experience", "info", ["review_velocity", "review_count"]);
  }
  if (metricTrendDown(snapshot, "review_velocity")) {
    push("review_velocity_slowing", "experience", "attention", ["review_velocity"]);
  }

  if (metricTrendDown(snapshot, "cost_per_lead") || metricTrendUp(snapshot, "campaign_health")) {
    push("budget_efficiency_improving", "marketing", "opportunity", ["cost_per_lead", "campaign_health"]);
  }
  if (metricTrendUp(snapshot, "cost_per_lead")) {
    push("budget_efficiency_declining", "marketing", "attention", ["cost_per_lead"]);
  }

  if (metricTrendDown(snapshot, "top_landing_page_score")) {
    push("landing_page_declining", "website", "attention", ["top_landing_page_score"]);
  }

  const website = health.domains.find((d) => d.domain === "website");
  if (website?.state === "healthy" || website?.state === "improving") {
    push("website_health_stable", "website", "info", ["website_health", "visitors", "sessions"], website.confidence);
  }
  if (website?.state === "attention" || website?.state === "critical") {
    push("website_health_attention", "website", "attention", website.drivers, website.confidence);
  }

  const marketing = health.domains.find((d) => d.domain === "marketing");
  if (marketing?.state === "attention" || marketing?.state === "critical") {
    push("marketing_health_attention", "marketing", "attention", marketing.drivers, marketing.confidence);
  }

  const search = health.domains.find((d) => d.domain === "search");
  if (search?.state === "improving" || search?.state === "healthy") {
    if (hasMetric(snapshot, "seo_visibility") || hasMetric(snapshot, "impressions")) {
      push("search_health_improving", "search", "info", ["seo_visibility", "impressions"], search.confidence);
    }
  }

  const financial = health.domains.find((d) => d.domain === "financial");
  if (financial?.state === "attention" || financial?.state === "critical") {
    push("financial_health_attention", "financial", "attention", financial.drivers, financial.confidence);
  }

  if (health.overall.state === "healthy" || health.overall.state === "improving") {
    push("overall_health_stable", "overall", "info", [], health.overall.confidence);
  }

  if (momentum.overall.state === "accelerating") {
    push("overall_momentum_accelerating", "overall", "opportunity", [], momentum.overall.confidence);
  }
  if (momentum.overall.state === "declining") {
    push("overall_momentum_declining", "overall", "attention", [], momentum.overall.confidence);
  }

  for (const domain of snapshot.enabledDomains) {
    const domainFacts = snapshot.facts.filter((f) => f.domain === domain);
    if (domainFacts.length === 0) {
      push("domain_unknown", domain, "info", [], "unknown");
    }
  }

  // Trend memory can reinforce multi-period patterns without inventing metrics
  for (const record of trends.records) {
    if (record.periods >= 3 && record.direction === "up" && record.metricKey === "visitors") {
      if (!observations.some((o) => o.kind === "traffic_increasing")) {
        push("traffic_increasing", "website", "info", ["visitors"], record.confidence);
      }
    }
  }

  // Deduplicate by kind
  const seen = new Set<string>();
  return observations.filter((o) => {
    if (seen.has(o.kind)) return false;
    seen.add(o.kind);
    return true;
  });
}
