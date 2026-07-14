/**
 * Phase 31C — Focused reporting ingest / period / persistence boundary verification.
 * No live Google calls. No secrets printed.
 */

import { readFileSync } from "fs";
import { resolve } from "path";
import {
  defaultExecutiveReportingPeriod,
  resolveIngestPeriod,
  REPORTING_INGEST_MAX_RANGE_DAYS,
} from "../lib/reporting/ingest/period";
import {
  isAuthorizedCronBearer,
  resolveConfiguredCronSecret,
  isReportingAdminIngestPath,
} from "../lib/reporting/ingest/cron-auth";
import { parseReportingIngestBody } from "../lib/reporting/ingest/sync-reporting-facts";
import {
  reportingFactToDocData,
  summarizeReportingFactProvenance,
} from "../lib/reporting/persistence/facts";
import type { ReportingFact } from "../lib/reporting/domain";

let passed = 0;
let failed = 0;

function assert(cond: boolean, label: string) {
  if (cond) {
    console.log(`  ✓ ${label}`);
    passed += 1;
  } else {
    console.log(`  ✗ ${label}`);
    failed += 1;
  }
}

function mockFact(overrides: Partial<ReportingFact> = {}): ReportingFact {
  return {
    id: "gsc-1-clicks-2026-06-01",
    clientId: 1,
    period: {
      start: "2026-06-01T00:00:00.000Z",
      end: "2026-06-30T23:59:59.999Z",
      grain: "month",
      label: "June 2026",
    },
    domain: "search",
    metricKey: "clicks",
    value: 12,
    unit: "count",
    previousValue: 10,
    delta: 2,
    trend: "up",
    source: {
      providerId: "google-search-console",
      clientId: 1,
      fetchedAt: "2026-07-13T12:00:00.000Z",
      freshness: "fresh",
      confidence: "high",
    },
    evidenceRefs: ["gsc:site:sc-domain:primalmotorsports.com"],
    ...overrides,
  };
}

console.log("\n1. Period defaults");
{
  const period = defaultExecutiveReportingPeriod(
    new Date("2026-07-13T15:00:00.000Z"),
  );
  assert(period.label === "June 2026", "default period is previous completed month");
  assert(period.start.startsWith("2026-06-01"), "June start");
  assert(period.end.startsWith("2026-06-30"), "June end");
  const explicit = resolveIngestPeriod({ year: 2026, month: 5 });
  assert(!("error" in explicit) && explicit.label === "May 2026", "explicit month wins");
  const tooLong = resolveIngestPeriod({
    start: "2026-01-01",
    end: "2026-06-30",
  });
  assert("error" in tooLong, "excessive date range rejected");
  const okRange = resolveIngestPeriod({
    start: "2026-06-01",
    end: "2026-06-30",
  });
  assert(!("error" in okRange), "bounded custom range accepted");
  assert(
    REPORTING_INGEST_MAX_RANGE_DAYS === 62,
    "max range days documented as 62",
  );
}

console.log("\n2. Request validation");
{
  assert(
    "error" in parseReportingIngestBody({ provider: "bing" }),
    "invalid provider rejected",
  );
  assert(
    "error" in parseReportingIngestBody({ provider: "search-console" }),
    "missing client rejected",
  );
  assert(
    !(
      "error" in
      parseReportingIngestBody({
        provider: "search-console",
        clientSlug: "primal-motorsports",
      })
    ),
    "valid slug + provider accepted",
  );
  assert(
    !(
      "error" in
      parseReportingIngestBody({
        provider: "ads",
        clientSlug: "primal-motorsports",
      })
    ),
    "ads provider allowlisted",
  );
  assert(
    "error" in parseReportingIngestBody({ provider: "google-ads", clientSlug: "x" }),
    "long-form google-ads provider id rejected (use ads)",
  );
}

console.log("\n3. Persistence boundary (mocked facts)");
{
  const fact = mockFact();
  const doc = reportingFactToDocData(fact);
  assert(doc.factKey === fact.id, "doc uses factKey");
  assert(doc.providerId === "google-search-console", "provider provenance stored");
  assert(!("accessToken" in doc), "no access token fields");
  assert(!JSON.stringify(doc).includes("Bearer"), "no bearer material");

  const zeroFacts = [
    mockFact({ value: 0, id: "gsc-1-clicks-2026-06-01", metricKey: "clicks" }),
    mockFact({
      value: 0,
      id: "gsc-1-impressions-2026-06-01",
      metricKey: "impressions",
    }),
  ];
  const provenance = summarizeReportingFactProvenance(zeroFacts);
  assert(provenance.factCount === 2, "zero activity facts still counted");
  assert(
    provenance.providerIds.includes("google-search-console"),
    "provider ids from facts",
  );
  assert(
    zeroFacts.every((f) => f.value === 0),
    "synced zero activity distinguishable from empty load",
  );
}

console.log("\n4. Idempotent fact keys");
{
  const a = mockFact({ id: "gsc-1-clicks-2026-06-01", value: 5 });
  const b = mockFact({ id: "gsc-1-clicks-2026-06-01", value: 8 });
  assert(a.id === b.id, "re-ingest shares deterministic factKey");
  assert(
    reportingFactToDocData(a).factKey === reportingFactToDocData(b).factKey,
    "upsert key stable across value updates",
  );
}

console.log("\n5. Presentation never imports Google providers");
{
  const root = resolve(process.cwd());
  const files = [
    "lib/ces/executive-performance/compose.ts",
    "components/ces/executive-performance/CesExecutivePerformanceWorkspace.tsx",
    "lib/reporting/persistence/facts.ts",
  ];
  for (const rel of files) {
    const src = readFileSync(resolve(root, rel), "utf8");
    assert(!src.includes("googleapis"), `${rel}: no googleapis`);
    assert(!src.includes("providers/google"), `${rel}: no providers/google`);
    assert(!src.includes("getGoogleReportingAccessToken"), `${rel}: no token helper`);
  }
  const syncSrc = readFileSync(
    resolve(root, "lib/reporting/ingest/sync-reporting-facts.ts"),
    "utf8",
  );
  assert(
    syncSrc.includes("persistReportingFacts"),
    "sync orchestrator persists facts",
  );
  assert(
    syncSrc.includes("ingestClientReportingProvider"),
    "sync orchestrator uses provider ingest",
  );
  assert(!syncSrc.includes("console.log(accessToken"), "no token logging");

  const adminRoute = readFileSync(
    resolve(root, "app/api/admin/reporting/ingest/route.ts"),
    "utf8",
  );
  const cronRoute = readFileSync(
    resolve(root, "app/api/cron/reporting-ingest/route.ts"),
    "utf8",
  );
  assert(adminRoute.includes("authorizeReportingIngest"), "admin route protected");
  assert(
    cronRoute.includes("isAuthorizedCronBearer"),
    "cron route uses shared fail-closed auth",
  );
  assert(!adminRoute.includes("accessToken"), "admin response has no accessToken");
  assert(!cronRoute.includes("accessToken"), "cron response has no accessToken");

  const middlewareSrc = readFileSync(resolve(root, "middleware.ts"), "utf8");
  assert(
    middlewareSrc.includes("isReportingAdminIngestPath"),
    "middleware scopes cron bearer to reporting ingest only",
  );
  assert(
    middlewareSrc.includes("/api/cron/:path*"),
    "middleware matcher includes cron routes",
  );
  assert(
    middlewareSrc.includes('pathname.startsWith("/api/cron/")'),
    "middleware gates /api/cron fail-closed",
  );
}

console.log("\n6. Cron fail-closed authorization");
{
  assert(
    resolveConfiguredCronSecret({}) === null,
    "absent CRON_SECRET resolves null",
  );
  assert(
    resolveConfiguredCronSecret({ CRON_SECRET: "" }) === null,
    "blank CRON_SECRET resolves null",
  );
  assert(
    resolveConfiguredCronSecret({ CRON_SECRET: "   " }) === null,
    "whitespace CRON_SECRET resolves null",
  );
  assert(
    resolveConfiguredCronSecret({ CRON_SECRET: "prod-secret" }) === "prod-secret",
    "configured CRON_SECRET resolves",
  );

  const env = { CRON_SECRET: "prod-secret" };
  assert(
    !isAuthorizedCronBearer(null, {}),
    "absent secret + no header → unauthorized",
  );
  assert(
    !isAuthorizedCronBearer("Bearer prod-secret", {}),
    "absent secret + bearer present → unauthorized (fail closed)",
  );
  assert(
    !isAuthorizedCronBearer("Bearer prod-secret", { CRON_SECRET: "" }),
    "blank secret → unauthorized",
  );
  assert(
    !isAuthorizedCronBearer(null, env),
    "missing Authorization → unauthorized",
  );
  assert(
    !isAuthorizedCronBearer("", env),
    "empty Authorization → unauthorized",
  );
  assert(
    !isAuthorizedCronBearer("Bearer", env),
    "malformed Bearer → unauthorized",
  );
  assert(
    !isAuthorizedCronBearer("Bearer wrong", env),
    "incorrect secret → unauthorized",
  );
  assert(
    !isAuthorizedCronBearer("bearer prod-secret", env),
    "wrong scheme casing → unauthorized",
  );
  assert(
    isAuthorizedCronBearer("Bearer prod-secret", env),
    "exact Bearer match authorized",
  );
  assert(
    isReportingAdminIngestPath("/api/admin/reporting/ingest"),
    "ingest path recognized",
  );
  assert(
    !isReportingAdminIngestPath("/api/admin/financial-command/rebuild"),
    "other admin paths not cron-scoped",
  );
}

console.log(`\nResult: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
