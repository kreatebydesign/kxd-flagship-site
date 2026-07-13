/**
 * Phase 29B — Business Health Engine.
 * Deterministic domain health from ReportingFacts. No AI.
 */

import { factsForDomain } from "../domain/snapshot";
import type {
  BusinessDomain,
  BusinessHealthReport,
  BusinessHealthState,
  CanonicalMetricKey,
  DomainHealth,
  MetricSnapshot,
  ReportingConfidence,
  ReportingFact,
  TrendDirection,
} from "../domain/types";

const POSITIVE_KEYS = new Set<CanonicalMetricKey>([
  "visitors",
  "sessions",
  "qualified_leads",
  "form_submissions",
  "phone_calls",
  "conversions",
  "conversion_rate",
  "revenue",
  "mrr",
  "impressions",
  "clicks",
  "ctr",
  "seo_visibility",
  "website_health",
  "campaign_health",
  "top_landing_page_score",
  "review_count",
  "review_rating",
  "review_velocity",
  "payment_success_rate",
]);

const INVERSE_KEYS = new Set<CanonicalMetricKey>(["cost_per_lead", "ad_spend", "average_position"]);

function confidenceFromFacts(facts: ReportingFact[]): ReportingConfidence {
  if (facts.length === 0) return "unknown";
  if (facts.every((f) => f.source.confidence === "unknown")) return "unknown";
  if (facts.some((f) => f.source.confidence === "low" || f.source.freshness === "stale")) {
    return "low";
  }
  if (facts.every((f) => f.source.confidence === "high" && f.source.freshness === "fresh")) {
    return "high";
  }
  return "medium";
}

function effectiveTrend(fact: ReportingFact): TrendDirection {
  if (fact.trend && fact.trend !== "unknown") return fact.trend;
  if (fact.previousValue == null || fact.previousValue === 0) {
    if (fact.delta == null) return "unknown";
  }
  if (fact.delta == null && fact.previousValue != null) {
    const delta = fact.value - fact.previousValue;
    if (Math.abs(delta) < Number.EPSILON) return "flat";
    return delta > 0 ? "up" : "down";
  }
  if (fact.delta == null) return "unknown";
  if (Math.abs(fact.delta) < Number.EPSILON) return "flat";
  return fact.delta > 0 ? "up" : "down";
}

function isAdverse(fact: ReportingFact, trend: TrendDirection): boolean {
  if (trend === "unknown" || trend === "flat") return false;
  if (INVERSE_KEYS.has(fact.metricKey)) return trend === "up";
  if (POSITIVE_KEYS.has(fact.metricKey)) return trend === "down";
  return trend === "down";
}

function isFavorable(fact: ReportingFact, trend: TrendDirection): boolean {
  if (trend === "unknown" || trend === "flat") return false;
  if (INVERSE_KEYS.has(fact.metricKey)) return trend === "down";
  if (POSITIVE_KEYS.has(fact.metricKey)) return trend === "up";
  return trend === "up";
}

function relativeDelta(fact: ReportingFact): number | null {
  if (fact.previousValue == null || fact.previousValue === 0) {
    return fact.delta ?? null;
  }
  return (fact.value - fact.previousValue) / Math.abs(fact.previousValue);
}

function evaluateDomainHealth(
  domain: BusinessDomain,
  facts: ReportingFact[],
  enabled: boolean,
): DomainHealth {
  if (!enabled) {
    return {
      domain,
      state: "unknown",
      confidence: "unknown",
      factIds: [],
      drivers: [],
    };
  }

  if (facts.length === 0) {
    return {
      domain,
      state: "unknown",
      confidence: "unknown",
      factIds: [],
      drivers: [],
    };
  }

  const confidence = confidenceFromFacts(facts);
  if (confidence === "unknown") {
    return {
      domain,
      state: "unknown",
      confidence,
      factIds: facts.map((f) => f.id),
      drivers: facts.map((f) => f.metricKey),
    };
  }

  let adverse = 0;
  let favorable = 0;
  let critical = 0;
  const drivers: CanonicalMetricKey[] = [];

  for (const fact of facts) {
    const trend = effectiveTrend(fact);
    const rel = relativeDelta(fact);
    if (isAdverse(fact, trend)) {
      adverse += 1;
      drivers.push(fact.metricKey);
      if (rel != null && Math.abs(rel) >= 0.25) critical += 1;
    } else if (isFavorable(fact, trend)) {
      favorable += 1;
      drivers.push(fact.metricKey);
    }
  }

  let state: BusinessHealthState = "healthy";
  if (critical >= 1 || adverse >= Math.max(2, Math.ceil(facts.length * 0.6))) {
    state = critical >= 1 ? "critical" : "attention";
  } else if (adverse >= 1) {
    state = "attention";
  } else if (favorable >= 1 && adverse === 0) {
    state = "improving";
  } else {
    state = "healthy";
  }

  return {
    domain,
    state,
    confidence,
    factIds: facts.map((f) => f.id),
    drivers: Array.from(new Set(drivers)),
  };
}

const DOMAIN_ORDER: BusinessDomain[] = [
  "website",
  "marketing",
  "search",
  "experience",
  "financial",
  "sales",
];

function rollupOverall(domains: DomainHealth[]): DomainHealth {
  const known = domains.filter((d) => d.state !== "unknown");
  if (known.length === 0) {
    return {
      domain: "overall",
      state: "unknown",
      confidence: "unknown",
      factIds: [],
      drivers: [],
    };
  }

  if (known.some((d) => d.state === "critical")) {
    return {
      domain: "overall",
      state: "critical",
      confidence: known[0]?.confidence ?? "medium",
      factIds: known.flatMap((d) => d.factIds),
      drivers: known.flatMap((d) => d.drivers),
    };
  }

  if (known.some((d) => d.state === "attention")) {
    return {
      domain: "overall",
      state: "attention",
      confidence: "medium",
      factIds: known.flatMap((d) => d.factIds),
      drivers: known.flatMap((d) => d.drivers),
    };
  }

  if (known.every((d) => d.state === "improving" || d.state === "healthy") &&
    known.some((d) => d.state === "improving")) {
    return {
      domain: "overall",
      state: "improving",
      confidence: "medium",
      factIds: known.flatMap((d) => d.factIds),
      drivers: known.flatMap((d) => d.drivers),
    };
  }

  return {
    domain: "overall",
    state: "healthy",
    confidence: "medium",
    factIds: known.flatMap((d) => d.factIds),
    drivers: [],
  };
}

export function evaluateBusinessHealth(snapshot: MetricSnapshot): BusinessHealthReport {
  const enabled = new Set(snapshot.enabledDomains);
  const domains = DOMAIN_ORDER.map((domain) =>
    evaluateDomainHealth(domain, factsForDomain(snapshot, domain), enabled.has(domain)),
  );

  return {
    clientId: snapshot.clientId,
    period: snapshot.period,
    domains,
    overall: rollupOverall(domains),
    composedAt: new Date().toISOString(),
  };
}
