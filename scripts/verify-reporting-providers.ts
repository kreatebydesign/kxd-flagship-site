/**
 * Phase 29C.1 — Reporting provider bridges verification.
 * Fixtures + pure helpers. No live Google credentials. No DB migration.
 *
 * Run: npm run verify:reporting-providers
 */

import { createMonthPeriod } from "../lib/reporting/domain/period.ts";
import { composeReportingIntelligence } from "../lib/reporting/compose/intelligence.ts";
import { getReportingCapabilityIds } from "../lib/ces/partnership/capabilities.ts";
import {
  sanitizeProviderMessage,
  providerError,
  mapHttpStatusToProviderStatus,
} from "../lib/reporting/providers/errors.ts";
import {
  toProviderDate,
  periodIncludesToday,
  searchConsoleSettledEndDate,
  clampPeriodToSettled,
} from "../lib/reporting/providers/period.ts";
import {
  clearReportingProviderCache,
  getReportingProviderCache,
  getReportingProviderSuccessCache,
  reportingProviderCacheKey,
  setReportingProviderCache,
  reportingProviderCacheSize,
  reportingProviderSuccessCacheSize,
  ttlForProviderResult,
  REPORTING_PROVIDER_CACHE_MAX_ENTRIES,
} from "../lib/reporting/providers/cache.ts";
import { isCapabilityEnabled } from "../lib/reporting/providers/capability-gate.ts";
import {
  normalizeGa4PropertyId,
  normalizeSearchConsoleSiteUrl,
  resolveInfrastructureForClient,
  isClientEligibleForReportingIngest,
  encodeConnectionIdentity,
} from "../lib/reporting/providers/connection-resolve.ts";
import {
  GOOGLE_REPORTING_SCOPES,
  GOOGLE_REPORTING_ANALYTICS_SCOPE,
  GOOGLE_REPORTING_WEBMASTERS_SCOPE,
  GOOGLE_REPORTING_CREDENTIAL_PRECEDENCE,
  parseServiceAccountJson,
  resolveGoogleReportingCredentials,
} from "../lib/reporting/providers/google/auth.ts";
import { GA4_CORE_METRICS } from "../lib/reporting/providers/google/ga4/client.ts";
import { normalizeGa4Metrics } from "../lib/reporting/providers/google/ga4/normalize.ts";
import { normalizeSearchConsoleAggregate } from "../lib/reporting/providers/google/search-console/normalize.ts";
import { composeReportingFromProviderResults } from "../lib/reporting/providers/compose-from-providers.ts";
import type { ReportingProviderResult } from "../lib/reporting/providers/types.ts";
import { REPORTING_PROVIDER_CAPABILITY } from "../lib/reporting/providers/types.ts";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

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

const period = createMonthPeriod(2026, 6);
const closedPeriod = {
  start: "2026-05-01T00:00:00.000Z",
  end: "2026-05-31T23:59:59.999Z",
  grain: "month" as const,
  label: "May 2026",
};

console.log("\nPhase 29C.1 — Reporting Providers\n");

console.log("1. Capability architecture (canonical entitlement source)");
assert(REPORTING_PROVIDER_CAPABILITY.ga4 === "website-analytics", "GA4 → website-analytics");
assert(REPORTING_PROVIDER_CAPABILITY["search-console"] === "seo", "GSC → seo");
{
  const caps = getReportingCapabilityIds(["website-review", "website-analytics", "seo", "billing"]);
  assert(caps.includes("website-analytics") && caps.includes("seo"), "getReportingCapabilityIds filters reporting IDs");
  assert(!caps.includes("billing" as never), "non-reporting modules excluded from reporting capabilities");
  assert(!isCapabilityEnabled([], "website-analytics"), "empty entitlements disable GA4");
  assert(!isCapabilityEnabled(["seo"], "website-analytics"), "seo alone does not enable GA4");
}
{
  const infraPath = resolve("payload/collections/ClientInfrastructure.ts");
  const src = readFileSync(infraPath, "utf8");
  assert(!src.includes("reportingCapabilities"), "ClientInfrastructure has no reportingCapabilities field");
  assert(src.includes("searchConsoleSiteUrl"), "ClientInfrastructure retains searchConsoleSiteUrl connection field");
}
assert(
  !existsSync(resolve("migrations/20260808_phase29c_reporting_provider_connections.ts")),
  "future-dated 20260808 migration file removed",
);
{
  const mig = readFileSync(
    resolve("migrations/20260712_phase29c_reporting_provider_connections.ts"),
    "utf8",
  );
  assert(!mig.includes("reporting_capabilities"), "migration does not add reporting_capabilities column");
  assert(mig.includes("search_console_site_url"), "migration adds search_console_site_url only");
}

console.log("\n2. Period / freshness semantics");
{
  const todayPeriod = {
    start: "2026-07-01T00:00:00.000Z",
    end: "2026-07-12T23:59:59.999Z",
    grain: "month" as const,
  };
  assert(periodIncludesToday(todayPeriod, new Date("2026-07-12T18:00:00.000Z")), "current-day period detected");
  const { facts } = normalizeGa4Metrics({
    clientId: 1,
    period: todayPeriod,
    current: [{ name: "totalUsers", value: "10" }],
    previous: null,
    fetchedAt: "2026-07-12T18:00:00.000Z",
    freshness: "fresh",
    confidence: "medium",
    propertyId: "1",
  });
  assert(facts[0]?.source.freshness === "fresh", "freshly fetched current-day GA4 is not cache-stale");
  assert(facts[0]?.source.confidence === "medium", "partial period uses medium confidence");
}
{
  const settled = searchConsoleSettledEndDate(new Date("2026-07-12T00:00:00.000Z"), 3);
  const { adjusted } = clampPeriodToSettled(
    { start: "2026-07-01T00:00:00.000Z", end: "2026-07-12T23:59:59.999Z", grain: "month" },
    settled,
  );
  assert(adjusted, "GSC lag adjusts effective period without implying cache stale");
}

console.log("\n3. Authentication");
assert(GOOGLE_REPORTING_SCOPES.includes(GOOGLE_REPORTING_ANALYTICS_SCOPE), "analytics scope");
assert(GOOGLE_REPORTING_SCOPES.includes(GOOGLE_REPORTING_WEBMASTERS_SCOPE), "webmasters scope");
assert(GOOGLE_REPORTING_CREDENTIAL_PRECEDENCE[0] === "GOOGLE_REPORTING_SERVICE_ACCOUNT_JSON", "SA JSON precedes path/OAuth");
{
  const bad = parseServiceAccountJson("{not-json");
  assert(!bad.ok && bad.error.code === "invalid-configuration", "malformed SA JSON → invalid-configuration");
  assert(!JSON.stringify(bad).includes("private_key"), "parse failure omits credential material");
}
{
  const partial = parseServiceAccountJson(JSON.stringify({ client_email: "a@b.com" }));
  assert(!partial.ok && partial.error.code === "invalid-configuration", "partial SA (missing private_key) invalid");
}
{
  const escaped = parseServiceAccountJson(
    JSON.stringify({
      client_email: "sa@example.iam.gserviceaccount.com",
      private_key: "-----BEGIN PRIVATE KEY-----\\nABC\\n-----END PRIVATE KEY-----\\n",
    }),
  );
  assert(escaped.ok, "escaped private key newlines accepted");
  if (escaped.ok) {
    assert(escaped.value.private_key.includes("\nABC\n"), "literal \\n normalized to newlines");
  }
}
{
  const envMap: Record<string, string> = {
    GOOGLE_REPORTING_SERVICE_ACCOUNT_JSON: "{bad",
    GOOGLE_REPORTING_CLIENT_ID: "id",
    GOOGLE_REPORTING_CLIENT_SECRET: "secret",
    GOOGLE_REPORTING_REFRESH_TOKEN: "refresh",
  };
  const resolved = resolveGoogleReportingCredentials({
    get: (k) => envMap[k],
    present: (k) => Boolean(envMap[k]),
  });
  assert(resolved.kind === "invalid", "malformed SA does not fall through to OAuth");
}
{
  const envMap: Record<string, string> = {
    GOOGLE_CALENDAR_REFRESH_TOKEN: "calendar-only",
    GOOGLE_CALENDAR_CLIENT_ID: "cal-id",
  };
  const resolved = resolveGoogleReportingCredentials({
    get: (k) => envMap[k],
    present: (k) => Boolean(envMap[k]),
  });
  assert(resolved.kind === "not-configured", "Calendar credentials cannot satisfy reporting auth");
}
{
  const err = providerError("unauthorized", "Bearer ya29.secret-token-value revoked");
  assert(!JSON.stringify(err).toLowerCase().includes("ya29"), "secrets absent from serialized errors");
  assert(mapHttpStatusToProviderStatus(401) === "unauthorized", "revoked/401 → unauthorized");
}

console.log("\n4. Scoping and property resolution");
assert(normalizeGa4PropertyId("") === null, "empty GA4 property → not configured");
assert(normalizeGa4PropertyId("  ") === null, "whitespace GA4 property → not configured");
assert(normalizeGa4PropertyId("properties/12345") === "12345", "properties/ prefix normalized for API");
assert(normalizeGa4PropertyId("abc") === null, "non-numeric GA4 property rejected");
assert(normalizeSearchConsoleSiteUrl("") === null, "empty GSC site → not configured");
assert(
  normalizeSearchConsoleSiteUrl("https://example.com/") === "https://example.com/",
  "URL-prefix GSC preserved",
);
assert(
  normalizeSearchConsoleSiteUrl("sc-domain:example.com") === "sc-domain:example.com",
  "domain GSC preserved",
);
{
  const cross = resolveInfrastructureForClient(1, [{ id: 9, client: 2, ga4PropertyId: "1" }]);
  assert(cross === "cross-client", "cross-client infrastructure rejected");
  const dup = resolveInfrastructureForClient(1, [
    { id: 1, client: 1, updatedAt: "2026-01-01", ga4PropertyId: "111" },
    { id: 2, client: 1, updatedAt: "2026-06-01", ga4PropertyId: "222" },
  ]);
  assert(
    dup !== "cross-client" && dup !== null && dup.ga4PropertyId === "222",
    "duplicate infra picks newest updatedAt",
  );
}
assert(!isClientEligibleForReportingIngest("archived"), "archived clients blocked");
assert(isClientEligibleForReportingIngest("active"), "active clients eligible");
assert(encodeConnectionIdentity("https://a.com/") !== encodeConnectionIdentity("https://a.com"), "delimiter-safe identity encoding");

console.log("\n5. GA4 metrics");
assert(
  GA4_CORE_METRICS.join(",") === "totalUsers,sessions,screenPageViews,conversions",
  "GA4 requests only canonical-mapped metrics",
);
{
  const { facts } = normalizeGa4Metrics({
    clientId: 7,
    period: closedPeriod,
    current: [
      { name: "totalUsers", value: "1200" },
      { name: "sessions", value: "0" },
      { name: "screenPageViews", value: "4000" },
      { name: "conversions", value: "0" },
      { name: "keyEvents", value: "9" },
      { name: "engagedSessions", value: "900" },
      { name: "missingMetric", value: null },
    ],
    previous: null,
    fetchedAt: "2026-07-01T00:00:00.000Z",
    freshness: "fresh",
    confidence: "high",
    propertyId: "987654321",
  });
  const byKey = Object.fromEntries(facts.map((f) => [f.metricKey, f]));
  assert(byKey.visitors?.value === 1200, "totalUsers → visitors");
  assert(byKey.sessions?.value === 0, "valid zero sessions retained");
  assert(byKey.conversions?.value === 0, "conversions preferred over keyEvents when both present");
  assert(!facts.some((f) => (f.evidenceRefs.join("").includes("engagedSessions"))), "engagedSessions not requested as buried evidence");
  assert(facts.every((f) => !("accessToken" in f)), "access tokens absent from facts");
}
{
  const { facts } = normalizeGa4Metrics({
    clientId: 1,
    period: closedPeriod,
    current: [{ name: "keyEvents", value: "4" }],
    previous: null,
    fetchedAt: "2026-07-01T00:00:00.000Z",
    freshness: "fresh",
    confidence: "high",
    propertyId: "1",
  });
  assert(facts[0]?.metricKey === "conversions" && facts[0]?.value === 4, "keyEvents maps to canonical conversions");
}

console.log("\n6. Search Console metrics");
{
  const facts = normalizeSearchConsoleAggregate({
    clientId: 3,
    period: closedPeriod,
    current: { clicks: 0, impressions: 1500, ctr: 0, position: 12.56789 },
    previous: null,
    fetchedAt: "2026-07-01T00:00:00.000Z",
    freshness: "fresh",
    confidence: "high",
    siteUrl: "sc-domain:example.com",
  });
  const byKey = Object.fromEntries(facts.map((f) => [f.metricKey, f]));
  assert(byKey.clicks?.value === 0, "zero-click valid");
  assert(byKey.impressions?.value === 1500, "nonzero impressions with zero clicks");
  assert(byKey.average_position?.value === 12.5679, "average position precision to 4 decimals");
}
{
  const facts = normalizeSearchConsoleAggregate({
    clientId: 3,
    period: closedPeriod,
    current: { clicks: 10, impressions: 1000, ctr: 0.01, position: 8 },
    previous: null,
    fetchedAt: "2026-07-01T00:00:00.000Z",
    freshness: "fresh",
    confidence: "high",
    siteUrl: "https://example.com/",
  });
  assert(facts.find((f) => f.metricKey === "ctr")?.value === 1, "CTR ratio converted to percent once");
  assert(facts.every((f) => f.evidenceRefs[0] === "gsc:site:https://example.com/"), "URL-prefix unchanged");
}

console.log("\n7. Cache");
clearReportingProviderCache();
{
  const keyA = reportingProviderCacheKey({
    clientId: 1,
    provider: "ga4",
    connectionIdentity: "111",
    period,
  });
  const keyB = reportingProviderCacheKey({
    clientId: 2,
    provider: "ga4",
    connectionIdentity: "111",
    period,
  });
  assert(keyA !== keyB, "clients do not share cache keys");
  assert(keyA.includes(encodeConnectionIdentity("111")), "connection identity encoded in key");

  const sample: ReportingProviderResult = {
    providerId: "ga4",
    sourceProviderId: "google-analytics-4",
    clientId: 1,
    capabilityId: "website-analytics",
    requestedPeriod: period,
    effectivePeriod: period,
    status: "connected",
    facts: [],
    snapshot: null,
    fetchedAt: "2026-07-01T00:00:00.000Z",
    cachedAt: null,
    nextRefreshAt: null,
    freshness: "fresh",
    periodCompleteness: "complete",
    warnings: [],
    error: null,
  };
  setReportingProviderCache(keyA, sample, 3600);
  const fail: ReportingProviderResult = {
    ...sample,
    status: "rate-limited",
    freshness: "missing",
    error: providerError("rate-limited", "quota", { retryable: true, httpStatus: 429 }),
  };
  setReportingProviderCache(keyA, fail, 60);
  assert(getReportingProviderSuccessCache(keyA)?.result.status === "connected", "negative cache does not overwrite success");
  assert(ttlForProviderResult("ga4", closedPeriod, "rate-limited") === 5 * 60, "negative TTL");
  clearReportingProviderCache(keyA);
  assert(getReportingProviderCache(keyA) == null, "refresh-style clear removes only that key");
  assert(REPORTING_PROVIDER_CACHE_MAX_ENTRIES === 200, "bounded cache max documented");
  // Fill beyond bound briefly
  for (let i = 0; i < 5; i++) {
    setReportingProviderCache(
      reportingProviderCacheKey({
        clientId: 100 + i,
        provider: "ga4",
        connectionIdentity: String(i),
        period: closedPeriod,
      }),
      { ...sample, clientId: 100 + i },
      60,
    );
  }
  assert(reportingProviderCacheSize() >= 5, "cache accepts entries");
  assert(reportingProviderSuccessCacheSize() >= 5, "success store populated");
  clearReportingProviderCache();
}

console.log("\n8. Mixed compose + architecture boundaries");
{
  const ga4Ok: ReportingProviderResult = {
    providerId: "ga4",
    sourceProviderId: "google-analytics-4",
    clientId: 9,
    capabilityId: "website-analytics",
    requestedPeriod: closedPeriod,
    effectivePeriod: closedPeriod,
    status: "connected",
    facts: normalizeGa4Metrics({
      clientId: 9,
      period: closedPeriod,
      current: [
        { name: "totalUsers", value: "500" },
        { name: "sessions", value: "600" },
        { name: "screenPageViews", value: "1200" },
        { name: "conversions", value: "5" },
      ],
      previous: null,
      fetchedAt: "2026-07-01T00:00:00.000Z",
      freshness: "fresh",
      confidence: "high",
      propertyId: "1",
    }).facts,
    snapshot: null,
    fetchedAt: "2026-07-01T00:00:00.000Z",
    cachedAt: null,
    nextRefreshAt: null,
    freshness: "fresh",
    periodCompleteness: "complete",
    warnings: [],
    error: null,
  };
  const gscFail: ReportingProviderResult = {
    providerId: "search-console",
    sourceProviderId: "google-search-console",
    clientId: 9,
    capabilityId: "seo",
    requestedPeriod: closedPeriod,
    effectivePeriod: closedPeriod,
    status: "disconnected",
    facts: [],
    snapshot: null,
    fetchedAt: null,
    cachedAt: null,
    nextRefreshAt: null,
    freshness: "missing",
    periodCompleteness: "unknown",
    warnings: [],
    error: providerError("disconnected", "Search Console not connected."),
  };
  const bundle = composeReportingFromProviderResults({
    clientId: 9,
    period: closedPeriod,
    results: [ga4Ok, gscFail],
  });
  assert(bundle.snapshot.facts.some((f) => f.metricKey === "visitors"), "GA4 facts enter engine");
  assert(!bundle.snapshot.facts.some((f) => f.metricKey === "clicks"), "failed GSC fabricates nothing");
  assert(composeReportingIntelligence({
    clientId: 9,
    period: closedPeriod,
    facts: ga4Ok.facts,
    enabledCapabilities: ["website-analytics"],
  }).health != null, "Business Health composes");
}
{
  const root = resolve(process.cwd());
  const files: Array<[string, string]> = [
    ["executive-intelligence adapter", "lib/reporting/adapters/executive-intelligence.ts"],
    ["compose", "lib/reporting/compose/intelligence.ts"],
    ["health engine", "lib/reporting/health/engine.ts"],
    ["partnership compose", "lib/ces/partnership/compose.ts"],
  ];
  for (const [name, rel] of files) {
    const src = readFileSync(resolve(root, rel), "utf8");
    assert(!src.includes("googleapis"), `${name}: no googleapis`);
    assert(!src.includes("analyticsdata.googleapis"), `${name}: no GA4 API`);
    assert(!src.includes("webmasters/v3"), `${name}: no GSC API`);
    assert(!src.includes("providers/google"), `${name}: no Google provider modules`);
  }
  const liveGa4 = readFileSync(resolve(root, "lib/live-integrations/ga4.ts"), "utf8");
  const liveGsc = readFileSync(resolve(root, "lib/live-integrations/search-console.ts"), "utf8");
  assert(liveGa4.includes("Thin compatibility") || liveGa4.includes("NOT the canonical"), "live GA4 marked as thin probe");
  assert(!liveGa4.includes("analyticsdata.googleapis"), "live GA4 does not call Data API");
  assert(!liveGsc.includes("webmasters/v3"), "live GSC does not call Search Console API");
  assert(liveGa4.includes("ingestClientReportingProvider"), "live GA4 points to canonical ingest");
}

console.log(`\nResult: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
