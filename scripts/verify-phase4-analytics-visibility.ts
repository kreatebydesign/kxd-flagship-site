/**
 * Phase 4 Batch E — Analytics, website performance, and lead visibility.
 * Static + pure-unit verification only. No database. No external writes.
 *
 * Run: npm run verify:phase4-analytics-visibility
 */
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import path from "node:path";
import type { ReportingFact } from "../lib/reporting/domain/types";
import {
  composeAnalyticsVisibilityModel,
  decidePortalReportAccess,
  EXPECTED_ANALYTICS_METRIC_KEYS,
  portalReportAccessDenied,
} from "../lib/portal/analytics-visibility";
import {
  comparisonPeriodFor,
  defaultWorkPerformancePeriod,
} from "../lib/portal/work-performance/period";
import { resolvePortfolioAccess } from "../lib/portal/portfolio";

const root = process.cwd();

function read(rel: string) {
  return readFileSync(path.join(root, rel), "utf8");
}

function walkFiles(dir: string, exts: Set<string>, out: string[] = []): string[] {
  let entries: import("node:fs").Dirent[] = [];
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const ent of entries) {
    if (
      ent.name === "node_modules" ||
      ent.name === ".next" ||
      ent.name === ".git" ||
      ent.name === ".tmp"
    ) {
      continue;
    }
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) walkFiles(full, exts, out);
    else if (exts.has(path.extname(ent.name))) out.push(full);
  }
  return out;
}

function check(label: string, pass: boolean, detail?: string) {
  console.log(pass ? `  ✔ ${label}` : `  ✘ ${label}${detail ? ` — ${detail}` : ""}`);
  assert.ok(pass, detail ? `${label}: ${detail}` : label);
}

function fact(
  partial: Partial<ReportingFact> & Pick<ReportingFact, "metricKey" | "value">,
): ReportingFact {
  const period = defaultWorkPerformancePeriod(new Date("2026-07-15T12:00:00.000Z"));
  return {
    id: partial.id ?? `fact-${partial.metricKey}`,
    clientId: partial.clientId ?? 42,
    period,
    domain: partial.domain ?? "website",
    metricKey: partial.metricKey,
    value: partial.value,
    unit: partial.unit ?? "count",
    previousValue: partial.previousValue ?? null,
    delta: partial.delta ?? null,
    trend: partial.trend,
    source: partial.source ?? {
      providerId: "google-analytics-4",
      clientId: partial.clientId ?? 42,
      fetchedAt: "2026-07-02T00:00:00.000Z",
      freshness: "fresh",
      confidence: "high",
    },
    evidenceRefs: [],
  };
}

function main() {
  console.log("\nPhase 4 Batch E — analytics, website performance, and lead visibility\n");

  const period = defaultWorkPerformancePeriod(new Date("2026-07-15T12:00:00.000Z"));
  check("default period is previous UTC month", period.start.startsWith("2026-06"));
  check("comparison period exists", comparisonPeriodFor(period) != null);

  // Isolation: mismatch throws
  let mismatch = false;
  try {
    composeAnalyticsVisibilityModel({
      authorizedClientId: 1,
      clientName: "A",
      clientSlug: "a",
      sourceClientId: 2,
      reportingPeriod: period,
      reportingFacts: [],
      reportingEntitled: false,
      ga4PropertyConfigured: false,
      searchConsoleConfigured: false,
      publishedReports: [],
    });
  } catch {
    mismatch = true;
  }
  check("client mismatch fails closed", mismatch);

  // Not entitled — never zeros
  const unentitled = composeAnalyticsVisibilityModel({
    authorizedClientId: 42,
    clientName: "Acme",
    clientSlug: "acme",
    sourceClientId: 42,
    reportingPeriod: period,
    reportingFacts: [],
    reportingEntitled: false,
    ga4PropertyConfigured: false,
    searchConsoleConfigured: false,
    publishedReports: [],
  });
  check(
    "unenitled analytics is not-entitled",
    unentitled.analytics.availability === "not-entitled",
  );
  check("unenitled leads are not-entitled", unentitled.leads.availability === "not-entitled");
  check("sales pipeline never available", unentitled.leads.salesPipelineAvailable === false);
  check(
    "unenitled sources mark not-entitled",
    unentitled.sources.every((s) => s.state === "not-entitled"),
  );

  // Configured but no facts — unavailable, not zero
  const disconnected = composeAnalyticsVisibilityModel({
    authorizedClientId: 7,
    clientName: "Demo",
    clientSlug: "demo",
    sourceClientId: 7,
    reportingPeriod: period,
    reportingFacts: [],
    reportingEntitled: true,
    ga4PropertyConfigured: true,
    searchConsoleConfigured: false,
    publishedReports: [],
  });
  check(
    "configured without facts is unavailable (not zero)",
    disconnected.analytics.availability === "unavailable" &&
      disconnected.analytics.metrics.length === 0,
  );
  check(
    "GA4 source configured when property on file",
    disconnected.sources.find((s) => s.id === "ga4")?.state === "configured",
  );
  check(
    "Search Console not-configured when absent",
    disconnected.sources.find((s) => s.id === "search-console")?.state === "not-configured",
  );
  check(
    "facts source unavailable when configured but empty",
    disconnected.sources.find((s) => s.id === "reporting-facts")?.state === "unavailable",
  );

  // Partial facts
  const partial = composeAnalyticsVisibilityModel({
    authorizedClientId: 7,
    clientName: "Demo",
    clientSlug: "demo",
    sourceClientId: 7,
    reportingPeriod: period,
    reportingFacts: [
      fact({
        clientId: 7,
        metricKey: "sessions",
        value: 120,
        previousValue: 100,
        delta: 20,
      }),
      fact({
        clientId: 7,
        metricKey: "conversions",
        value: 3,
        previousValue: 1,
        delta: 2,
      }),
      fact({ clientId: 7, metricKey: "form_submissions", value: 5 }),
    ],
    reportingEntitled: true,
    analyticsFreshnessNote: "Facts refreshed 2026-07-02",
    ga4PropertyConfigured: true,
    searchConsoleConfigured: true,
    publishedReports: [
      {
        id: 99,
        title: "June Report",
        periodLabel: "June 2026",
        href: "/portal/reports/99",
      },
    ],
  });
  check("partial data flagged when expected metrics missing", partial.partialData === true);
  check(
    "sessions and conversions present; missing metrics omitted",
    partial.analytics.metrics.some((m) => m.key === "sessions") &&
      !partial.analytics.metrics.some((m) => m.key === "impressions"),
  );
  check("expected metric key inventory is stable", EXPECTED_ANALYTICS_METRIC_KEYS.includes("ctr"));
  check("tracked conversions ready", partial.leads.conversionCount === 3);
  check("form submissions surfaced when present", partial.leads.formSubmissionCount === 5);
  check(
    "confirmed leads stay unavailable (never inferred)",
    partial.leads.confirmedLeadCount === null &&
      /not connected/i.test(partial.leads.confirmedLeadLabel),
  );
  check(
    "three lead categories stay separate",
    /separate/i.test(partial.leads.statusNote ?? "") &&
      !/total leads/i.test(partial.leads.statusNote ?? ""),
  );
  check(
    "conversions labeled honestly",
    /conversion/i.test(partial.leads.conversionLabel) ||
      /separate/i.test(partial.leads.statusNote ?? ""),
  );
  check("published reports scoped list ready", partial.reports.items.length === 1);
  check(
    "freshness note retained",
    partial.analytics.freshnessNote?.includes("2026-07-02") === true,
  );

  // Error load state
  const errored = composeAnalyticsVisibilityModel({
    authorizedClientId: 7,
    clientName: "Demo",
    clientSlug: "demo",
    sourceClientId: 7,
    reportingPeriod: period,
    reportingFacts: [],
    reportingEntitled: true,
    ga4PropertyConfigured: false,
    searchConsoleConfigured: false,
    publishedReports: [],
    loadError: "Analytics data is temporarily unavailable for this account.",
  });
  check("load error state is honest", errored.loadState === "error" && Boolean(errored.errorNote));

  // Report access — forged / cross-client denied
  const okAccess = decidePortalReportAccess({
    report: { status: "published", client: 7 },
    authorizedClientId: 7,
  });
  check("matching published report allowed", okAccess.ok === true);

  const forged = decidePortalReportAccess({
    report: { status: "published", client: 99 },
    authorizedClientId: 7,
  });
  check("cross-client report denied", forged.ok === false && forged.reason === "cross-client");
  check("uniform denial helper", portalReportAccessDenied(forged) === true);

  const unpublished = decidePortalReportAccess({
    report: { status: "draft", client: 7 },
    authorizedClientId: 7,
  });
  check("unpublished report denied", unpublished.ok === false);

  const missing = decidePortalReportAccess({
    report: null,
    authorizedClientId: 7,
  });
  check("missing report denied", missing.ok === false);

  // Portfolio remains gated (Batch F) — analytics batch must not bypass the flag
  const portfolioOff = resolvePortfolioAccess({
    switchingAvailable: true,
    authorizedClientIds: [1, 2, 3],
    portfolioAccessAvailable: false,
  });
  check(
    "portfolio still not-enabled when flag off",
    portfolioOff.available === false && portfolioOff.reason === "not-enabled",
  );
  const portfolioOn = resolvePortfolioAccess({
    switchingAvailable: true,
    authorizedClientIds: [1, 2, 3],
    portfolioAccessAvailable: true,
  });
  check("portfolio enabled only when Batch F flag on", portfolioOn.available === true);

  // Route / UI / server wiring
  const analyticsPage = read("app/(portal)/portal/(app)/analytics/page.tsx");
  check(
    "analytics page uses session + analytics visibility server",
    analyticsPage.includes("getPortalSession") &&
      analyticsPage.includes("resolvePortalAnalyticsVisibility") &&
      !analyticsPage.includes("analyticsConnected"),
  );

  const reportPage = read("app/(portal)/portal/(app)/reports/[id]/page.tsx");
  check(
    "report detail uses decidePortalReportAccess",
    reportPage.includes("decidePortalReportAccess") && reportPage.includes("notFound()"),
  );

  const reportViewApi = read("app/api/portal/reports/[id]/view/route.ts");
  check(
    "report view API denies forged ids uniformly",
    reportViewApi.includes("decidePortalReportAccess") &&
      reportViewApi.includes("status: 404") &&
      !reportViewApi.includes("Forbidden"),
  );

  const healthPage = read("app/(portal)/portal/(app)/website-health/page.tsx");
  check(
    "website-health page stays session-scoped",
    healthPage.includes("getPortalSession") && healthPage.includes("getPortalWebsiteHealth"),
  );

  const healthData = read("lib/portal/data.ts");
  check(
    "website-health uses reporting connection for GA4/GSC",
    healthData.includes("loadClientReportingConnection") &&
      healthData.includes("searchConsoleConfigured"),
  );
  check(
    "website audit lookup requires authorized client FK",
    healthData.includes("getPortalWebsiteAudit(") &&
      healthData.includes("authorizedClientId") &&
      healthData.includes("client: { equals: authorizedClientId }") &&
      healthData.includes("resolveAuditClientId(audit.client) !== authorizedClientId"),
  );
  check(
    "website audit does not authorize by host contains alone",
    !/where:\s*\{\s*website:\s*\{\s*contains:\s*websiteHost\s*\}\s*\}/.test(healthData),
  );

  const analyticsScreen = read("components/client-hq/AnalyticsScreen.tsx");
  check(
    "AnalyticsScreen renders visibility workspace (not placeholder)",
    analyticsScreen.includes("AnalyticsVisibilityWorkspace") &&
      !analyticsScreen.includes("future release"),
  );

  const workspace = read("components/portal/AnalyticsVisibilityWorkspace.tsx");
  check(
    "workspace covers sources, performance, leads, reports, retry",
    workspace.includes("About these results") &&
      workspace.includes("model.sources.map") &&
      workspace.includes("Website performance") &&
      workspace.includes("Leads and conversions") &&
      workspace.includes("Retry") &&
      !workspace.includes("data-workspace-client"),
  );

  const server = read("lib/portal/analytics-visibility/server.ts");
  check(
    "server resolves from session.clientId only",
    server.includes("session.clientId") &&
      !server.includes("searchParams") &&
      server.includes("loadReportingFacts"),
  );

  // No browser clientId authorization patterns in new Batch E files
  const batchEFiles = walkFiles(
    path.join(root, "lib/portal/analytics-visibility"),
    new Set([".ts"]),
  ).concat([
    path.join(root, "components/portal/AnalyticsVisibilityWorkspace.tsx"),
    path.join(root, "components/client-hq/AnalyticsScreen.tsx"),
  ]);
  for (const file of batchEFiles) {
    const src = readFileSync(file, "utf8");
    check(
      `no browser clientId auth in ${path.relative(root, file)}`,
      !/authorizedClientId\s*=\s*.*searchParams/.test(src) &&
        !/clientId\s*=\s*Number\(.*cookies/.test(src),
    );
  }

  // Package script
  const packageJson = read("package.json");
  check("package script registered", packageJson.includes("verify:phase4-analytics-visibility"));

  // Docs acknowledge Batch E
  const phase4 = read("docs/PHASE-4-MULTI-CLIENT-PORTAL.md");
  check(
    "Phase 4 plan documents Batch E",
    phase4.includes("Batch E — Analytics, website performance, and lead visibility"),
  );

  // Layout remount on switch (stale prop protection)
  const layout = read("app/(portal)/portal/(app)/layout.tsx");
  check(
    "portal layout remounts children on active client change",
    layout.includes("portal-client-${session.clientId}") ||
      layout.includes("`portal-client-${session.clientId}`") ||
      /key=\{`portal-client-\$\{session\.clientId\}`\}/.test(layout),
  );

  // Guard: no branded-report production paths introduced in Batch E surfaces
  const analyticsVisDir = path.join(root, "lib/portal/analytics-visibility");
  check("analytics-visibility module present", existsSync(analyticsVisDir));
  const analyticsVisSrc = walkFiles(analyticsVisDir, new Set([".ts"]))
    .map((f) => readFileSync(f, "utf8"))
    .join("\n");
  check(
    "Batch E does not import branded-client report composer",
    !analyticsVisSrc.includes("lib/reporting/branded-client") &&
      !analyticsVisSrc.includes("branded-client"),
  );

  console.log("\nPhase 4 Batch E analytics visibility verification passed.\n");
}

main();
