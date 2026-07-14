/**
 * Phase 33B / 33B.1 — Safe operator mutations for reporting automation (server-only).
 */

import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import { nextDailyPacificSyncAt } from "@/lib/reporting/automation/schedule";
import { runReportingAutomationSweep } from "@/lib/reporting/automation/engine";
import {
  clearExpiredReportingExecutionLease,
  loadReportingProviderSyncStates,
  upsertReportingProviderSyncState,
} from "@/lib/reporting/automation/sync-state";
import { loadClientsForReportingAutomation } from "@/lib/reporting/automation/clients";
import { sanitizeReportingFailureMessage } from "@/lib/reporting/automation/sanitize";
import { REPORTING_PROVIDER_CAPABILITY } from "@/lib/reporting/providers/types";
import { getReportingCapabilityIds } from "@/lib/ces/partnership/capabilities";
import { isValidReportingOpsProvider } from "./build-row";
import {
  parseReportingOpsActionBody,
  type ReportingOpsActionRequest,
} from "./action-parse";
import { isReportingRetryEligible } from "./retry-eligibility";
import {
  formatReportingSyncHourPacificLabel,
  parseStrictReportingSyncHourPacific,
} from "./sync-hour";
import type {
  ReportingOpsActionResultView,
  ReportingOpsActionType,
} from "./types";
import { providerLabel } from "./operational-status";

export type { ReportingOpsActionRequest };
export { parseReportingOpsActionBody };

export type ReportingOpsActionResult = ReportingOpsActionResultView;

const LIVE_ACTIONS = new Set<ReportingOpsActionType>([
  "force-sync",
  "retry-failed",
  "clear-expired-lease",
  "set-automation",
  "set-sync-hour",
]);

async function loadOpsClient(clientId: number) {
  const byId = await loadClientsForReportingAutomation({ clientId });
  if (byId[0]) return byId[0];

  // Deliberate inactive / non-automation client access for operators.
  const payload = await getPayload({ config });
  try {
    const client = await payload.findByID({
      collection: "clients",
      id: clientId,
      depth: 0,
      overrideAccess: true,
    });
    const infra = await payload.find({
      collection: "client-infrastructure",
      where: { client: { equals: clientId } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    });
    const infraDoc = infra.docs[0] as unknown as Record<string, unknown> | undefined;
    return {
      clientId,
      clientSlug: typeof client.slug === "string" ? client.slug : null,
      clientName: String(client.name ?? "Client"),
      clientStatus: String(client.status ?? "unknown"),
      infrastructureId:
        infraDoc && typeof infraDoc.id === "number" ? infraDoc.id : null,
      automationEnabled: infraDoc?.reportingAutomationEnabled !== false,
      syncHourPacific:
        typeof infraDoc?.reportingSyncHourPacific === "number"
          ? infraDoc.reportingSyncHourPacific
          : 5,
    };
  } catch {
    return null;
  }
}

async function clientEntitledForProvider(
  clientId: number,
  provider: "search-console" | "ga4" | "ads",
): Promise<boolean> {
  const payload = await getPayload({ config });
  const profiles = await payload.find({
    collection: "client-experience-profiles",
    where: { client: { equals: clientId } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  const doc = profiles.docs[0] as unknown as Record<string, unknown> | undefined;
  const modules = Array.isArray(doc?.enabledModules)
    ? (doc!.enabledModules as unknown[]).filter((v): v is string => typeof v === "string")
    : [];
  const caps = getReportingCapabilityIds(modules);
  return caps.includes(REPORTING_PROVIDER_CAPABILITY[provider]);
}

function fail(
  action: ReportingOpsActionType | "unknown",
  error: string,
  code: string,
  partial: Partial<ReportingOpsActionResultView> = {},
): ReportingOpsActionResultView {
  return {
    ok: false,
    action,
    message: sanitizeReportingFailureMessage(error, error),
    code,
    ...partial,
  };
}

export async function executeReportingOpsAction(
  request: ReportingOpsActionRequest,
): Promise<ReportingOpsActionResultView> {
  const client = await loadOpsClient(request.clientId);
  if (!client) {
    return fail(request.action, "Client not found.", "not-found");
  }

  const base = {
    clientName: client.clientName,
    clientSlug: client.clientSlug,
  };

  if (LIVE_ACTIONS.has(request.action) && request.confirm !== true) {
    return fail(request.action, "Confirmation required for this action.", "confirmation-required", base);
  }

  try {
    switch (request.action) {
      case "dry-plan": {
        if (!request.provider || !isValidReportingOpsProvider(request.provider)) {
          return fail(request.action, "provider is required for dry-plan.", "invalid", base);
        }
        const started = Date.now();
        const sweep = await runReportingAutomationSweep({
          dryRun: true,
          force: false,
          clientId: request.clientId,
          providers: [request.provider],
        });
        const providerResult = sweep.clients[0]?.providers[0];
        return {
          ok: true,
          action: request.action,
          message: providerResult?.message ?? "Dry plan completed — zero mutations.",
          ...base,
          provider: request.provider,
          outcome: providerResult?.outcome ?? "planned",
          factsFetched: null,
          factsWritten: 0,
          durationMs: Date.now() - started,
          nextScheduledSyncAt: providerResult?.nextScheduledSyncAt ?? null,
          dryRun: true,
        };
      }

      case "force-sync":
      case "retry-failed": {
        if (!request.provider || !isValidReportingOpsProvider(request.provider)) {
          return fail(request.action, "provider is required for sync.", "invalid", base);
        }
        const entitled = await clientEntitledForProvider(
          request.clientId,
          request.provider,
        );
        if (!entitled) {
          return fail(
            request.action,
            `${REPORTING_PROVIDER_CAPABILITY[request.provider]} is not entitled for this client.`,
            "not-entitled",
            { ...base, provider: request.provider },
          );
        }

        if (request.action === "retry-failed") {
          const states = await loadReportingProviderSyncStates(request.clientId);
          const state = states.find((s) => s.provider === request.provider);
          if (!state || !isReportingRetryEligible(state)) {
            return fail(
              request.action,
              "Retry is only available after a failed provider execution — not for configuration or entitlement skips.",
              "not-applicable",
              { ...base, provider: request.provider },
            );
          }
        }

        const started = Date.now();
        const sweep = await runReportingAutomationSweep({
          dryRun: false,
          force: true,
          clientId: request.clientId,
          providers: [request.provider],
        });
        const providerResult = sweep.clients[0]?.providers[0];
        const sync = providerResult?.sync;
        const failed = Boolean(providerResult?.countsAsFailure) || providerResult?.ok === false;
        const message = sanitizeReportingFailureMessage(
          providerResult?.message ??
            `${providerLabel(request.provider)} sync finished for ${client.clientName}.`,
          "Provider sync finished.",
        );

        // Reload schedule after mutation
        const after = await loadReportingProviderSyncStates(request.clientId);
        const afterState = after.find((s) => s.provider === request.provider);

        return {
          ok: !failed && providerResult?.ok !== false,
          action: request.action,
          message,
          ...base,
          provider: request.provider,
          outcome: providerResult?.outcome ?? null,
          factsFetched:
            typeof sync?.factsFetched === "number" ? sync.factsFetched : null,
          factsWritten: providerResult?.factsWritten ?? sync?.factsWritten ?? null,
          factsCreated:
            typeof sync?.factsCreated === "number" ? sync.factsCreated : null,
          factsUpdated:
            typeof sync?.factsUpdated === "number" ? sync.factsUpdated : null,
          durationMs: Date.now() - started,
          nextScheduledSyncAt: afterState?.nextScheduledSyncAt ?? providerResult?.nextScheduledSyncAt ?? null,
          failureCategory: failed ? providerResult?.outcome ?? "error" : null,
          failureSummary: failed ? message : null,
          dryRun: false,
        };
      }

      case "clear-expired-lease": {
        if (!request.provider || !isValidReportingOpsProvider(request.provider)) {
          return fail(request.action, "provider is required to clear a lease.", "invalid", base);
        }
        const cleared = await clearExpiredReportingExecutionLease({
          clientId: request.clientId,
          provider: request.provider,
        });
        if (!cleared.ok) {
          return fail(
            request.action,
            cleared.reason === "lease-active"
              ? "Lease is still active — refuse to clear."
              : "No expired lease to clear.",
            cleared.reason,
            {
              ...base,
              provider: request.provider,
              leasePreviousExpiresAt: cleared.leaseExpiresAt,
              executionStatus: cleared.executionStatus,
            },
          );
        }
        return {
          ok: true,
          action: request.action,
          message: "Expired lease cleared. Execution status is idle.",
          ...base,
          provider: request.provider,
          leasePreviousExpiresAt: cleared.previousLeaseExpiresAt,
          executionStatus: cleared.executionStatus,
        };
      }

      case "set-automation": {
        if (typeof request.automationEnabled !== "boolean") {
          return fail(request.action, "automationEnabled boolean is required.", "invalid", base);
        }
        if (client.infrastructureId == null) {
          return fail(
            request.action,
            "Client infrastructure record is required before changing automation.",
            "not-found",
            base,
          );
        }
        const payload = await getPayload({ config });
        await payload.update({
          collection: "client-infrastructure",
          id: client.infrastructureId,
          data: {
            reportingAutomationEnabled: request.automationEnabled,
          },
          overrideAccess: true,
        });
        return {
          ok: true,
          action: request.action,
          message: request.automationEnabled
            ? `Reporting automation enabled for ${client.clientName}.`
            : `Reporting automation disabled for ${client.clientName}.`,
          ...base,
          automationEnabled: request.automationEnabled,
        };
      }

      case "set-sync-hour": {
        const parsed = parseStrictReportingSyncHourPacific(request.syncHourPacific);
        if (!parsed.ok) {
          return fail(request.action, parsed.error, "invalid", base);
        }
        if (client.infrastructureId == null) {
          return fail(
            request.action,
            "Client infrastructure record is required before changing sync hour.",
            "not-found",
            base,
          );
        }
        const hour = parsed.hour;
        const payload = await getPayload({ config });
        await payload.update({
          collection: "client-infrastructure",
          id: client.infrastructureId,
          data: {
            reportingSyncHourPacific: hour,
          },
          overrideAccess: true,
        });

        // Keep future non-backoff schedules aligned to the new Pacific hour.
        const now = new Date();
        const nextAt = nextDailyPacificSyncAt(now, hour).toISOString();
        const states = await loadReportingProviderSyncStates(request.clientId);
        for (const state of states) {
          if (state.consecutiveFailures > 0) continue;
          if (!state.nextScheduledSyncAt && state.integrationStatus !== "healthy") {
            continue;
          }
          await upsertReportingProviderSyncState({
            clientId: request.clientId,
            provider: state.provider,
            nextScheduledSyncAt: nextAt,
          });
        }

        const label = formatReportingSyncHourPacificLabel(hour);
        return {
          ok: true,
          action: request.action,
          message: `Daily sync hour for ${client.clientName} set to ${label}.`,
          ...base,
          syncHourPacific: hour,
          syncHourLabel: label,
          nextScheduledSyncAt: nextAt,
        };
      }

      default:
        return fail("unknown", "Unsupported action.", "invalid", base);
    }
  } catch (error) {
    return fail(
      request.action,
      error instanceof Error ? error.message : "Action failed.",
      "failed",
      base,
    );
  }
}
