/**
 * Phase 33B / 33B.1 — Reporting Operations integrity verification.
 *
 *   npm run verify:reporting-operations
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { ReportingProviderSyncState } from "../lib/reporting/automation/types";
import {
  buildReportingOpsCapacityView,
  buildReportingOpsPlatformSummary,
  buildReportingOpsRow,
  deriveReportingOperationalStatus,
  extractLastSweepCapacity,
  filterReportingOpsRows,
  formatReportingSyncHourPacificLabel,
  freshnessFromLastSuccess,
  isReportingRetryEligible,
  isValidReportingOpsProvider,
  mapAutomationSweepToHistory,
  mapReportingActivityToHistory,
  operationalStatusLabel,
  parseReportingOpsActionBody,
  parseReportingOpsFilter,
  parseStrictReportingSyncHourPacific,
  resolveReportingSweepCapacityLimits,
} from "../lib/reporting/operations";
import { sanitizeReportingFailureMessage } from "../lib/reporting/automation/sanitize";
import { REPORTING_FRESHNESS_FRESH_HOURS } from "../lib/reporting/automation/constants";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function check(label: string, condition: boolean) {
  if (!condition) {
    console.error(`  ✗ ${label}`);
    throw new Error(label);
  }
  console.log(`  ✔ ${label}`);
}

function state(
  partial: Partial<ReportingProviderSyncState> &
    Pick<ReportingProviderSyncState, "provider" | "clientId">,
): ReportingProviderSyncState {
  return {
    id: 1,
    automationEnabled: true,
    integrationStatus: "healthy",
    lastSuccessfulSyncAt: "2026-07-14T05:00:00.000Z",
    lastFailedSyncAt: null,
    failureReason: null,
    consecutiveFailures: 0,
    nextScheduledSyncAt: "2026-07-15T12:00:00.000Z",
    lastCompletedWindowId: "1:search-console:2026-07-13T12:00:00.000Z",
    lastOutcome: "synced",
    lastFactsWritten: 4,
    executionStatus: "idle",
    executionRunId: null,
    executionStartedAt: null,
    leaseExpiresAt: null,
    updatedAt: "2026-07-14T05:01:00.000Z",
    ...partial,
  };
}

function main() {
  console.log("\nPhase 33B.1 — verify:reporting-operations\n");

  const now = new Date("2026-07-14T10:00:00.000Z");
  const root = path.resolve(__dirname, "..");

  check(
    "healthy when entitled automation is healthy and not due",
    deriveReportingOperationalStatus({
      state: state({
        clientId: 1,
        provider: "search-console",
        integrationStatus: "healthy",
        nextScheduledSyncAt: "2026-07-15T12:00:00.000Z",
      }),
      clientAutomationEnabled: true,
      now,
    }) === "healthy",
  );

  check(
    "status labels are operationally precise",
    operationalStatusLabel("failing") === "Failed" &&
      operationalStatusLabel("disabled") === "Automation disabled" &&
      operationalStatusLabel("deferred-backoff") === "Deferred by backoff",
  );

  check(
    "due / deferred / stale-lease / running map correctly",
    deriveReportingOperationalStatus({
      state: state({
        clientId: 1,
        provider: "search-console",
        nextScheduledSyncAt: "2026-07-14T09:00:00.000Z",
      }),
      clientAutomationEnabled: true,
      now,
    }) === "due" &&
      deriveReportingOperationalStatus({
        state: state({
          clientId: 1,
          provider: "ga4",
          integrationStatus: "temporarily-failing",
          consecutiveFailures: 2,
          lastOutcome: "timeout",
          nextScheduledSyncAt: "2026-07-14T18:00:00.000Z",
        }),
        clientAutomationEnabled: true,
        now,
      }) === "deferred-backoff" &&
      deriveReportingOperationalStatus({
        state: state({
          clientId: 1,
          provider: "ads",
          executionStatus: "running",
          leaseExpiresAt: "2026-07-14T09:00:00.000Z",
        }),
        clientAutomationEnabled: true,
        now,
      }) === "stale-lease",
  );

  check(
    "freshness preserves unknown/missing (not coerced to healthy/zero)",
    freshnessFromLastSuccess(null, now) === "missing" &&
      freshnessFromLastSuccess("not-a-date", now) === "unknown" &&
      freshnessFromLastSuccess(now.toISOString(), now) === "fresh",
  );

  check(
    "freshness aging uses Shared Core hours",
    freshnessFromLastSuccess(
      new Date(
        now.getTime() - (REPORTING_FRESHNESS_FRESH_HOURS + 1) * 3_600_000,
      ).toISOString(),
      now,
    ) === "aging",
  );

  // Sync hour strict validation
  check(
    "invalid sync hour rejected rather than clamped",
    !parseStrictReportingSyncHourPacific(24).ok &&
      !parseStrictReportingSyncHourPacific(-1).ok &&
      !parseStrictReportingSyncHourPacific(5.5).ok &&
      !parseStrictReportingSyncHourPacific("5.5").ok &&
      !parseStrictReportingSyncHourPacific("abc").ok &&
      !parseStrictReportingSyncHourPacific(null).ok,
  );
  check(
    "strict integer sync hour accepted",
    parseStrictReportingSyncHourPacific(5).ok === true &&
      parseStrictReportingSyncHourPacific("0").ok === true &&
      parseStrictReportingSyncHourPacific("23").ok === true,
  );
  check(
    "sync hour label is plain language Pacific",
    formatReportingSyncHourPacificLabel(5) === "5:00 AM Pacific" &&
      formatReportingSyncHourPacificLabel(17) === "5:00 PM Pacific",
  );

  // Retry eligibility
  check(
    "retry unavailable for non-failure classifications",
    !isReportingRetryEligible({
      consecutiveFailures: 0,
      lastOutcome: "synced",
      integrationStatus: "healthy",
    }) &&
      !isReportingRetryEligible({
        consecutiveFailures: 1,
        lastOutcome: "skipped-not-configured",
        integrationStatus: "not-configured",
      }) &&
      !isReportingRetryEligible({
        consecutiveFailures: 2,
        lastOutcome: "skipped-not-entitled",
        integrationStatus: "not-entitled",
      }) &&
      isReportingRetryEligible({
        consecutiveFailures: 2,
        lastOutcome: "timeout",
        integrationStatus: "temporarily-failing",
      }),
  );

  // Platform sweep ownership
  const platformSweep = mapAutomationSweepToHistory({
    id: 501,
    eventName: "reporting.sweep.completed",
    module: "Infrastructure",
    client: undefined,
    createdAt: "2026-07-14T05:01:00.000Z",
    payload: {
      scope: "platform",
      truncated: true,
      clientsSkippedCapacity: 3,
      triggerType: "automation-sweep",
      title: "Reporting sweep completed (truncated)",
      ok: false,
    },
  });
  check(
    "platform event not assigned to an arbitrary client",
    platformSweep != null &&
      platformSweep.scope === "platform" &&
      platformSweep.clientId == null,
  );

  const rejectedAnchoredSweep = mapAutomationSweepToHistory({
    id: 502,
    eventName: "reporting.sweep.completed",
    client: { id: 1, name: "Primal Motorsports" },
    payload: { scope: "platform", truncated: false },
  });
  check(
    "sweep rows with client relationship are rejected as platform history",
    rejectedAnchoredSweep == null,
  );

  const clientEvent = mapReportingActivityToHistory({
    id: 88,
    eventType: "reporting.sync.succeeded",
    title: "Search Console reporting synced",
    summary: "Reporting facts persisted.",
    occurredAt: "2026-07-14T05:34:00.000Z",
    client: { id: 1, name: "Primal Motorsports", slug: "primal-motorsports" },
    metadata: {
      provider: "search-console",
      outcome: "synced",
      factsWritten: 4,
      ok: true,
    },
  });
  check(
    "client events retain correct client ownership",
    clientEvent != null &&
      clientEvent.scope === "client" &&
      clientEvent.clientId === 1 &&
      clientEvent.clientSlug === "primal-motorsports",
  );

  const orphanClientEvent = mapReportingActivityToHistory({
    id: 89,
    eventType: "reporting.sync.failed",
    title: "GA4 reporting sync failed",
    client: null,
    metadata: { provider: "ga4", outcome: "error", ok: false },
  });
  check("client sync events without client are rejected", orphanClientEvent == null);

  const capacity = extractLastSweepCapacity([
    clientEvent!,
    platformSweep!,
  ]);
  check(
    "capacity/truncation taken from platform-scoped sweep only",
    capacity.truncated === true && capacity.clientsSkippedCapacity === 3,
  );

  // Multi-client rows + filters + summary
  const rowA = buildReportingOpsRow({
    clientId: 1,
    clientSlug: "primal-motorsports",
    clientName: "Primal Motorsports",
    clientStatus: "active",
    clientAutomationEnabled: true,
    syncHourPacific: 5,
    state: state({ clientId: 1, provider: "search-console" }),
    entitled: true,
    factsCount: 4,
    now,
  });
  const rowB = buildReportingOpsRow({
    clientId: 2,
    clientSlug: "acme-demo",
    clientName: "Acme Demo",
    clientStatus: "active",
    clientAutomationEnabled: true,
    syncHourPacific: 6,
    state: state({
      clientId: 2,
      provider: "ga4",
      integrationStatus: "not-entitled",
      lastSuccessfulSyncAt: null,
      nextScheduledSyncAt: null,
      lastOutcome: "skipped-not-entitled",
    }),
    entitled: false,
    factsCount: 0,
    now,
  });
  const rowC = buildReportingOpsRow({
    clientId: 2,
    clientSlug: "acme-demo",
    clientName: "Acme Demo",
    clientStatus: "inactive",
    clientAutomationEnabled: true,
    syncHourPacific: 6,
    state: state({
      clientId: 2,
      provider: "search-console",
      integrationStatus: "temporarily-failing",
      consecutiveFailures: 3,
      lastOutcome: "error",
      failureReason: "Provider sync failed Bearer SECRET_TOKEN_VALUE",
      nextScheduledSyncAt: "2026-07-14T09:00:00.000Z",
      lastSuccessfulSyncAt: null,
    }),
    entitled: true,
    factsCount: 0,
    now,
  });

  check(
    "failure reason sanitized on row",
    rowC.failureReason != null &&
      !rowC.failureReason.includes("SECRET_TOKEN_VALUE"),
  );
  check(
    "Shared Core behavior across multiple fixture clients",
    rowA.clientId !== rowB.clientId &&
      filterReportingOpsRows([rowA, rowB, rowC], { clientSlug: "acme-demo" })
        .length === 2,
  );
  check(
    "invalid provider/filter rejected to safe defaults",
    parseReportingOpsFilter("drop-table") === "all" &&
      !isValidReportingOpsProvider("calendar"),
  );

  const summary = buildReportingOpsPlatformSummary({
    rows: [rowA, rowB, rowC],
    history: [clientEvent!, platformSweep!],
    capacity: buildReportingOpsCapacityView({
      eligibleClients: 2,
      eligibleProviderSlots: 4,
      lastSweepTruncated: platformSweep!.sweepTruncated,
      lastSweepFinishedAt: platformSweep!.timestamp,
      lastSweepClientsSkippedCapacity: platformSweep!.sweepClientsSkippedCapacity,
    }),
    now,
  });
  check("platform summary counts across fixture clients", summary.activeClientsEvaluated === 2);
  check(
    "unknown capacity not invented as healthy zeros incorrectly",
    resolveReportingSweepCapacityLimits({ maxClients: "25" }).maxClients === 25 &&
      buildReportingOpsCapacityView({
        eligibleClients: 0,
        eligibleProviderSlots: 0,
        lastSweepTruncated: null,
      }).lastSweepTruncated === null,
  );

  // Action parse + confirm body
  check(
    "rejects invalid provider/client in action body",
    "error" in parseReportingOpsActionBody({
      action: "force-sync",
      clientId: 1,
      provider: "calendar",
    }),
  );
  check(
    "accepts digit-string sync hour for later strict validation",
    !("error" in parseReportingOpsActionBody({
      action: "set-sync-hour",
      clientId: 1,
      syncHourPacific: "5",
      confirm: true,
    })),
  );

  // Source architecture checks
  const activitySrc = readFileSync(
    path.join(root, "lib/reporting/automation/activity.ts"),
    "utf8",
  );
  check(
    "platform sweep uses automation-events without client anchor",
    activitySrc.includes("createAutomationEvent") &&
      activitySrc.includes('eventName: "reporting.sweep.completed"') &&
      activitySrc.includes("omit clientId") &&
      !activitySrc.includes("anchorClientId"),
  );
  check(
    "client sync activity still requires real clientId",
    activitySrc.includes("clientId: input.clientId"),
  );

  const actionsSrc = readFileSync(
    path.join(root, "lib/reporting/operations/actions.ts"),
    "utf8",
  );
  check(
    "force sync uses automation sweep lease path",
    actionsSrc.includes("runReportingAutomationSweep") &&
      actionsSrc.includes("force: true"),
  );
  check(
    "atomic expired-lease clearing used",
    actionsSrc.includes("clearExpiredReportingExecutionLease"),
  );
  check(
    "retry uses failure eligibility helper",
    actionsSrc.includes("isReportingRetryEligible"),
  );
  check(
    "strict sync hour validation used (no silent clamp on set)",
    actionsSrc.includes("parseStrictReportingSyncHourPacific") &&
      !actionsSrc.includes("clampReportingSyncHourPacific(request.syncHourPacific)"),
  );
  check(
    "no bulk live-sync action",
    !actionsSrc.includes("run-all") && !actionsSrc.includes("bulk-sync"),
  );

  const syncStateSrc = readFileSync(
    path.join(root, "lib/reporting/automation/sync-state.ts"),
    "utf8",
  );
  check(
    "expired lease clear is atomic FOR UPDATE",
    syncStateSrc.includes("FOR UPDATE") &&
      syncStateSrc.includes("clearExpiredReportingExecutionLease"),
  );

  const actionRoute = readFileSync(
    path.join(root, "app/api/admin/reporting/operations/action/route.ts"),
    "utf8",
  );
  check(
    "action route requires Payload admin auth",
    actionRoute.includes("requirePayloadAdminApi") &&
      !actionRoute.includes("CRON_SECRET"),
  );

  const pageSrc = readFileSync(
    path.join(root, "app/admin/operations/reporting/page.tsx"),
    "utf8",
  );
  const detailSrc = readFileSync(
    path.join(root, "app/admin/operations/reporting/[clientId]/page.tsx"),
    "utf8",
  );
  check(
    "admin-only route access on both pages",
    pageSrc.includes("requirePayloadAdminPage") &&
      detailSrc.includes("requirePayloadAdminPage"),
  );

  const historyUi = readFileSync(
    path.join(
      root,
      "components/admin/operations/reporting/ReportingOperationsScreen.tsx",
    ),
    "utf8",
  );
  check(
    "platform and client history are rendered separately",
    historyUi.includes("Platform sweep history") &&
      historyUi.includes("Client sync history") &&
      historyUi.includes('h.scope === "platform"'),
  );

  const actionsUi = readFileSync(
    path.join(root, "components/admin/operations/reporting/ReportingOpsActions.tsx"),
    "utf8",
  );
  check(
    "confirmations identify client/provider/external/facts",
    actionsUi.includes("contact an external provider") &&
      actionsUi.includes("may update ReportingFacts") &&
      actionsUi.includes("confirmLiveMessage"),
  );
  check(
    "dry plan remains read-only labeled",
    actionsUi.includes("Read-only plan — no mutations"),
  );

  check(
    "sanitize helper redacts bearer tokens",
    !sanitizeReportingFailureMessage("Bearer abcdefghijklmnop").includes(
      "abcdefghijklmnop",
    ),
  );

  console.log("\nAll Phase 33B.1 reporting-operations checks passed.\n");
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
