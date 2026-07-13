/**
 * Phase 29B — Momentum Engine.
 * Momentum only from historical ReportingFacts. Never invent.
 */

import type {
  BusinessDomain,
  CanonicalMetricKey,
  DomainMomentum,
  MetricSnapshot,
  MomentumReport,
  MomentumState,
  ReportingConfidence,
  ReportingFact,
  TrendDirection,
} from "../domain/types";

function trendOf(fact: ReportingFact): TrendDirection {
  if (fact.trend && fact.trend !== "unknown") return fact.trend;
  if (fact.previousValue == null) return "unknown";
  const delta = fact.value - fact.previousValue;
  if (Math.abs(delta) < Number.EPSILON) return "flat";
  return delta > 0 ? "up" : "down";
}

function relativeDelta(fact: ReportingFact): number | null {
  if (fact.previousValue == null || Math.abs(fact.previousValue) < Number.EPSILON) return null;
  return (fact.value - fact.previousValue) / Math.abs(fact.previousValue);
}

/**
 * Historical series: newest first. Each snapshot is one period.
 * Momentum requires at least 2 periods of facts for a domain.
 */
export function evaluateDomainMomentum(
  domain: BusinessDomain,
  history: MetricSnapshot[],
): DomainMomentum {
  const series = history
    .map((snap) => snap.facts.filter((f) => f.domain === domain))
    .filter((facts) => facts.length > 0);

  if (series.length < 2) {
    return {
      domain,
      state: "unknown",
      confidence: "unknown",
      periodsObserved: series.length,
      metricKeys: [],
    };
  }

  const latest = series[0] ?? [];
  const prior = series[1] ?? [];
  const metricKeys = Array.from(new Set(latest.map((f) => f.metricKey))) as CanonicalMetricKey[];

  const paired: Array<{ latest: ReportingFact; prior: ReportingFact }> = [];
  for (const fact of latest) {
    const match = prior.find((p) => p.metricKey === fact.metricKey);
    if (match) paired.push({ latest: fact, prior: match });
  }

  if (paired.length === 0) {
    return {
      domain,
      state: "unknown",
      confidence: "unknown",
      periodsObserved: series.length,
      metricKeys,
    };
  }

  let up = 0;
  let down = 0;
  let flat = 0;
  let accelerating = 0;
  let slowing = 0;

  for (const pair of paired) {
    const withPrev: ReportingFact = {
      ...pair.latest,
      previousValue: pair.prior.value,
      delta: pair.latest.value - pair.prior.value,
    };
    const trend = trendOf(withPrev);
    if (trend === "up") up += 1;
    else if (trend === "down") down += 1;
    else flat += 1;

    if (series.length >= 3) {
      const older = series[2]?.find((f) => f.metricKey === pair.latest.metricKey);
      if (older) {
        const recentRel = relativeDelta(withPrev);
        const priorRel =
          pair.prior.previousValue != null && Math.abs(pair.prior.previousValue) > 0
            ? (pair.prior.value - older.value) / Math.abs(older.value)
            : (pair.prior.value - older.value) / Math.max(Math.abs(older.value), 1);
        if (recentRel != null && priorRel != null) {
          if (recentRel > priorRel && recentRel > 0) accelerating += 1;
          if (recentRel < priorRel && recentRel >= 0 && priorRel > 0) slowing += 1;
          if (recentRel < 0 && priorRel >= 0) slowing += 1;
        }
      }
    }
  }

  let state: MomentumState = "stable";
  if (accelerating >= 1 && up > down) state = "accelerating";
  else if (down > up) state = "declining";
  else if (slowing >= 1 && up >= down) state = "slowing";
  else if (up > down) state = "improving";
  else if (flat >= paired.length) state = "stable";
  else state = "stable";

  const confidence: ReportingConfidence =
    paired.every((p) => p.latest.source.confidence === "high") && series.length >= 3
      ? "high"
      : paired.length >= 1
        ? "medium"
        : "unknown";

  return {
    domain,
    state,
    confidence,
    periodsObserved: series.length,
    metricKeys,
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

function rollupMomentum(domains: DomainMomentum[]): DomainMomentum {
  const known = domains.filter((d) => d.state !== "unknown");
  if (known.length === 0) {
    return {
      domain: "overall",
      state: "unknown",
      confidence: "unknown",
      periodsObserved: 0,
      metricKeys: [],
    };
  }

  if (known.some((d) => d.state === "declining")) {
    return {
      domain: "overall",
      state: "declining",
      confidence: "medium",
      periodsObserved: Math.max(...known.map((d) => d.periodsObserved)),
      metricKeys: known.flatMap((d) => d.metricKeys),
    };
  }

  if (known.some((d) => d.state === "accelerating")) {
    return {
      domain: "overall",
      state: "accelerating",
      confidence: "medium",
      periodsObserved: Math.max(...known.map((d) => d.periodsObserved)),
      metricKeys: known.flatMap((d) => d.metricKeys),
    };
  }

  if (known.some((d) => d.state === "slowing")) {
    return {
      domain: "overall",
      state: "slowing",
      confidence: "medium",
      periodsObserved: Math.max(...known.map((d) => d.periodsObserved)),
      metricKeys: known.flatMap((d) => d.metricKeys),
    };
  }

  if (known.some((d) => d.state === "improving")) {
    return {
      domain: "overall",
      state: "improving",
      confidence: "medium",
      periodsObserved: Math.max(...known.map((d) => d.periodsObserved)),
      metricKeys: known.flatMap((d) => d.metricKeys),
    };
  }

  return {
    domain: "overall",
    state: "stable",
    confidence: "medium",
    periodsObserved: Math.max(...known.map((d) => d.periodsObserved)),
    metricKeys: [],
  };
}

/**
 * @param history Newest-first MetricSnapshots for consecutive periods.
 */
export function evaluateMomentum(history: MetricSnapshot[]): MomentumReport {
  const latest = history[0];
  if (!latest) {
    const emptyPeriod = {
      start: new Date(0).toISOString(),
      end: new Date(0).toISOString(),
      grain: "month" as const,
    };
    return {
      clientId: 0,
      period: emptyPeriod,
      domains: [],
      overall: {
        domain: "overall",
        state: "unknown",
        confidence: "unknown",
        periodsObserved: 0,
        metricKeys: [],
      },
      composedAt: new Date().toISOString(),
    };
  }

  const enabled = new Set(latest.enabledDomains);
  const domains = DOMAIN_ORDER.map((domain) => {
    if (!enabled.has(domain)) {
      return {
        domain,
        state: "unknown" as const,
        confidence: "unknown" as const,
        periodsObserved: 0,
        metricKeys: [],
      };
    }
    return evaluateDomainMomentum(domain, history);
  });

  return {
    clientId: latest.clientId,
    period: latest.period,
    domains,
    overall: rollupMomentum(domains),
    composedAt: new Date().toISOString(),
  };
}
