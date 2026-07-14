"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { ReportingProviderId } from "@/lib/reporting/providers/types";
import {
  formatReportingSyncHourPacificLabel,
  providerLabel,
  type ReportingOpsActionResultView,
} from "@/lib/reporting/operations";
import { formatOpsWhen } from "./format";

type Props = {
  clientId: number;
  clientName: string;
  providers: ReportingProviderId[];
  automationEnabled: boolean;
  syncHourPacific: number;
  staleLeaseProviders: ReportingProviderId[];
  failedProviders: ReportingProviderId[];
};

function confirmLiveMessage(input: {
  action: string;
  clientName: string;
  provider?: ReportingProviderId | null;
  external: boolean;
  updatesFacts: boolean;
  updatesState: boolean;
}): string {
  const providerPart = input.provider
    ? ` ${providerLabel(input.provider)}`
    : "";
  const lines = [
    `${input.action}${providerPart} for ${input.clientName}?`,
  ];
  if (input.external) {
    lines.push("This will contact an external provider.");
  }
  if (input.updatesFacts) {
    lines.push("This may update ReportingFacts.");
  }
  if (input.updatesState && !input.updatesFacts) {
    lines.push("This may update operational reporting state.");
  }
  if (input.updatesState && input.updatesFacts) {
    lines.push("Operational sync state will also update.");
  }
  return lines.join("\n");
}

function formatResult(result: ReportingOpsActionResultView): string {
  const parts: string[] = [result.message];
  if (result.provider) {
    parts.push(`Provider: ${providerLabel(result.provider)}`);
  }
  if (result.clientName) {
    parts.push(`Client: ${result.clientName}`);
  }
  if (result.outcome) {
    parts.push(`Outcome: ${result.outcome}`);
  }
  if (result.factsFetched != null) {
    parts.push(`Facts fetched: ${result.factsFetched}`);
  }
  if (result.factsWritten != null) {
    parts.push(`Facts written: ${result.factsWritten}`);
  }
  if (result.factsCreated != null || result.factsUpdated != null) {
    parts.push(
      `Created ${result.factsCreated ?? "—"} · Updated ${result.factsUpdated ?? "—"}`,
    );
  }
  if (result.durationMs != null) {
    parts.push(`Duration: ${result.durationMs}ms`);
  }
  if (result.nextScheduledSyncAt) {
    parts.push(`Next sync: ${formatOpsWhen(result.nextScheduledSyncAt)}`);
  }
  if (result.failureCategory) {
    parts.push(`Failure: ${result.failureCategory}`);
  }
  if (result.failureSummary && result.failureSummary !== result.message) {
    parts.push(result.failureSummary);
  }
  if (result.action === "clear-expired-lease") {
    parts.push(
      `Previous lease expiry: ${formatOpsWhen(result.leasePreviousExpiresAt ?? null)}`,
    );
    parts.push(`Status: ${result.executionStatus ?? "idle"}`);
  }
  if (result.automationEnabled != null) {
    parts.push(
      `Automation: ${result.automationEnabled ? "enabled" : "disabled"}`,
    );
  }
  if (result.syncHourLabel) {
    parts.push(`Schedule: ${result.syncHourLabel}`);
  }
  if (result.dryRun) {
    parts.push("Read-only plan — no mutations.");
  }
  return parts.join("\n");
}

async function postAction(
  body: Record<string, unknown>,
): Promise<ReportingOpsActionResultView> {
  const res = await fetch("/api/admin/reporting/operations/action", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as ReportingOpsActionResultView & {
    success?: boolean;
    error?: string;
  };
  if (!res.ok || json.ok === false || json.success === false) {
    throw Object.assign(new Error(json.message || json.error || `Request failed (${res.status})`), {
      result: json,
    });
  }
  return json;
}

export function ReportingOpsActions({
  clientId,
  clientName,
  providers,
  automationEnabled,
  syncHourPacific,
  staleLeaseProviders,
  failedProviders,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [provider, setProvider] = useState<ReportingProviderId>(
    providers[0] ?? "search-console",
  );
  const [hour, setHour] = useState(String(syncHourPacific));
  const [result, setResult] = useState<ReportingOpsActionResultView | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);

  const hourPreview = (() => {
    const n = Number(hour);
    if (!Number.isInteger(n) || n < 0 || n > 23) return "Enter 0–23";
    return formatReportingSyncHourPacificLabel(n);
  })();

  function run(input: {
    body: Record<string, unknown>;
    confirm?: {
      action: string;
      external: boolean;
      updatesFacts: boolean;
      updatesState: boolean;
      includeProvider?: boolean;
    };
  }) {
    if (input.confirm) {
      const ok = window.confirm(
        confirmLiveMessage({
          action: input.confirm.action,
          clientName,
          provider: input.confirm.includeProvider === false ? null : provider,
          external: input.confirm.external,
          updatesFacts: input.confirm.updatesFacts,
          updatesState: input.confirm.updatesState,
        }),
      );
      if (!ok) return;
    }
    setResult(null);
    setErrorText(null);
    startTransition(async () => {
      try {
        const next = await postAction({
          ...input.body,
          clientId,
          provider,
          confirm: input.confirm ? true : undefined,
        });
        setResult(next);
        router.refresh();
      } catch (error) {
        const err = error as Error & { result?: ReportingOpsActionResultView };
        if (err.result) {
          setResult(err.result);
        }
        setErrorText(err.message || "Action failed.");
      }
    });
  }

  return (
    <div className="kxd-os-card kxd-os-reporting-ops__actions">
      <p className="kxd-os-eyebrow">Operator controls</p>
      <p className="kxd-os-body" style={{ marginTop: "0.4rem", maxWidth: "36rem" }}>
        Live work is confirmation-gated. Dry plan is read-only.
      </p>

      <div className="kxd-os-reporting-ops__action-row">
        <label className="kxd-os-meta kxd-os-reporting-ops__field">
          Provider
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value as ReportingProviderId)}
            disabled={pending}
          >
            {providers.map((p) => (
              <option key={p} value={p}>
                {providerLabel(p)}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          className="kxd-os-reporting-ops__btn"
          disabled={pending}
          onClick={() =>
            run({
              body: { action: "dry-plan" },
            })
          }
        >
          Dry plan
        </button>
        <button
          type="button"
          className="kxd-os-reporting-ops__btn"
          disabled={pending}
          onClick={() =>
            run({
              body: { action: "force-sync" },
              confirm: {
                action: `Run a live ${providerLabel(provider)} sync`,
                external: true,
                updatesFacts: true,
                updatesState: true,
              },
            })
          }
        >
          Force sync
        </button>
        <button
          type="button"
          className="kxd-os-reporting-ops__btn"
          disabled={pending || !failedProviders.includes(provider)}
          onClick={() =>
            run({
              body: { action: "retry-failed" },
              confirm: {
                action: `Retry the failed ${providerLabel(provider)} sync`,
                external: true,
                updatesFacts: true,
                updatesState: true,
              },
            })
          }
        >
          Retry failed
        </button>
        <button
          type="button"
          className="kxd-os-reporting-ops__btn"
          disabled={pending || !staleLeaseProviders.includes(provider)}
          onClick={() =>
            run({
              body: { action: "clear-expired-lease" },
              confirm: {
                action: `Clear the expired ${providerLabel(provider)} lease`,
                external: false,
                updatesFacts: false,
                updatesState: true,
              },
            })
          }
        >
          Clear expired lease
        </button>
      </div>

      <div className="kxd-os-reporting-ops__action-row">
        <button
          type="button"
          className="kxd-os-reporting-ops__btn"
          disabled={pending}
          onClick={() =>
            run({
              body: {
                action: "set-automation",
                automationEnabled: !automationEnabled,
              },
              confirm: {
                action: automationEnabled
                  ? "Disable reporting automation"
                  : "Enable reporting automation",
                external: false,
                updatesFacts: false,
                updatesState: true,
                includeProvider: false,
              },
            })
          }
        >
          {automationEnabled ? "Disable automation" : "Enable automation"}
        </button>

        <label className="kxd-os-meta kxd-os-reporting-ops__field">
          Daily sync hour
          <input
            type="number"
            min={0}
            max={23}
            step={1}
            value={hour}
            disabled={pending}
            onChange={(e) => setHour(e.target.value)}
          />
          <span className="kxd-os-reporting-ops__hint">{hourPreview}</span>
        </label>
        <button
          type="button"
          className="kxd-os-reporting-ops__btn"
          disabled={pending}
          onClick={() =>
            run({
              body: {
                action: "set-sync-hour",
                syncHourPacific: hour,
              },
              confirm: {
                action: `Set daily sync hour to ${hourPreview}`,
                external: false,
                updatesFacts: false,
                updatesState: true,
                includeProvider: false,
              },
            })
          }
        >
          Save sync hour
        </button>
      </div>

      {pending ? (
        <p className="kxd-os-meta" style={{ marginTop: "0.85rem" }}>
          Working…
        </p>
      ) : null}

      {result || errorText ? (
        <div
          className={
            result?.ok === false || errorText
              ? "kxd-os-reporting-ops__result kxd-os-reporting-ops__result--error"
              : "kxd-os-reporting-ops__result"
          }
        >
          <pre>
            {result
              ? formatResult(result)
              : errorText}
          </pre>
        </div>
      ) : null}
    </div>
  );
}
