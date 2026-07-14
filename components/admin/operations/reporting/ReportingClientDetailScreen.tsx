import Link from "next/link";
import {
  KxdBadge,
  KxdEmptyState,
  KxdMetric,
  KxdPage,
  KxdSection,
  type KxdBadgeVariant,
} from "@/components/os";
import { OperationsPageHero } from "@/components/admin/operations/shared/OperationsPageHero";
import { OperationsShell } from "@/components/admin/operations/shared/OperationsShell";
import {
  formatReportingSyncHourPacificLabel,
  isReportingRetryEligible,
  operationalStatusLabel,
  providerLabel,
  type ReportingOpsClientDetail,
} from "@/lib/reporting/operations";
import { REPORTING_AUTOMATION_PROVIDERS } from "@/lib/reporting/automation/constants";
import { formatOpsWhen } from "./format";
import { ReportingOpsActions } from "./ReportingOpsActions";

function statusVariant(status: string): KxdBadgeVariant {
  switch (status) {
    case "healthy":
    case "scheduled":
    case "fresh-but-manual":
      return "success";
    case "failing":
    case "stale-lease":
      return "critical";
    case "due":
    case "running":
    case "deferred-backoff":
      return "warning";
    default:
      return "default";
  }
}

export function ReportingClientDetailScreen({
  data,
}: {
  data: ReportingOpsClientDetail;
}) {
  const staleLeaseProviders = data.providers
    .filter((p) => p.leaseStale)
    .map((p) => p.provider);
  const failedProviders = data.providers
    .filter((p) =>
      isReportingRetryEligible({
        consecutiveFailures: p.consecutiveFailures,
        lastOutcome: p.lastOutcome,
        integrationStatus: p.integrationStatus,
      }),
    )
    .map((p) => p.provider);

  return (
    <OperationsShell activeId="reporting-ops">
      <KxdPage className="kxd-os-page--ops">
        <OperationsPageHero
          eyebrow="KXD OS · Reporting Operations"
          title={data.clientName}
          lead={`${data.clientSlug ?? `Client ${data.clientId}`} · reporting automation detail`}
        />

        <p className="kxd-os-meta" style={{ marginBottom: "1.1rem" }}>
          <Link href="/admin/operations/reporting" className="kxd-os-link-quiet">
            ← Reporting operations
          </Link>
          {data.infrastructureId != null ? (
            <>
              {" · "}
              <Link
                href={`/admin/collections/client-infrastructure/${data.infrastructureId}`}
                className="kxd-os-link-quiet"
              >
                Infrastructure record
              </Link>
            </>
          ) : null}
        </p>

        {data.inactive ? (
          <div className="kxd-os-card kxd-os-reporting-ops__banner">
            <p className="kxd-os-body">
              This client is <strong>{data.clientStatus}</strong> and is outside the
              active automation portfolio. Detail access is deliberate for operators.
            </p>
          </div>
        ) : null}

        {data.missingInfrastructure ? (
          <div className="kxd-os-card kxd-os-reporting-ops__banner">
            <p className="kxd-os-body">
              Client Infrastructure is missing. Schedule and automation toggles are
              unavailable until a record exists.
            </p>
          </div>
        ) : null}

        {data.loadWarning ? (
          <div className="kxd-os-card kxd-os-reporting-ops__banner">
            <p className="kxd-os-body">{data.loadWarning}</p>
          </div>
        ) : null}

        <div className="kxd-os-reporting-ops__stack">
          <section>
            <KxdSection label="Current condition" />
            <div className="kxd-os-reporting-ops__summary">
              <KxdMetric
                label="Automation"
                value={data.clientAutomationEnabled ? "Enabled" : "Disabled"}
              />
              <KxdMetric
                label="Daily sync"
                value={formatReportingSyncHourPacificLabel(data.syncHourPacific)}
              />
              <KxdMetric
                label="Entitlements"
                value={
                  data.entitlements.length > 0
                    ? String(data.entitlements.length)
                    : "None"
                }
              />
              <KxdMetric
                label="Freshness"
                value={data.reportingHealth?.freshnessState ?? "unknown"}
              />
            </div>
            <div className="kxd-os-card kxd-os-reporting-ops__panel">
              <p className="kxd-os-body">
                Reporting capabilities:{" "}
                {data.entitlements.length > 0
                  ? data.entitlements.join(", ")
                  : "None entitled"}
              </p>
              <p className="kxd-os-meta" style={{ marginTop: "0.45rem" }}>
                Last health success:{" "}
                {formatOpsWhen(data.reportingHealth?.lastSuccessfulSyncAt ?? null)}
              </p>
            </div>
            {data.blockers.length > 0 ? (
              <div className="kxd-os-card kxd-os-reporting-ops__panel">
                <p className="kxd-os-eyebrow">Blockers</p>
                {data.blockers.map((blocker) => (
                  <p key={blocker} className="kxd-os-body" style={{ marginTop: "0.45rem" }}>
                    {blocker}
                  </p>
                ))}
              </div>
            ) : null}
          </section>

          <section>
            <KxdSection label="Integrations & provider state" />
            {data.providers.length === 0 ? (
              <KxdEmptyState
                title="No provider states"
                description="Provider rows appear after the automation engine classifies this client."
              />
            ) : (
              data.providers.map((row) => (
                <div
                  key={row.provider}
                  className="kxd-os-card kxd-os-reporting-ops__provider-card"
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
                    <div>
                      <p className="kxd-os-card__title">{providerLabel(row.provider)}</p>
                      <p className="kxd-os-meta" style={{ marginTop: "0.3rem" }}>
                        Classification: {row.integrationStatus}
                        {" · "}
                        Execution: {row.executionStatus}
                        {" · "}
                        Lease:{" "}
                        {row.leaseStale ? "stale" : row.leaseActive ? "active" : "idle"}
                      </p>
                      <p className="kxd-os-body" style={{ marginTop: "0.5rem" }}>
                        Last success {formatOpsWhen(row.lastSuccessfulSyncAt)}
                        {" · "}
                        Last failure {formatOpsWhen(row.lastFailedSyncAt)}
                        {" · "}
                        Next {formatOpsWhen(row.nextScheduledSyncAt)}
                      </p>
                      <p className="kxd-os-meta" style={{ marginTop: "0.35rem" }}>
                        Window: {row.lastCompletedWindowId ?? "—"}
                        {" · "}
                        Failures: {row.consecutiveFailures}
                        {" · "}
                        Facts: {row.factsCount}
                        {" · "}
                        Freshness: {row.freshness}
                        {" · "}
                        Entitled: {row.entitled ? "yes" : "no"}
                      </p>
                      {row.failureReason ? (
                        <p
                          className="kxd-os-body"
                          style={{ marginTop: "0.45rem", color: "var(--kxd-os-critical)" }}
                        >
                          {row.failureReason}
                        </p>
                      ) : null}
                    </div>
                    <KxdBadge variant={statusVariant(row.operationalStatus)}>
                      {operationalStatusLabel(row.operationalStatus)}
                    </KxdBadge>
                  </div>
                </div>
              ))
            )}

            <div className="kxd-os-card kxd-os-reporting-ops__panel">
              <p className="kxd-os-eyebrow">Reporting health</p>
              {data.reportingHealth?.providerStates.map((p) => (
                <p key={p.provider} className="kxd-os-body" style={{ marginTop: "0.45rem" }}>
                  <strong>{providerLabel(p.provider)}</strong>
                  {" — "}
                  {p.state} · {p.freshness}
                  {p.detail ? ` · ${p.detail}` : ""}
                </p>
              )) ?? (
                <p className="kxd-os-body" style={{ marginTop: "0.45rem" }}>
                  Health composition unavailable.
                </p>
              )}
            </div>
          </section>

          <section>
            <KxdSection label="Recent ReportingFacts" />
            {data.recentFacts.length === 0 ? (
              <KxdEmptyState
                title="No facts for this client"
                description="Facts appear after an entitled provider sync writes canonical ReportingFacts."
              />
            ) : (
              <div className="kxd-os-card kxd-os-reporting-ops__panel">
                {data.recentFacts.map((fact) => (
                  <p key={fact.factKey} className="kxd-os-body" style={{ marginBottom: "0.35rem" }}>
                    {fact.metricKey} · {fact.providerId} ·{" "}
                    {fact.periodLabel ?? fact.periodStart} · {fact.value}
                  </p>
                ))}
              </div>
            )}
          </section>

          <section>
            <KxdSection label="Automation history" />
            {data.history.length === 0 ? (
              <KxdEmptyState
                title="No client sync history"
                description="Successful and failed syncs for this client appear here. Platform sweeps are never attached to this timeline."
              />
            ) : (
              data.history.map((entry) => (
                <div
                  key={String(entry.id)}
                  className="kxd-os-card kxd-os-reporting-ops__history-item"
                >
                  <p className="kxd-os-meta">
                    {formatOpsWhen(entry.timestamp)}
                    {entry.provider ? ` · ${providerLabel(entry.provider)}` : ""}
                  </p>
                  <p className="kxd-os-card__title" style={{ marginTop: "0.3rem" }}>
                    {entry.title}
                  </p>
                  <p className="kxd-os-body" style={{ marginTop: "0.3rem" }}>
                    {entry.outcome ?? "—"}
                    {entry.factsWritten != null ? ` · facts ${entry.factsWritten}` : ""}
                    {entry.failureSummary ? ` · ${entry.failureSummary}` : ""}
                  </p>
                </div>
              ))
            )}
          </section>

          <section>
            <KxdSection label="Operator controls" />
            <ReportingOpsActions
              clientId={data.clientId}
              clientName={data.clientName}
              providers={[...REPORTING_AUTOMATION_PROVIDERS]}
              automationEnabled={data.clientAutomationEnabled}
              syncHourPacific={data.syncHourPacific}
              staleLeaseProviders={staleLeaseProviders}
              failedProviders={failedProviders}
            />
          </section>
        </div>
      </KxdPage>
    </OperationsShell>
  );
}
