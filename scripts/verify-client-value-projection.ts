/**
 * Client Value Projection — Batch 1 verifier (static + pure units).
 * No database. No live Google calls. No Production mutation.
 *
 * Run: npm run verify:client-value-projection
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import type { ReportingFact } from "../lib/reporting/domain/types";
import {
  CLIENT_VALUE_INFRA_ALLOWLIST,
  CLIENT_VALUE_INFRA_DENYLIST,
  composeCareContinuity,
  composeClientValueProjection,
  composePerformanceStory,
} from "../lib/portal/client-value";
import { composeWorkPerformanceModel } from "../lib/portal/work-performance";
import { defaultWorkPerformancePeriod } from "../lib/portal/work-performance/period";

const root = process.cwd();

function read(rel: string) {
  return readFileSync(path.join(root, rel), "utf8");
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
    evidenceRefs: partial.evidenceRefs ?? [],
    source: partial.source ?? {
      providerId: "google-analytics-4",
      clientId: partial.clientId ?? 42,
      fetchedAt: "2026-07-02T00:00:00.000Z",
      freshness: "fresh",
      confidence: "high",
    },
  };
}

function main() {
  console.log("\nClient Value Projection — Batch 1\n");

  const careSrc = read("lib/portal/client-value/care-continuity.ts");
  const storySrc = read("lib/portal/client-value/performance-story.ts");
  const serverSrc = read("lib/portal/client-value/server.ts");
  const composeWp = read("lib/portal/work-performance/compose.ts");
  const serverWp = read("lib/portal/work-performance/server.ts");
  const homeUi = read("components/ces/portal/CesClientCommandHome.tsx");

  check(
    "portal compose never imports Google provider SDKs",
    !storySrc.includes("@google-analytics") &&
      !storySrc.includes("googleapis") &&
      !careSrc.includes("googleapis") &&
      !composeWp.includes("googleapis"),
  );

  check(
    "work-performance server loads care + connection mapping flags",
    serverWp.includes("loadClientValueCareInput") &&
      serverWp.includes("ga4Mapped:") &&
      serverWp.includes("gscMapped:") &&
      serverWp.includes("Boolean(scopedConnection?.ga4PropertyId)"),
  );

  check(
    "care loader allowlists fields and never spreads infrastructure docs",
    serverSrc.includes("CLIENT_VALUE_INFRA_ALLOWLIST") &&
      serverSrc.includes("Explicit allowlist pick") &&
      !serverSrc.includes("...resolved"),
  );

  for (const denied of ["ga4PropertyId", "searchConsoleSiteUrl", "githubRepo", "password", "token"]) {
    check(
      `care composer does not project ${denied}`,
      !careSrc.includes(`hostingProvider: input.${denied}`) &&
        !careSrc.includes(`${denied}: input.`),
    );
  }

  check(
    "allowlist is non-empty and excludes GA4/GSC property IDs",
    CLIENT_VALUE_INFRA_ALLOWLIST.includes("hostingProvider") &&
      !(CLIENT_VALUE_INFRA_ALLOWLIST as readonly string[]).includes("ga4PropertyId") &&
      !(CLIENT_VALUE_INFRA_ALLOWLIST as readonly string[]).includes("searchConsoleSiteUrl"),
  );

  check(
    "CES home surfaces value story hierarchy labels",
    homeUi.includes("What moved forward") &&
      homeUi.includes("What it means") &&
      homeUi.includes("What KXD completed") &&
      homeUi.includes("Hosting &amp; domain care") &&
      homeUi.includes("What should happen next"),
  );

  check(
    "CES home shows watching only as care fallback",
    (homeUi.match(/\{story\.whatKxdIsWatching\}/g) ?? []).length === 1 &&
      homeUi.includes("showWatchingFallback"),
  );

  check(
    "no Don hardcoding in client-value modules",
    !careSrc.includes("otp-carts") &&
      !storySrc.includes("cusick") &&
      !careSrc.includes("Don") &&
      !storySrc.includes("2475-townsgate"),
  );

  // Isolation
  assert.throws(() =>
    composeClientValueProjection({
      authorizedClientId: 1,
      sourceClientId: 2,
      reportingFacts: [],
      reportingEntitled: false,
      reportingPeriod: defaultWorkPerformancePeriod(new Date("2026-07-15T12:00:00.000Z")),
      ga4Mapped: false,
      gscMapped: false,
      care: {},
    }),
  );
  check("cross-client composition throws", true);

  // Care continuity states
  const unknownCare = composeCareContinuity({});
  check(
    "empty infra → not-configured / unknown",
    unknownCare.status === "not-configured" && unknownCare.availability === "unknown",
  );
  check("empty infra emits no placeholder lines", unknownCare.lines.length === 0);
  check(
    "empty infra does not say renewal date unknown",
    !unknownCare.lead.toLowerCase().includes("unknown") &&
      !JSON.stringify(unknownCare.lines).toLowerCase().includes("unknown"),
  );

  const protectedCare = composeCareContinuity({
    hostingProvider: "KXD / Vercel",
    nextRenewalDate: "2027-06-01",
    domainExpirationDate: "2027-08-01",
    primaryDomain: "https://example.com",
    now: new Date("2026-07-15T12:00:00.000Z"),
  });
  check(
    "healthy dates → protected-and-active",
    protectedCare.status === "protected-and-active" &&
      protectedCare.headline === "Protected and active",
  );
  check(
    "care lines never include ga4PropertyId text",
    !JSON.stringify(protectedCare).includes("ga4PropertyId") &&
      !JSON.stringify(protectedCare).includes("properties/"),
  );

  const approachingCare = composeCareContinuity({
    hostingProvider: "KXD / Vercel",
    nextRenewalDate: "2026-08-20",
    domainExpirationDate: "2027-01-01",
    primaryDomain: "example.com",
    now: new Date("2026-07-15T12:00:00.000Z"),
  });
  check(
    "approaching renewal uses distinct calm headline",
    approachingCare.status === "monitoring" &&
      approachingCare.headline === "Renewal window ahead",
  );

  const unknownDatesCare = composeCareContinuity({
    hostingProvider: "KXD / Vercel",
    primaryDomain: "example.com",
    now: new Date("2026-07-15T12:00:00.000Z"),
  });
  check(
    "provider without dates → renewal-unknown without unknown spam lines",
    unknownDatesCare.status === "renewal-unknown" &&
      unknownDatesCare.lines.every((line) => !/unknown/i.test(line.value)) &&
      unknownDatesCare.responsiblePartyLabel == null,
  );

  const actionCare = composeCareContinuity({
    hostingProvider: "Wix",
    nextRenewalDate: "2026-07-20",
    domainExpirationDate: "2026-07-25",
    now: new Date("2026-07-15T12:00:00.000Z"),
  });
  check(
    "near renewal → action-needed or monitoring",
    actionCare.status === "action-needed" || actionCare.status === "monitoring",
  );

  const clientActionCare = composeCareContinuity({
    hostingProvider: "Wix",
    nextRenewalDate: "2026-07-20",
    domainExpirationDate: "2026-07-25",
    hostingAccess: false,
    now: new Date("2026-07-15T12:00:00.000Z"),
  });
  check(
    "client-held Wix near renewal → Action needed",
    clientActionCare.status === "action-needed" &&
      clientActionCare.headline === "Action needed" &&
      Boolean(clientActionCare.responsiblePartyLabel?.includes("confirmation")),
  );

  // Performance story honesty
  const period = defaultWorkPerformancePeriod(new Date("2026-07-15T12:00:00.000Z"));
  const disconnected = composePerformanceStory({
    reportingFacts: [],
    reportingEntitled: true,
    reportingPeriod: period,
    ga4Mapped: false,
    gscMapped: false,
  });
  check(
    "disconnected when entitled but unmapped",
    disconnected.availability === "disconnected" &&
      disconnected.whatMovedForward.toLowerCase().includes("not connected"),
  );

  const newTracking = composePerformanceStory({
    reportingFacts: [],
    reportingEntitled: true,
    reportingPeriod: period,
    ga4Mapped: true,
    gscMapped: false,
  });
  check(
    "mapped without facts → new-tracking (not zero wall)",
    newTracking.availability === "new-tracking" &&
      !newTracking.whatMovedForward.includes("1,842"),
  );

  const positive = composePerformanceStory({
    reportingFacts: [
      fact({
        metricKey: "sessions",
        value: 2000,
        previousValue: 1500,
        delta: 500,
        trend: "up",
      }),
      fact({
        metricKey: "clicks",
        value: 120,
        previousValue: 100,
        delta: 20,
        trend: "up",
      }),
    ],
    reportingEntitled: true,
    reportingPeriod: period,
    ga4Mapped: true,
    gscMapped: true,
  });
  check(
    "positive facts → positive tone without inventing CTR jargon walls",
    positive.tone === "positive" &&
      positive.availability === "ready" &&
      !positive.whatMovedForward.toLowerCase().includes("ctr") &&
      !positive.whatItMeans.toLowerCase().includes("average position"),
  );
  check(
    "watching list uses plain-language conjunction",
    positive.whatKxdIsWatching.includes(" and ") &&
      !positive.whatKxdIsWatching.includes("visibility, website visits for"),
  );

  const flat = composePerformanceStory({
    reportingFacts: [
      fact({
        metricKey: "sessions",
        value: 1000,
        previousValue: 1000,
        delta: 0,
        trend: "flat",
      }),
    ],
    reportingEntitled: true,
    reportingPeriod: period,
    ga4Mapped: true,
    gscMapped: true,
  });
  check(
    "flat data does not fabricate improvement",
    flat.tone === "steady" &&
      !flat.whatMovedForward.toLowerCase().includes("more people found"),
  );

  const down = composePerformanceStory({
    reportingFacts: [
      fact({
        metricKey: "sessions",
        value: 800,
        previousValue: 1200,
        delta: -400,
        trend: "down",
      }),
    ],
    reportingEntitled: true,
    reportingPeriod: period,
    ga4Mapped: true,
    gscMapped: true,
  });
  check(
    "down trend is honest caution without panic marketing",
    down.tone === "caution" &&
      down.strongestSignal == null &&
      down.whatItMeans.toLowerCase().includes("not a reason to panic"),
  );

  // Work performance integration + isolation
  const model = composeWorkPerformanceModel({
    authorizedClientId: 42,
    clientName: "Example Client",
    clientSlug: "example-client",
    sourceClientId: 42,
    reportingPeriod: period,
    comparisonPeriod: null,
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
    reportingFacts: [
      fact({ metricKey: "sessions", value: 100, previousValue: 80, delta: 20, trend: "up" }),
    ],
    reportingEntitled: true,
    nextMoveCandidates: [],
    ga4Mapped: true,
    gscMapped: true,
    careInput: {
      hostingProvider: "KXD / Vercel",
      nextRenewalDate: "2027-01-01",
      domainExpirationDate: "2027-02-01",
      primaryDomain: "example.com",
      now: new Date("2026-07-15T12:00:00.000Z"),
    },
  });
  check(
    "work performance model includes clientValue for matching client",
    model.clientValue?.clientId === 42 &&
      model.clientValue.careContinuity.headline === "Protected and active",
  );

  assert.throws(() =>
    composeWorkPerformanceModel({
      authorizedClientId: 1,
      clientName: "A",
      clientSlug: "a",
      sourceClientId: 99,
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
    }),
  );
  check("work performance still refuses cross-client composition", true);

  // Secret leakage scan of serialized projection
  const blob = JSON.stringify(model.clientValue).toLowerCase();
  for (const denied of [
    "ga4propertyid",
    "searchconsolesiteurl",
    "githubrepo",
    "vercelproject",
    "password",
    "token",
    "apikey",
    "estimatedrenewalamount",
  ]) {
    check(`serialized clientValue excludes ${denied}`, !blob.includes(denied));
  }

  console.log("\nClient Value Projection verification passed.\n");
}

main();
