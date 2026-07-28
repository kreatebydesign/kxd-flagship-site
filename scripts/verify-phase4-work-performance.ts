/**
 * Phase 4 Batch D — Work & Performance workspace.
 * Static + pure-unit verification only. No database. No external writes.
 *
 * Run: npm run verify:phase4-work-performance
 */
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import path from "node:path";
import type { ReportingFact } from "../lib/reporting/domain/types";
import {
  authorizedFixtureClientIds,
  composeAuthorizedMultiSiteOverview,
  composeWorkPerformanceModel,
  deriveVerifiedWins,
  FUTURE_ACCESS_MATRIX,
  isSlugAuthorizedForPersona,
  type WorkPerformanceModel,
} from "../lib/portal/work-performance";
import {
  comparisonPeriodFor,
  defaultWorkPerformancePeriod,
  isIsoDateInPeriod,
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

function fact(partial: Partial<ReportingFact> & Pick<ReportingFact, "metricKey" | "value">): ReportingFact {
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

function emptyModel(clientId: number, name: string, slug: string | null): WorkPerformanceModel {
  const period = defaultWorkPerformancePeriod(new Date("2026-07-15T12:00:00.000Z"));
  return composeWorkPerformanceModel({
    authorizedClientId: clientId,
    clientName: name,
    clientSlug: slug,
    sourceClientId: clientId,
    reportingPeriod: period,
    comparisonPeriod: comparisonPeriodFor(period),
    completedItems: [],
    activeItems: [],
    updateRequests: {
      entitled: true,
      openCount: 0,
      awaitingClientCount: 0,
      inProgressCount: 0,
      completedThisMonthCount: 0,
      priority: [],
      primaryActionHref: "/portal/website-review",
    },
    reportingFacts: [],
    reportingEntitled: false,
    nextMoveCandidates: [],
  });
}

function main() {
  console.log("\nPhase 4 Batch D — work & performance workspace\n");

  const period = defaultWorkPerformancePeriod(new Date("2026-07-15T12:00:00.000Z"));
  check("default period is previous UTC month", period.start.startsWith("2026-06"));
  check(
    "iso date in period works",
    isIsoDateInPeriod("2026-06-10", period) && !isIsoDateInPeriod("2026-07-01", period),
  );

  // Isolation: mismatch throws
  let mismatch = false;
  try {
    composeWorkPerformanceModel({
      authorizedClientId: 1,
      clientName: "A",
      clientSlug: "a",
      sourceClientId: 2,
      reportingPeriod: period,
      comparisonPeriod: null,
      completedItems: [],
      activeItems: [],
      updateRequests: {
        entitled: false,
        openCount: 0,
        awaitingClientCount: 0,
        inProgressCount: 0,
        completedThisMonthCount: 0,
        priority: [],
      },
      reportingFacts: [],
      reportingEntitled: false,
      nextMoveCandidates: [],
    });
  } catch {
    mismatch = true;
  }
  check("client mismatch fails closed", mismatch);

  // Empty / unavailable honesty
  const empty = emptyModel(42, "Acme", "acme");
  check("empty completed is calm empty, not error", empty.completedThisMonth.length === 0);
  check(
    "unenitled analytics is not-entitled (not zero)",
    empty.analytics.availability === "not-entitled",
  );
  check("sales pipeline never available on portal model", empty.leads.salesPipelineAvailable === false);

  // Wins require meaningful verified deltas
  const weak = deriveVerifiedWins([
    fact({ metricKey: "sessions", value: 101, previousValue: 100, delta: 1 }),
  ]);
  check("tiny variance is not a win", weak.length === 0);

  const strong = deriveVerifiedWins([
    fact({
      metricKey: "sessions",
      value: 200,
      previousValue: 100,
      delta: 100,
      trend: "up",
    }),
  ]);
  check("meaningful improvement becomes a verified win", strong.length === 1);

  // Completed month filter
  const withWork = composeWorkPerformanceModel({
    authorizedClientId: 7,
    clientName: "Demo",
    clientSlug: "demo",
    sourceClientId: 7,
    reportingPeriod: period,
    comparisonPeriod: comparisonPeriodFor(period),
    completedItems: [
      {
        id: "d1",
        title: "June deliverable",
        completedAt: "2026-06-12T00:00:00.000Z",
        updatedAt: "2026-06-12T00:00:00.000Z",
        categoryLabel: null,
        href: "/portal/deliverables",
        source: "deliverable",
      },
      {
        id: "d2",
        title: "July deliverable",
        completedAt: "2026-07-02T00:00:00.000Z",
        updatedAt: "2026-07-02T00:00:00.000Z",
        categoryLabel: null,
        href: "/portal/deliverables",
        source: "deliverable",
      },
    ],
    activeItems: [
      {
        id: "a1",
        title: "Open revision",
        statusLabel: "Waiting on you",
        owner: "client",
        updatedAt: "2026-07-01T00:00:00.000Z",
        href: "/portal/website-review",
        source: "website-review",
      },
    ],
    updateRequests: {
      entitled: true,
      openCount: 1,
      awaitingClientCount: 1,
      inProgressCount: 0,
      completedThisMonthCount: 0,
      priority: [],
      primaryActionHref: "/portal/website-review",
    },
    reportingFacts: [
      fact({
        clientId: 7,
        metricKey: "conversions",
        value: 4,
        previousValue: 2,
        delta: 2,
      }),
    ],
    reportingEntitled: true,
    nextMoveCandidates: [
      {
        id: "m1",
        title: "Respond",
        lead: "Reply",
        href: "/portal/website-review",
      },
      {
        id: "bad",
        title: "Admin",
        lead: "Nope",
        href: "/admin/operations",
      },
    ],
  });
  check("only reporting-month completions counted", withWork.completedThisMonth.length === 1);
  check("awaiting client reflected in value summary", withWork.valueSummary.awaitingClientCount === 1);
  check("conversions labeled as tracked events", withWork.leads.conversionLabel.includes("Tracked"));
  check("unsafe next-move href excluded", !withWork.nextMoves.some((m) => m.href?.includes("/admin")));
  check("safe next-move retained", withWork.nextMoves.some((m) => m.href === "/portal/website-review"));

  // Future access matrix fixtures
  check(
    "Billy is single-site Cusick Morgan Motorsports",
    FUTURE_ACCESS_MATRIX.billy.authorizedSlugs.length === 1 &&
      FUTURE_ACCESS_MATRIX.billy.authorizedSlugs[0] === "cusick-morgan-motorsports" &&
      !FUTURE_ACCESS_MATRIX.billy.expectsSwitcher,
  );
  check(
    "Nicole is OTP + OTP Carts",
    FUTURE_ACCESS_MATRIX.nicole.authorizedSlugs.join(",") === "otp,otp-carts" &&
      FUTURE_ACCESS_MATRIX.nicole.expectsMultiSiteOverview,
  );
  check(
    "Don includes Cusick + OTP + OTP Carts + Townsgate",
    FUTURE_ACCESS_MATRIX.don.authorizedSlugs.length === 4 &&
      isSlugAuthorizedForPersona("don", "cusick-morgan-motorsports") &&
      isSlugAuthorizedForPersona("don", "2475-townsgate") &&
      !isSlugAuthorizedForPersona("nicole", "cusick-morgan-motorsports") &&
      !isSlugAuthorizedForPersona("billy", "otp"),
  );

  // Multi-site overview isolation
  const billyIds = authorizedFixtureClientIds("billy");
  const nicoleIds = authorizedFixtureClientIds("nicole");
  const donIds = authorizedFixtureClientIds("don");

  const billyOverview = composeAuthorizedMultiSiteOverview({
    authorizedClientIds: billyIds,
    siteModels: [emptyModel(billyIds[0]!, "Cusick Morgan Motorsports", "cusick-morgan-motorsports")],
    switchingAvailable: false,
  });
  check("Billy has no multi-site overview", billyOverview.available === false);

  const nicoleModels = nicoleIds.map((id, i) =>
    emptyModel(id, i === 0 ? "OTP" : "OTP Carts", i === 0 ? "otp" : "otp-carts"),
  );
  const nicoleOverview = composeAuthorizedMultiSiteOverview({
    authorizedClientIds: nicoleIds,
    siteModels: nicoleModels,
    switchingAvailable: true,
  });
  check("Nicole multi-site overview ready with 2 sites", nicoleOverview.available && nicoleOverview.sites.length === 2);

  let forgedRejected = false;
  try {
    composeAuthorizedMultiSiteOverview({
      authorizedClientIds: nicoleIds,
      siteModels: [
        ...nicoleModels,
        emptyModel(donIds[0]!, "Cusick Morgan Motorsports", "cusick-morgan-motorsports"),
      ],
      switchingAvailable: true,
    });
  } catch {
    forgedRejected = true;
  }
  check("forged unauthorized site model rejected", forgedRejected);

  const donOverview = composeAuthorizedMultiSiteOverview({
    authorizedClientIds: donIds,
    siteModels: donIds.map((id, i) =>
      emptyModel(
        id,
        ["Cusick Morgan Motorsports", "OTP", "OTP Carts", "2475 Townsgate"][i]!,
        FUTURE_ACCESS_MATRIX.don.authorizedSlugs[i]!,
      ),
    ),
    switchingAvailable: true,
  });
  check("Don overview includes exactly four authorized sites", donOverview.sites.length === 4);
  check(
    "Don totals siteCount is 4",
    donOverview.totals?.siteCount === 4,
  );

  // Portfolio product remains disabled
  check(
    "portfolio product access remains unavailable",
    resolvePortfolioAccess({
      switchingAvailable: true,
      authorizedClientIds: donIds,
      portfolioAccessAvailable: false,
    }).available === false,
  );

  // Static wiring
  const portalPage = read("app/(portal)/portal/(app)/page.tsx");
  check(
    "portal home resolves work performance from session",
    portalPage.includes("resolvePortalWorkPerformance") && portalPage.includes("session"),
  );
  check(
    "portal home remains force-dynamic",
    portalPage.includes('dynamic = "force-dynamic"'),
  );

  const serverEntry = read("lib/portal/work-performance/server.ts");
  check(
    "server work-performance entry is server-only",
    serverEntry.includes('import "server-only"') && serverEntry.includes("session.clientId"),
  );

  // No migration / no production IDs / no DB in pure modules
  const pureDir = path.join(root, "lib/portal/work-performance");
  for (const rel of walkFiles(pureDir, new Set([".ts"])).map((f) => path.relative(root, f))) {
    if (rel.endsWith("server.ts")) continue;
    const src = read(rel);
    check(
      `${rel} does not connect to database`,
      !src.includes("getPayload") && !src.includes("DATABASE_URL"),
    );
  }

  check(
    "no migration registration for Batch D",
    !read("migrations/index.ts").includes("work-performance") &&
      !existsSync(path.join(root, "migrations/20260728_phase4_work_performance.ts")),
  );

  check(
    "fixtures do not hard-code production emails as auth",
    !read("lib/portal/work-performance/fixtures.ts").includes("@") &&
      !read("lib/portal/work-performance/fixtures.ts").includes("billy@"),
  );

  // package.json script
  check(
    "package.json registers Batch D verifier",
    read("package.json").includes("verify:phase4-work-performance"),
  );

  console.log("\nBatch D work & performance verification passed.\n");
}

main();
