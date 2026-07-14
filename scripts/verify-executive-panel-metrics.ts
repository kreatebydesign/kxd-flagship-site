/**
 * Focused integrity checks for Executive Performance panel metrics.
 * Presentation adapter only — no Google calls, no ingest.
 */

import assert from "node:assert/strict";
import {
  buildExecutivePanelMetrics,
  executivePanelDomain,
  executivePanelMetricSpecs,
  formatExecutiveMetricValue,
} from "../lib/ces/executive-performance/panel-metrics";
import type {
  MetricSnapshot,
  PeriodWindow,
  ReportingFact,
} from "../lib/reporting/domain/types";

let passed = 0;
let failed = 0;

function check(name: string, fn: () => void) {
  try {
    fn();
    passed += 1;
    console.log(`  ✓ ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`  ✗ ${name}`);
    console.error(error);
  }
}

function period(label = "June 2026"): PeriodWindow {
  return { start: "2026-06-01", end: "2026-06-30", grain: "month", label };
}

function fact(
  input: Pick<ReportingFact, "metricKey" | "domain" | "value"> &
    Partial<Omit<ReportingFact, "metricKey" | "domain" | "value">>,
): ReportingFact {
  const p = period();
  return {
    id: input.id ?? `${input.domain}-${input.metricKey}`,
    clientId: input.clientId ?? 1,
    period: input.period ?? p,
    domain: input.domain,
    metricKey: input.metricKey,
    value: input.value,
    unit: input.unit ?? "count",
    previousValue: input.previousValue,
    delta: input.delta,
    trend: input.trend,
    source: input.source ?? {
      providerId: "google-search-console",
      clientId: 1,
      fetchedAt: "2026-07-01T00:00:00.000Z",
      freshness: "fresh",
      confidence: "high",
    },
    evidenceRefs: input.evidenceRefs ?? [],
  };
}

function snapshot(facts: ReportingFact[], p = period()): MetricSnapshot {
  return {
    clientId: 1,
    period: p,
    facts,
    enabledDomains: ["search", "website", "marketing"],
    overallConfidence: "high",
    composedAt: "2026-07-01T00:00:00.000Z",
  };
}

console.log("\nExecutive Performance panel-metrics integrity\n");

check("search maps clicks / impressions / ctr / average_position", () => {
  const specs = executivePanelMetricSpecs("search");
  assert.deepEqual(
    specs.map((s) => s.key),
    ["clicks", "impressions", "ctr", "average_position"],
  );
  assert.equal(executivePanelDomain("search"), "search");
});

check("website maps sessions / visitors / pageviews / conversions", () => {
  assert.deepEqual(
    executivePanelMetricSpecs("website").map((s) => s.key),
    ["sessions", "visitors", "pageviews", "conversions"],
  );
  assert.equal(executivePanelDomain("website"), "website");
});

check("ads maps ad_spend / clicks / conversions / cost_per_lead (no derivation)", () => {
  assert.deepEqual(
    executivePanelMetricSpecs("ads").map((s) => s.key),
    ["ad_spend", "clicks", "conversions", "cost_per_lead"],
  );
  assert.equal(executivePanelDomain("ads"), "marketing");
});

check("zero is shown as zero; missing keys are omitted", () => {
  const metrics = buildExecutivePanelMetrics(
    "search",
    snapshot([
      fact({ domain: "search", metricKey: "clicks", value: 0 }),
      fact({ domain: "search", metricKey: "impressions", value: 1200 }),
      // ctr intentionally missing
    ]),
  );
  const byKey = Object.fromEntries(metrics.map((m) => [m.key, m.value]));
  assert.equal(byKey.clicks, "0");
  assert.equal(byKey.impressions, "1,200");
  assert.equal(byKey.ctr, undefined);
  assert.equal(byKey.average_position, undefined);
});

check("CTR formats stored percent (0–100), not ratio", () => {
  assert.equal(formatExecutiveMetricValue(3.24, "percent"), "3.24%");
  assert.equal(formatExecutiveMetricValue(0, "percent"), "0.00%");
  const metrics = buildExecutivePanelMetrics(
    "search",
    snapshot([fact({ domain: "search", metricKey: "ctr", value: 2.5, unit: "percent" })]),
  );
  assert.equal(metrics[0]?.value, "2.50%");
  assert.ok(!metrics[0]?.value.includes("250"));
});

check("average position is not a percentage", () => {
  assert.equal(formatExecutiveMetricValue(8.42, "position"), "8.4");
  assert.ok(!formatExecutiveMetricValue(8.42, "position").includes("%"));
  assert.equal(formatExecutiveMetricValue(0, "position"), "—");
  assert.equal(formatExecutiveMetricValue(-1, "position"), "—");
});

check("provider / domain isolation — Search Console cannot fill Website", () => {
  const snap = snapshot([
    fact({ domain: "search", metricKey: "clicks", value: 99 }),
    fact({ domain: "search", metricKey: "sessions", value: 50 }), // wrong domain even if key exists
  ]);
  assert.equal(buildExecutivePanelMetrics("website", snap).length, 0);
  assert.equal(buildExecutivePanelMetrics("search", snap)[0]?.value, "99");
});

check("provider / domain isolation — Search clicks cannot fill Ads", () => {
  const snap = snapshot([
    fact({ domain: "search", metricKey: "clicks", value: 40 }),
    fact({ domain: "search", metricKey: "ad_spend", value: 100 }),
  ]);
  assert.equal(buildExecutivePanelMetrics("ads", snap).length, 0);
});

check("reporting-period isolation — mixed periods excluded", () => {
  const june = period("June 2026");
  const may: PeriodWindow = {
    start: "2026-05-01",
    end: "2026-05-31",
    grain: "month",
    label: "May 2026",
  };
  const snap = snapshot(
    [
      fact({ domain: "search", metricKey: "clicks", value: 10, period: june }),
      fact({ domain: "search", metricKey: "impressions", value: 9999, period: may }),
    ],
    june,
  );
  const metrics = buildExecutivePanelMetrics("search", snap);
  const byKey = Object.fromEntries(metrics.map((m) => [m.key, m.value]));
  assert.equal(byKey.clicks, "10");
  assert.equal(byKey.impressions, undefined);
});

check("currency formatting and no cost derivation", () => {
  assert.equal(formatExecutiveMetricValue(1234.5, "currency"), "$1,234.50");
  const snap = snapshot([
    fact({
      domain: "marketing",
      metricKey: "ad_spend",
      value: 500,
      source: {
        providerId: "google-ads",
        clientId: 1,
        fetchedAt: "2026-07-01T00:00:00.000Z",
        freshness: "fresh",
        confidence: "high",
      },
    }),
    // no cost_per_lead fact — must not invent 500 / conversions
  ]);
  const metrics = buildExecutivePanelMetrics("ads", snap);
  assert.equal(metrics.length, 1);
  assert.equal(metrics[0]?.key, "ad_spend");
  assert.equal(metrics[0]?.value, "$500.00");
});

check("no NaN / Infinity / invalid numeric output", () => {
  assert.equal(formatExecutiveMetricValue(Number.NaN, "count"), "—");
  assert.equal(formatExecutiveMetricValue(Number.POSITIVE_INFINITY, "percent"), "—");
  assert.equal(formatExecutiveMetricValue(Number.NEGATIVE_INFINITY, "currency"), "—");
  assert.equal(formatExecutiveMetricValue("not-a-number", "count"), "—");
  assert.equal(formatExecutiveMetricValue(null, "count"), "—");
  assert.equal(formatExecutiveMetricValue(undefined, "position"), "—");
});

check("connected-with-facts grid builds; empty domain yields empty metrics", () => {
  const live = buildExecutivePanelMetrics(
    "search",
    snapshot([
      fact({ domain: "search", metricKey: "clicks", value: 12 }),
      fact({ domain: "search", metricKey: "impressions", value: 400 }),
      fact({ domain: "search", metricKey: "ctr", value: 3 }),
      fact({ domain: "search", metricKey: "average_position", value: 11.2 }),
    ]),
  );
  assert.equal(live.length, 4);
  assert.deepEqual(
    live.map((m) => m.value),
    ["12", "400", "3.00%", "11.2"],
  );
  assert.equal(buildExecutivePanelMetrics("search", snapshot([])).length, 0);
});

console.log(`\nResult: ${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
