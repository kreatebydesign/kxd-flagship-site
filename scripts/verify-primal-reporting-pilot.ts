/**
 * Phase 4 Batch J.2B — Primal reporting pilot readiness (static + unit).
 * No Google API calls. No entitlement mutations. No identity mutations.
 */

import assert from "node:assert/strict";
import { getReportingCapabilityIds } from "../lib/ces/partnership/capabilities";
import {
  executivePanelMetricSpecs,
  formatExecutiveMetricValue,
} from "../lib/ces/executive-performance/panel-metrics";
import type { CesModuleId } from "../lib/ces/types";
import {
  confirmedLeadsUnavailable,
  labelForFreshnessState,
  resolveProviderFreshnessPresentation,
} from "../lib/reporting/freshness/presentation";
import { REPORTING_PROVIDER_METRIC_SET_VERSION } from "../lib/reporting/providers/types";
import {
  GOOGLE_ADS_API_VERSION,
  buildGoogleAdsSearchUrl,
} from "../lib/reporting/providers/google/ads/client";
import { ALL_REPORTING_CAPABILITIES } from "../lib/reporting/domain/capabilities";

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

const CES_NAV_MODULES = new Set<CesModuleId>([
  "website-review",
  "website-workspace",
  "executive-performance",
  "executive-review",
  "inventory",
]);

const LAUNCH_HIDDEN_NAV = [
  "analytics",
  "reports",
  "requests",
  "assets",
  "deliverables",
] as const;

console.log("\nBatch J.2B — Primal reporting pilot verifier\n");

check("metric set version bumps for generate_lead pipeline", () => {
  assert.equal(REPORTING_PROVIDER_METRIC_SET_VERSION, "j2b.1.0");
});

check("Google Ads REST uses current API version (not sunset v18)", () => {
  assert.equal(GOOGLE_ADS_API_VERSION, "v25");
  assert.match(
    buildGoogleAdsSearchUrl("7431689593"),
    /^https:\/\/googleads\.googleapis\.com\/v25\/customers\/7431689593\/googleAds:search$/,
  );
});

check("reporting capabilities are distinct from CES nav modules", () => {
  for (const cap of ["seo", "website-analytics", "google-ads"] as const) {
    assert.ok(ALL_REPORTING_CAPABILITIES.includes(cap));
    assert.equal(CES_NAV_MODULES.has(cap as CesModuleId), false);
  }
});

check("enabling reporting caps does not imply Analytics/Reports nav modules", () => {
  const modules = [
    "website-review",
    "executive-performance",
    "seo",
    "website-analytics",
    "google-ads",
  ];
  const caps = getReportingCapabilityIds(modules);
  assert.deepEqual(caps.sort(), ["google-ads", "seo", "website-analytics"].sort());
  for (const hidden of LAUNCH_HIDDEN_NAV) {
    assert.equal(modules.includes(hidden), false);
  }
});

check("website panel keeps generate_lead separate from aggregate conversions", () => {
  const keys = executivePanelMetricSpecs("website").map((s) => s.key);
  assert.ok(keys.includes("generate_lead"));
  assert.ok(keys.includes("conversions"));
  assert.ok(keys.indexOf("generate_lead") < keys.indexOf("conversions"));
  assert.equal(
    executivePanelMetricSpecs("website").find((s) => s.key === "generate_lead")?.label,
    "GA4 lead actions",
  );
  assert.equal(
    executivePanelMetricSpecs("website").find((s) => s.key === "conversions")?.label,
    "GA4 conversions",
  );
});

check("ads panel labels Ads conversions and cost/conversion separately", () => {
  const ads = executivePanelMetricSpecs("ads");
  assert.equal(ads.find((s) => s.key === "conversions")?.label, "Ads conversions");
  assert.equal(ads.find((s) => s.key === "cost_per_lead")?.label, "Cost / conversion");
  assert.equal(ads.find((s) => s.key === "ad_spend")?.label, "Spend");
});

check("missing metrics render as em-dash, never fake zero", () => {
  assert.equal(formatExecutiveMetricValue(null, "count"), "—");
  assert.equal(formatExecutiveMetricValue(undefined, "currency"), "—");
  assert.equal(formatExecutiveMetricValue(0, "count"), "0");
});

check("every freshness presentation state has a label", () => {
  const states = [
    "current",
    "delayed",
    "stale",
    "sync_failed",
    "never_synchronized",
    "unavailable",
    "not_connected",
    "not_enough_data",
  ] as const;
  for (const state of states) {
    assert.ok(labelForFreshnessState(state).length > 0);
  }
});

check("not connected when entitlement missing", () => {
  const p = resolveProviderFreshnessPresentation({
    entitled: false,
    connectedConfigured: false,
  });
  assert.equal(p.state, "not_connected");
});

check("never synchronized when entitled but no sync timestamp", () => {
  const p = resolveProviderFreshnessPresentation({
    entitled: true,
    connectedConfigured: true,
    factCount: 0,
  });
  assert.equal(p.state, "never_synchronized");
});

check("sync failed when only failure timestamp exists", () => {
  const p = resolveProviderFreshnessPresentation({
    entitled: true,
    connectedConfigured: true,
    lastFailedSyncAt: "2026-07-30T12:00:00.000Z",
  });
  assert.equal(p.state, "sync_failed");
});

check("stale when last success is old", () => {
  const p = resolveProviderFreshnessPresentation({
    entitled: true,
    connectedConfigured: true,
    lastSuccessfulSyncAt: "2026-06-01T12:00:00.000Z",
    factCount: 4,
    now: new Date("2026-07-31T12:00:00.000Z"),
  });
  assert.equal(p.state, "stale");
});

check("delayed for Search Console periodCompleteness", () => {
  const p = resolveProviderFreshnessPresentation({
    entitled: true,
    connectedConfigured: true,
    lastSuccessfulSyncAt: "2026-07-31T12:00:00.000Z",
    dataThroughDate: "2026-07-28",
    periodCompleteness: "delayed",
    factCount: 4,
    now: new Date("2026-07-31T12:00:00.000Z"),
  });
  assert.equal(p.state, "delayed");
  assert.equal(p.dataThroughDate, "2026-07-28");
});

check("current uses source fetch time, not composition time", () => {
  const sourceFetchedAt = "2026-07-31T05:00:00.000Z";
  const compositionTime = "2026-07-31T19:00:00.000Z";
  const p = resolveProviderFreshnessPresentation({
    entitled: true,
    connectedConfigured: true,
    sourceFetchedAt,
    dataThroughDate: "2026-07-29",
    factCount: 4,
    now: new Date(compositionTime),
  });
  assert.equal(p.state, "current");
  assert.equal(p.lastSuccessfulSyncAt, sourceFetchedAt);
  assert.notEqual(p.lastSuccessfulSyncAt, compositionTime);
});

check("confirmed leads stay unavailable — never inferred", () => {
  const c = confirmedLeadsUnavailable();
  assert.equal(c.state, "unavailable");
  assert.equal(c.count, null);
  assert.match(c.label, /not connected/i);
  assert.match(c.detail, /GA4 lead actions/i);
  assert.match(c.detail, /Google Ads conversions/i);
});

check("approvals route remains out of Primal CES module set", () => {
  assert.equal(CES_NAV_MODULES.has("approvals" as CesModuleId), false);
});

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
