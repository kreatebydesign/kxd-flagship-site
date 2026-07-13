/**
 * Phase 29B — KXD Intelligence Reporting Domain verification.
 * Deterministic fixtures. No database. No provider APIs. No UI.
 *
 * Run: npm run verify:reporting-domain
 */

import {
  composeMetricSnapshot,
  createMonthPeriod,
  domainsForCapabilities,
  filterFactsByCapabilities,
  type ReportingFact,
  type ReportingSource,
  type MetricSnapshot,
} from "../lib/reporting/domain/index.ts";
import { evaluateBusinessHealth } from "../lib/reporting/health/engine.ts";
import { evaluateMomentum } from "../lib/reporting/momentum/engine.ts";
import { buildTrendMemory } from "../lib/reporting/trend/memory.ts";
import { buildBusinessTimeline } from "../lib/reporting/trend/timeline.ts";
import { generateReportingObservations } from "../lib/reporting/observations/engine.ts";
import {
  composeReportingIntelligence,
  toMonthlyReportCompositionInputs,
  toPartnershipReportingBrief,
} from "../lib/reporting/compose/intelligence.ts";
import {
  EXECUTIVE_REPORTING_EVIDENCE_CONTRACT,
  toExecutiveReportingEvidence,
} from "../lib/reporting/adapters/executive-intelligence.ts";
import {
  CLIENT_CAPABILITY_REGISTRY,
  getReportingCapabilityIds,
} from "../lib/ces/partnership/capabilities.ts";

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string): void {
  if (condition) {
    passed += 1;
    console.log(`  ✓ ${label}`);
  } else {
    failed += 1;
    console.error(`  ✗ ${label}`);
  }
}

function source(
  clientId: number,
  confidence: ReportingSource["confidence"] = "high",
  freshness: ReportingSource["freshness"] = "fresh",
): ReportingSource {
  return {
    providerId: "normalized-test",
    clientId,
    fetchedAt: "2026-07-01T00:00:00.000Z",
    freshness,
    confidence,
  };
}

function fact(
  partial: Omit<ReportingFact, "source" | "evidenceRefs" | "period" | "clientId"> & {
    clientId?: number;
    period?: ReportingFact["period"];
    source?: ReportingSource;
  },
): ReportingFact {
  const clientId = partial.clientId ?? 1;
  const period = partial.period ?? createMonthPeriod(2026, 6);
  return {
    id: partial.id,
    clientId,
    period,
    domain: partial.domain,
    metricKey: partial.metricKey,
    value: partial.value,
    unit: partial.unit,
    previousValue: partial.previousValue,
    delta: partial.delta,
    trend: partial.trend,
    source: partial.source ?? source(clientId),
    evidenceRefs: [],
  };
}

function juneFacts(): ReportingFact[] {
  const period = createMonthPeriod(2026, 6);
  return [
    fact({
      id: "f-visitors",
      period,
      domain: "website",
      metricKey: "visitors",
      value: 1200,
      previousValue: 1000,
      delta: 200,
      trend: "up",
      unit: "count",
    }),
    fact({
      id: "f-sessions",
      period,
      domain: "website",
      metricKey: "sessions",
      value: 1500,
      previousValue: 1300,
      delta: 200,
      trend: "up",
      unit: "count",
    }),
    fact({
      id: "f-leads",
      period,
      domain: "marketing",
      metricKey: "qualified_leads",
      value: 18,
      previousValue: 24,
      delta: -6,
      trend: "down",
      unit: "count",
    }),
    fact({
      id: "f-seo",
      period,
      domain: "search",
      metricKey: "seo_visibility",
      value: 62,
      previousValue: 55,
      delta: 7,
      trend: "up",
      unit: "score",
    }),
    fact({
      id: "f-reviews",
      period,
      domain: "experience",
      metricKey: "review_velocity",
      value: 4,
      previousValue: 2,
      delta: 2,
      trend: "up",
      unit: "count",
    }),
  ];
}

function maySnapshot(): MetricSnapshot {
  const period = createMonthPeriod(2026, 5);
  return composeMetricSnapshot({
    clientId: 1,
    period,
    enabledCapabilities: ["website-analytics", "google-ads", "seo", "gbp"],
    facts: [
      fact({
        id: "m-visitors",
        period,
        domain: "website",
        metricKey: "visitors",
        value: 1000,
        previousValue: 900,
        unit: "count",
        trend: "up",
      }),
      fact({
        id: "m-leads",
        period,
        domain: "marketing",
        metricKey: "qualified_leads",
        value: 24,
        previousValue: 22,
        unit: "count",
        trend: "up",
      }),
      fact({
        id: "m-seo",
        period,
        domain: "search",
        metricKey: "seo_visibility",
        value: 55,
        previousValue: 50,
        unit: "score",
        trend: "up",
      }),
    ],
  });
}

function aprilSnapshot(): MetricSnapshot {
  const period = createMonthPeriod(2026, 4);
  return composeMetricSnapshot({
    clientId: 1,
    period,
    enabledCapabilities: ["website-analytics", "google-ads", "seo", "gbp"],
    facts: [
      fact({
        id: "a-visitors",
        period,
        domain: "website",
        metricKey: "visitors",
        value: 900,
        previousValue: 850,
        unit: "count",
        trend: "up",
      }),
      fact({
        id: "a-leads",
        period,
        domain: "marketing",
        metricKey: "qualified_leads",
        value: 22,
        previousValue: 20,
        unit: "count",
        trend: "up",
      }),
      fact({
        id: "a-seo",
        period,
        domain: "search",
        metricKey: "seo_visibility",
        value: 50,
        previousValue: 48,
        unit: "score",
        trend: "up",
      }),
    ],
  });
}

console.log("\nPhase 29B — Reporting Domain\n");

const caps = ["website-analytics", "seo"] as const;
assert(domainsForCapabilities(caps).includes("website"), "website-analytics maps to website domain");
assert(domainsForCapabilities(caps).includes("search"), "seo maps to search domain");
assert(!domainsForCapabilities(caps).includes("financial"), "stripe domain omitted when disabled");

const gated = filterFactsByCapabilities(juneFacts(), caps);
assert(
  gated.every((f) => f.domain === "website" || f.domain === "search"),
  "capability gating omits disabled domains",
);
assert(!gated.some((f) => f.domain === "marketing"), "marketing facts dropped without google-ads");

assert(
  CLIENT_CAPABILITY_REGISTRY.some((c) => c.id === "website-analytics"),
  "capability registry includes website-analytics",
);
assert(
  getReportingCapabilityIds(["website-analytics", "overview"]).includes("website-analytics"),
  "getReportingCapabilityIds filters reporting ids",
);

const period = createMonthPeriod(2026, 6);
const snapshot = composeMetricSnapshot({
  clientId: 1,
  period,
  facts: juneFacts(),
  enabledCapabilities: ["website-analytics", "google-ads", "seo", "gbp"],
});
assert(snapshot.facts.length === 5, "snapshot retains enabled facts");
assert(snapshot.overallConfidence !== "unknown", "snapshot confidence derived from sources");

const emptySnap = composeMetricSnapshot({
  clientId: 1,
  period,
  facts: juneFacts(),
  enabledCapabilities: [],
});
assert(emptySnap.facts.length === 0, "no capabilities → empty facts");
assert(emptySnap.overallConfidence === "unknown", "no capabilities → unknown confidence");

const health = evaluateBusinessHealth(snapshot);
assert(health.domains.length === 6, "health evaluates six domains");
const websiteHealth = health.domains.find((d) => d.domain === "website");
assert(
  websiteHealth?.state === "improving" || websiteHealth?.state === "healthy",
  "website health favorable",
);
const marketingHealth = health.domains.find((d) => d.domain === "marketing");
assert(
  marketingHealth?.state === "attention" || marketingHealth?.state === "critical",
  "marketing health attention on lead decline",
);
assert(health.overall.state !== "unknown", "overall health resolved");

const unknownHealth = evaluateBusinessHealth(emptySnap);
assert(unknownHealth.overall.state === "unknown", "empty snapshot → unknown overall health");

const juneSnap = snapshot;
const history = [juneSnap, maySnapshot(), aprilSnapshot()];
const momentum = evaluateMomentum(history);
assert(momentum.overall.state !== "unknown", "momentum resolves with history");
assert(
  (momentum.domains.find((d) => d.domain === "website")?.periodsObserved ?? 0) >= 2,
  "website momentum observed multiple periods",
);

const singleMomentum = evaluateMomentum([juneSnap]);
assert(
  singleMomentum.overall.state === "unknown" ||
    singleMomentum.domains.every((d) => d.state === "unknown" || d.periodsObserved < 2),
  "insufficient history does not invent momentum",
);

const trends = buildTrendMemory({ clientId: 1, history });
assert(trends.records.length > 0, "trend memory emits structured records");
assert(
  trends.records.every((r) => typeof r.patternCode === "string" && r.periods >= 1),
  "trend records are structured codes, not prose essays",
);

const observations = generateReportingObservations({
  snapshot: juneSnap,
  health,
  momentum,
  trends,
});
assert(observations.length > 0, "observations generated");
assert(
  observations.some((o) => o.kind === "traffic_increasing"),
  "traffic increasing observation",
);
assert(observations.some((o) => o.kind === "leads_slowing"), "leads slowing observation");
assert(
  observations.every((o) => o.statement.length > 0 && !/gpt|openai|ai generated/i.test(o.statement)),
  "observations are deterministic statements",
);

const timeline = buildBusinessTimeline({
  snapshot: juneSnap,
  health,
  momentum,
  observations,
});
assert(timeline.events.length > 0, "business timeline events created");
assert(
  timeline.events.every((e) => e.change.includes(":") && e.health && e.momentum),
  "timeline events are structured",
);

const bundle = composeReportingIntelligence({
  clientId: 1,
  period,
  history,
  enabledCapabilities: ["website-analytics", "google-ads", "seo", "gbp"],
});
const partnership = toPartnershipReportingBrief(bundle);
assert(partnership.recommendationHint != null, "partnership brief exposes recommendation hint");
assert(partnership.observations.length > 0, "partnership brief includes observations");

const monthly = toMonthlyReportCompositionInputs(bundle);
assert(monthly.snapshot.facts.length > 0, "monthly composition inputs include snapshot");
assert(monthly.health.overall.domain === "overall", "monthly inputs include health");
assert(monthly.momentum.overall.domain === "overall", "monthly inputs include momentum");

const evidence = toExecutiveReportingEvidence(bundle);
assert(evidence.snapshot.clientId === 1, "EI evidence includes snapshot");
assert(
  EXECUTIVE_REPORTING_EVIDENCE_CONTRACT.every((key) => key in evidence),
  "EI evidence contract keys present",
);
assert(
  !JSON.stringify(evidence).includes("googleapis") &&
    !JSON.stringify(evidence).toLowerCase().includes("ga4_property"),
  "EI evidence has no provider SDK payload markers",
);

const disconnected = composeMetricSnapshot({
  clientId: 1,
  period,
  enabledCapabilities: ["website-analytics"],
  facts: [
    fact({
      id: "missing",
      domain: "website",
      metricKey: "visitors",
      value: 0,
      unit: "count",
      source: source(1, "unknown", "missing"),
    }),
  ],
});
const disconnectedHealth = evaluateBusinessHealth(disconnected);
assert(
  disconnectedHealth.domains.find((d) => d.domain === "website")?.state === "unknown",
  "missing freshness / unknown confidence → unknown health (no fake certainty)",
);

console.log(`\n${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
