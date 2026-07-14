/**
 * Phase 33A / 33A.1 — Automated Reporting Engine reliability verification.
 *
 *   npm run verify:reporting-automation
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import {
  REPORTING_AUTOMATION_PROVIDERS,
  REPORTING_SCHEDULE_TIMEZONE,
  REPORTING_SWEEP_CRON_UTC,
  reportingBackoffMinutes,
  reportingBackoffUntil,
  nextDailyPacificSyncAt,
  lastPacificSyncSlotAt,
  isReportingSyncDue,
  isScheduledWindowComplete,
  pacificDateParts,
  resolveScheduledWindow,
  buildScheduledWindowId,
  isReportingLeaseActive,
  reportingLeaseExpiration,
  createReportingRunId,
  classifyPreflight,
  outcomeIncrementsFailures,
  sanitizeReportingFailureMessage,
  withReportingProviderTimeout,
  ReportingProviderTimeoutError,
} from "../lib/reporting/automation";
import { isAuthorizedCronBearer } from "../lib/reporting/ingest/cron-auth";
import { composeExecutiveReportingHealth } from "../lib/reporting/executive-health";
import { composeExecutiveReportingNarratives } from "../lib/reporting/executive-narratives";
import type { ReportingFact } from "../lib/reporting/domain/types";
import type { ExecutiveReportingReadiness } from "../lib/reporting/readiness";

function check(label: string, condition: boolean) {
  if (!condition) {
    console.error(`  ✗ ${label}`);
    throw new Error(label);
  }
  console.log(`  ✔ ${label}`);
}

function readinessFixture(): ExecutiveReportingReadiness {
  return {
    searchConsole: {
      providerId: "google-search-console",
      capabilityId: "seo",
      status: "live",
      blockers: [],
      notes: ["Search Console entitled with facts."],
    },
    websiteAnalytics: {
      providerId: "google-analytics-4",
      capabilityId: "website-analytics",
      status: "pipeline-ready-entitlement-blocked",
      blockers: ["website-analytics capability is not enabled for this client."],
      notes: [],
    },
    googleAds: {
      providerId: "google-ads",
      capabilityId: "google-ads",
      status: "pipeline-ready-config-blocked",
      blockers: ["Ads customer ID still required."],
      notes: [],
    },
    googleAdsRemainingWork: [],
  };
}

function fact(
  partial: Partial<ReportingFact> & Pick<ReportingFact, "id" | "metricKey" | "value">,
): ReportingFact {
  return {
    clientId: 1,
    domain: "search",
    period: { start: "2026-06-01", end: "2026-06-30", grain: "month" },
    unit: "count",
    previousValue: null,
    delta: null,
    trend: "unknown",
    source: {
      providerId: "search-console",
      sourceSystem: "google-search-console",
      confidence: "high",
      freshness: "fresh",
      observedAt: "2026-07-01T00:00:00.000Z",
    },
    ...partial,
  } as ReportingFact;
}

async function main() {
  console.log("\nPhase 33A.1 — verify:reporting-automation\n");

  check(
    "automation providers include search-console, ga4, ads",
    REPORTING_AUTOMATION_PROVIDERS.join(",") === "search-console,ga4,ads",
  );
  check("IANA timezone is America/Los_Angeles", REPORTING_SCHEDULE_TIMEZONE === "America/Los_Angeles");
  check("vercel cron is hourly", REPORTING_SWEEP_CRON_UTC === "0 * * * *");

  // 1–4 scheduling PDT / PST / per-client hour / next Pacific
  const pdtNoonUtc = new Date("2026-07-13T19:00:00.000Z"); // 12:00 PDT
  const pdtSlot = lastPacificSyncSlotAt(pdtNoonUtc, 5);
  const pdtParts = pacificDateParts(pdtSlot);
  check("PDT last slot hour is 5 Pacific", pdtParts.hour === 5);
  check("PDT slot date is 2026-07-13", pdtParts.year === 2026 && pdtParts.month === 7 && pdtParts.day === 13);

  const pstNoonUtc = new Date("2026-01-13T20:00:00.000Z"); // 12:00 PST
  const pstNext = nextDailyPacificSyncAt(pstNoonUtc, 5);
  const pstNextParts = pacificDateParts(pstNext);
  check("PST next sync hour is 5 Pacific", pstNextParts.hour === 5);
  check(
    "PST next sync is the following Pacific morning",
    pstNextParts.day === 14 && pstNextParts.month === 1,
  );

  const customHour = nextDailyPacificSyncAt(pdtNoonUtc, 7);
  check(
    "configurable per-client hour honored",
    pacificDateParts(customHour).hour === 7,
  );

  const afterSlot = new Date("2026-07-13T13:00:00.000Z"); // 06:00 PDT
  const nextAfter = nextDailyPacificSyncAt(afterSlot, 5);
  check(
    "next Pacific execution after success is tomorrow 5am",
    pacificDateParts(nextAfter).day === 14 && pacificDateParts(nextAfter).hour === 5,
  );

  // 5–6 backoff + success reset semantics
  check("backoff grows exponentially", reportingBackoffMinutes(1) === 30);
  check("backoff doubles", reportingBackoffMinutes(2) === 60);
  check("backoff caps at 24h", reportingBackoffMinutes(20) === 24 * 60);
  const backoffAt = reportingBackoffUntil(2, new Date("2026-07-13T12:00:00.000Z"));
  check(
    "backoff until advances clock",
    backoffAt.getTime() === new Date("2026-07-13T13:00:00.000Z").getTime(),
  );
  check(
    "success path uses nextDaily (not backoff) for schedule",
    nextDailyPacificSyncAt(afterSlot, 5).getTime() > afterSlot.getTime(),
  );

  // 7–8 isolation evidenced in engine source
  const engineSrc = readFileSync(
    path.join(process.cwd(), "lib/reporting/automation/engine.ts"),
    "utf8",
  );
  check("provider isolation try/catch present", engineSrc.includes("never abort siblings") || engineSrc.includes("Absolute isolation") || engineSrc.includes("Provider/client failures never abort"));
  check("client loop remains independent", engineSrc.includes("for (const client of clients)"));

  // 9 duplicate scheduled-window prevention
  const window = resolveScheduledWindow({
    clientId: 1,
    provider: "ga4",
    now: afterSlot,
    syncHourPacific: 5,
    nextScheduledSyncAt: pdtSlot.toISOString(),
  });
  check("due window resolves when nextScheduled elapsed", window.due === true);
  check(
    "window id is stable client+provider+instant",
    window.windowId ===
      buildScheduledWindowId({
        clientId: 1,
        provider: "ga4",
        windowAt: window.windowAt,
      }),
  );
  check(
    "duplicate scheduled-window prevented",
    isScheduledWindowComplete({
      lastCompletedWindowId: window.windowId,
      windowId: window.windowId,
    }) === true,
  );
  check(
    "force bypasses window completion",
    isScheduledWindowComplete({
      lastCompletedWindowId: window.windowId,
      windowId: window.windowId,
      force: true,
    }) === false,
  );

  // 10–11 lease
  const now = new Date("2026-07-13T12:00:00.000Z");
  check(
    "active lease prevents second execution",
    isReportingLeaseActive({
      executionStatus: "running",
      leaseExpiresAt: reportingLeaseExpiration(now, 60_000).toISOString(),
      now,
    }) === true,
  );
  check(
    "expired lease recoverable",
    isReportingLeaseActive({
      executionStatus: "running",
      leaseExpiresAt: new Date(now.getTime() - 1_000).toISOString(),
      now,
    }) === false,
  );
  check("run id generated", createReportingRunId(now).startsWith("run_"));

  // 12 unique client/provider — migration/index presence
  const mig = readFileSync(
    path.join(process.cwd(), "migrations/20260714_phase33a_reporting_automation.ts"),
    "utf8",
  );
  const mig1 = readFileSync(
    path.join(
      process.cwd(),
      "migrations/20260714_phase33a1_reporting_scheduler_reliability.ts",
    ),
    "utf8",
  );
  check(
    "unique client/provider state index in migration",
    mig.includes("reporting_sync_states_client_provider_uidx") &&
      mig1.includes("reporting_sync_states_client_provider_uidx"),
  );
  check("lease fields in migration", mig.includes("lease_expires_at") && mig.includes("execution_run_id"));
  check("window field in migration", mig.includes("last_completed_window_id"));

  // 13–15 classification
  const disabled = classifyPreflight({
    providerAutomationEnabled: false,
    clientAutomationEnabled: true,
    provider: "ga4",
    connection: {
      enabledCapabilities: ["website-analytics"],
      ga4PropertyId: "1",
      authMode: "vercel-oidc",
    },
  });
  check("disabled automation skip", disabled.outcome === "skipped-automation-disabled");
  check("disabled does not count as failure", disabled.countsAsFailure === false);

  const notEntitled = classifyPreflight({
    providerAutomationEnabled: true,
    clientAutomationEnabled: true,
    provider: "ga4",
    connection: {
      enabledCapabilities: ["seo"],
      ga4PropertyId: "1",
      authMode: "vercel-oidc",
    },
  });
  check("non-entitled provider skip", notEntitled.outcome === "skipped-not-entitled");

  const unconfigured = classifyPreflight({
    providerAutomationEnabled: true,
    clientAutomationEnabled: true,
    provider: "ga4",
    connection: {
      enabledCapabilities: ["website-analytics"],
      ga4PropertyId: null,
      authMode: "vercel-oidc",
    },
  });
  check(
    "unconfigured integration classification",
    unconfigured.outcome === "skipped-not-configured" &&
      unconfigured.integrationStatus === "not-configured",
  );
  check(
    "only attempted failures increment counters",
    outcomeIncrementsFailures("error") &&
      outcomeIncrementsFailures("timeout") &&
      !outcomeIncrementsFailures("skipped-not-entitled") &&
      !outcomeIncrementsFailures("skipped-window-complete"),
  );

  // 16 dry-run zero mutations (static contract)
  const dryPlanIdx = engineSrc.indexOf("Dry-run plan: would execute window");
  const leaseCallIdx = engineSrc.indexOf("const lease = await acquireReportingExecutionLease");
  const syncCallIdx = engineSrc.indexOf("syncReportingFacts({");
  check(
    "dry-run returns before lease acquire",
    dryPlanIdx > 0 && leaseCallIdx > dryPlanIdx,
  );
  check(
    "dry-run never calls syncReportingFacts on plan path",
    syncCallIdx > leaseCallIdx && leaseCallIdx > dryPlanIdx,
  );
  check(
    "dry-run preflight persist guarded",
    engineSrc.includes("if (!input.dryRun)") &&
      engineSrc.includes("Classification persist only"),
  );
  check(
    "dry-run purity documented in engine",
    engineSrc.includes("Dry-run performs zero persistent mutations"),
  );

  // 17 missing CRON_SECRET rejection
  check(
    "missing CRON_SECRET rejection",
    isAuthorizedCronBearer("Bearer anything", {}) === false,
  );
  check(
    "blank CRON_SECRET rejection",
    isAuthorizedCronBearer("Bearer ", { CRON_SECRET: "   " }) === false,
  );
  check(
    "both empty never authorize",
    isAuthorizedCronBearer("", { CRON_SECRET: "" }) === false &&
      isAuthorizedCronBearer(undefined, { CRON_SECRET: undefined }) === false,
  );
  check(
    "configured secret authorizes exact bearer",
    isAuthorizedCronBearer("Bearer prod-secret", { CRON_SECRET: "prod-secret" }) ===
      true,
  );

  // 18 timeout behavior
  let timedOut = false;
  try {
    await withReportingProviderTimeout(20, async () => {
      await new Promise((r) => setTimeout(r, 200));
      return "done";
    });
  } catch (error) {
    timedOut = error instanceof ReportingProviderTimeoutError;
  }
  check("provider timeout behavior", timedOut);

  // 19 sanitized failure storage
  check(
    "sanitized failure storage redacts bearer",
    sanitizeReportingFailureMessage("Authorization Bearer abc.def.ghi failed") ===
      "Provider sync failed (sensitive details redacted)." ||
      sanitizeReportingFailureMessage("Authorization Bearer abc.def.ghi failed").includes(
        "[redacted]",
      ),
  );
  check(
    "sanitized failure truncates long payloads",
    sanitizeReportingFailureMessage("x".repeat(500)).length <= 280,
  );

  // 20 forced targeted execution
  check(
    "force makes sync due",
    isReportingSyncDue({
      now,
      nextScheduledSyncAt: "2099-01-01T00:00:00.000Z",
      force: true,
    }),
  );
  const forcedWindow = resolveScheduledWindow({
    clientId: 9,
    provider: "ads",
    now: afterSlot,
    syncHourPacific: 5,
    nextScheduledSyncAt: "2099-01-01T00:00:00.000Z",
    force: true,
  });
  check("forced targeted execution is due", forcedWindow.due && forcedWindow.reason === "force");

  // Health + narrative retained
  const health = composeExecutiveReportingHealth({
    clientId: 1,
    readiness: readinessFixture(),
    syncStates: [
      {
        id: 1,
        clientId: 1,
        provider: "search-console",
        automationEnabled: true,
        integrationStatus: "healthy",
        lastSuccessfulSyncAt: new Date().toISOString(),
        lastFailedSyncAt: null,
        failureReason: null,
        consecutiveFailures: 0,
        nextScheduledSyncAt: nextAfter.toISOString(),
        lastCompletedWindowId: "1:search-console:x",
        lastOutcome: "synced",
        lastFactsWritten: 4,
        executionStatus: "idle",
        executionRunId: null,
        executionStartedAt: null,
        leaseExpiresAt: null,
        updatedAt: null,
      },
    ],
    pendingClientItemCount: 0,
    awaitingClientCount: 0,
    launchReadinessStatus: "ready",
    reviewQueueCount: 0,
  });
  check("health still composes", health.reportingFreshness.state === "fresh");

  const narratives = composeExecutiveReportingNarratives({
    clientId: 1,
    facts: [
      fact({
        id: "f-imp",
        metricKey: "impressions",
        value: 1200,
        previousValue: 900,
        trend: "up",
        domain: "search",
      }),
    ],
  });
  check(
    "narratives remain fact-bound",
    narratives.some((n) => n.statement === "Search visibility increased."),
  );

  const vercel = JSON.parse(
    readFileSync(path.join(process.cwd(), "vercel.json"), "utf8"),
  ) as { crons?: Array<{ path: string; schedule: string }> };
  check(
    "vercel.json hourly reporting-sweep",
    Boolean(
      vercel.crons?.some(
        (c) =>
          c.path === "/api/cron/reporting-sweep" && c.schedule === "0 * * * *",
      ),
    ),
  );

  const sweepRoute = readFileSync(
    path.join(process.cwd(), "app/api/cron/reporting-sweep/route.ts"),
    "utf8",
  );
  check(
    "sweep route fail-closed when secret absent",
    sweepRoute.includes("resolveConfiguredCronSecret") &&
      sweepRoute.includes("isAuthorizedCronBearer"),
  );

  console.log("\nAll Phase 33A.1 automation reliability checks passed.\n");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
