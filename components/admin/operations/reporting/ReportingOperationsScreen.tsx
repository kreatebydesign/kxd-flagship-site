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
  filterReportingOpsRows,
  operationalStatusLabel,
  providerLabel,
  type ReportingOpsFilter,
  type ReportingOpsPlatformModel,
} from "@/lib/reporting/operations";
import { formatOpsWhen } from "./format";

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

const FILTERS: Array<{ id: ReportingOpsFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "healthy", label: "Healthy" },
  { id: "failing", label: "Failed" },
  { id: "due", label: "Due" },
  { id: "deferred", label: "Deferred" },
  { id: "not-configured", label: "Not configured" },
  { id: "not-entitled", label: "Not entitled" },
  { id: "awaiting-action", label: "Awaiting action" },
  { id: "running", label: "Running" },
  { id: "disabled", label: "Automation disabled" },
];

export function ReportingOperationsScreen({
  data,
  filter,
  providerFilter,
  clientQuery,
  loadError,
}: {
  data: ReportingOpsPlatformModel | null;
  filter: ReportingOpsFilter;
  providerFilter: string;
  clientQuery: string;
  loadError?: string | null;
}) {
  if (loadError || !data) {
    return (
      <OperationsShell activeId="reporting-ops">
        <KxdPage className="kxd-os-page--ops">
          <OperationsPageHero
            eyebrow="KXD OS · Reporting Operations"
            title="Reporting automation"
            lead="Platform monitoring for automated reporting across every client."
          />
          <KxdEmptyState
            title="Reporting operations unavailable"
            description={
              loadError ||
              "The reporting operations read model could not be loaded."
            }
          />
        </KxdPage>
      </OperationsShell>
    );
  }

  const rows = filterReportingOpsRows(data.rows, {
    filter,
    provider: providerFilter || null,
    clientSlug: clientQuery || null,
  });
  const { summary } = data;
  const capacity = summary.capacity;

  const primaryKpis = [
    { label: "Clients", value: String(summary.activeClientsEvaluated) },
    { label: "Provider states", value: String(summary.totalProviderStates) },
    { label: "Healthy", value: String(summary.healthy) },
    { label: "Failed", value: String(summary.failing) },
    { label: "Due", value: String(summary.due) },
    { label: "Running", value: String(summary.currentlyRunning) },
  ];

  const secondaryKpis = [
    { label: "Deferred by backoff", value: String(summary.deferredBackoff) },
    { label: "Awaiting config", value: String(summary.awaitingConfiguration) },
    {
      label: "Awaiting auth / client",
      value: String(summary.awaitingAuthorizationOrClient),
    },
    { label: "Not entitled", value: String(summary.notEntitled) },
    { label: "Automation disabled", value: String(summary.automationDisabled) },
    { label: "Stale leases", value: String(summary.staleLeases) },
    { label: "Upcoming syncs", value: String(summary.upcomingSyncs) },
    { label: "Recent successes", value: String(summary.recentSuccessfulRuns) },
    { label: "Recent failures", value: String(summary.recentFailedRuns) },
  ];

  const platformHistory = data.history.filter((h) => h.scope === "platform");
  const clientHistory = data.history.filter((h) => h.scope === "client");

  return (
    <OperationsShell activeId="reporting-ops">
      <KxdPage className="kxd-os-page--ops">
        <OperationsPageHero
          eyebrow="KXD OS · Reporting Operations"
          title="Reporting automation"
          lead="Monitor provider health, schedule pressure, and sync history across the portfolio. Live controls live on each client detail page."
        />

        <div className="kxd-os-reporting-ops__summary">
          {primaryKpis.map((kpi) => (
            <KxdMetric key={kpi.label} label={kpi.label} value={kpi.value} />
          ))}
        </div>

        <div className="kxd-os-ops-kpi-grid" style={{ marginBottom: "1.75rem" }}>
          {secondaryKpis.map((kpi) => (
            <KxdMetric key={kpi.label} label={kpi.label} value={kpi.value} />
          ))}
        </div>

        <KxdSection label="Sweep capacity" />
        <div className="kxd-os-card kxd-os-reporting-ops__capacity">
          <p className="kxd-os-body">
            Max clients / sweep: <strong>{capacity.maxClients}</strong>
            {" · "}
            Max provider attempts: <strong>{capacity.maxProviderAttempts}</strong>
            {" · "}
            Eligible clients: <strong>{capacity.eligibleClients}</strong>
            {" · "}
            Eligible provider slots: <strong>{capacity.eligibleProviderSlots}</strong>
          </p>
          <p className="kxd-os-meta" style={{ marginTop: "0.55rem" }}>
            {capacity.wouldTruncateByClients || capacity.wouldTruncateByProviders
              ? "Eligible work exceeds sweep limits — remaining providers stay deferred."
              : "Eligible work fits inside current sweep limits."}
            {capacity.lastSweepTruncated == null
              ? " Last live sweep truncation: unknown."
              : capacity.lastSweepTruncated
                ? ` Last live sweep truncated${
                    capacity.lastSweepFinishedAt
                      ? ` (${formatOpsWhen(capacity.lastSweepFinishedAt)})`
                      : ""
                  }.`
                : ` Last live sweep completed without truncation${
                    capacity.lastSweepFinishedAt
                      ? ` (${formatOpsWhen(capacity.lastSweepFinishedAt)})`
                      : ""
                  }.`}
          </p>
        </div>

        <KxdSection label="Provider states" />
        <div className="kxd-os-card kxd-os-reporting-ops__filters">
          <form method="get">
            <label className="kxd-os-meta kxd-os-reporting-ops__field">
              Client
              <input
                name="client"
                defaultValue={clientQuery}
                placeholder="slug or name"
              />
            </label>
            <label className="kxd-os-meta kxd-os-reporting-ops__field">
              Provider
              <select name="provider" defaultValue={providerFilter || "all"}>
                <option value="all">All</option>
                <option value="search-console">Search Console</option>
                <option value="ga4">GA4</option>
                <option value="ads">Google Ads</option>
              </select>
            </label>
            <label className="kxd-os-meta kxd-os-reporting-ops__field">
              Status
              <select name="filter" defaultValue={filter}>
                {FILTERS.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.label}
                  </option>
                ))}
              </select>
            </label>
            <button type="submit" className="kxd-os-reporting-ops__btn">
              Apply
            </button>
          </form>
        </div>

        {data.rows.length === 0 ? (
          <KxdEmptyState
            title="No provider states yet"
            description="Sync-state rows appear after the hourly sweep classifies active clients."
          />
        ) : rows.length === 0 ? (
          <KxdEmptyState
            title="No matching provider states"
            description="Adjust filters to widen the view."
          />
        ) : (
          <div className="kxd-os-reporting-ops__table-wrap">
            <table className="kxd-os-reporting-ops__table">
              <thead>
                <tr className="kxd-os-meta">
                  <th>Client</th>
                  <th>Provider</th>
                  <th>Status</th>
                  <th>Entitled</th>
                  <th>Automation</th>
                  <th>Last success</th>
                  <th>Next sync</th>
                  <th>Failures</th>
                  <th>Facts</th>
                  <th>Freshness</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={`${row.clientId}:${row.provider}`}>
                    <td>
                      <Link
                        href={`/admin/operations/reporting/${row.clientId}`}
                        className="kxd-os-link-quiet"
                      >
                        {row.clientName}
                      </Link>
                      <div className="kxd-os-meta">{row.clientSlug ?? "—"}</div>
                    </td>
                    <td>
                      {providerLabel(row.provider)}
                      <div className="kxd-os-meta">{row.integrationStatus}</div>
                    </td>
                    <td>
                      <KxdBadge variant={statusVariant(row.operationalStatus)}>
                        {operationalStatusLabel(row.operationalStatus)}
                      </KxdBadge>
                      {row.failureReason ? (
                        <div className="kxd-os-meta" style={{ marginTop: "0.35rem", maxWidth: "16rem" }}>
                          {row.failureReason}
                        </div>
                      ) : null}
                    </td>
                    <td>
                      {row.entitled ? "Yes" : "No"}
                      <div className="kxd-os-meta">{row.entitlementCapability}</div>
                    </td>
                    <td>
                      {row.clientAutomationEnabled && row.providerAutomationEnabled
                        ? "On"
                        : "Off"}
                      <div className="kxd-os-meta">
                        Lease:{" "}
                        {row.leaseStale
                          ? "stale"
                          : row.leaseActive
                            ? "active"
                            : "idle"}
                      </div>
                    </td>
                    <td>
                      {formatOpsWhen(row.lastSuccessfulSyncAt)}
                      <div className="kxd-os-meta">
                        Fail: {formatOpsWhen(row.lastFailedSyncAt)}
                      </div>
                    </td>
                    <td>
                      {formatOpsWhen(row.nextScheduledSyncAt)}
                      <div className="kxd-os-meta">
                        Window: {row.lastCompletedWindowId ?? "—"}
                      </div>
                    </td>
                    <td>{row.consecutiveFailures}</td>
                    <td>{row.factsCount}</td>
                    <td>{row.freshness}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <KxdSection label="Platform sweep history" />
        {platformHistory.length === 0 ? (
          <KxdEmptyState
            title="No platform sweep history yet"
            description="Live hourly sweeps record capacity summaries here without attaching them to a client."
          />
        ) : (
          platformHistory.slice(0, 12).map((entry) => (
            <div
              key={String(entry.id)}
              className="kxd-os-card kxd-os-reporting-ops__history-item"
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
                <div>
                  <p className="kxd-os-meta">
                    {formatOpsWhen(entry.timestamp)} · platform · {entry.triggerType}
                  </p>
                  <p className="kxd-os-card__title" style={{ marginTop: "0.35rem" }}>
                    {entry.title}
                  </p>
                  <p className="kxd-os-body" style={{ marginTop: "0.35rem" }}>
                    {entry.sweepTruncated === true
                      ? "Truncated"
                      : entry.sweepTruncated === false
                        ? "Complete"
                        : "Truncation unknown"}
                    {entry.runDurationMs != null ? ` · ${entry.runDurationMs}ms` : ""}
                    {entry.sweepClientsSkippedCapacity != null
                      ? ` · Clients skipped: ${entry.sweepClientsSkippedCapacity}`
                      : ""}
                  </p>
                </div>
                <KxdBadge variant={entry.sweepTruncated ? "warning" : "success"}>
                  sweep
                </KxdBadge>
              </div>
            </div>
          ))
        )}

        <KxdSection label="Client sync history" />
        {clientHistory.length === 0 ? (
          <KxdEmptyState
            title="No client sync history yet"
            description="Successful and failed client provider runs appear here with correct client ownership."
          />
        ) : (
          clientHistory.slice(0, 20).map((entry) => (
            <div
              key={String(entry.id)}
              className="kxd-os-card kxd-os-reporting-ops__history-item"
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
                <div>
                  <p className="kxd-os-meta">
                    {formatOpsWhen(entry.timestamp)}
                    {" · "}
                    {entry.clientName ?? "Client"}
                    {entry.provider ? ` · ${providerLabel(entry.provider)}` : ""}
                  </p>
                  <p className="kxd-os-card__title" style={{ marginTop: "0.35rem" }}>
                    {entry.title}
                  </p>
                  <p className="kxd-os-body" style={{ marginTop: "0.35rem" }}>
                    Outcome: {entry.outcome ?? "—"}
                    {entry.factsWritten != null ? ` · Facts written: ${entry.factsWritten}` : ""}
                  </p>
                  {entry.failureSummary ? (
                    <p
                      className="kxd-os-body"
                      style={{ marginTop: "0.35rem", color: "var(--kxd-os-critical)" }}
                    >
                      {entry.failureSummary}
                    </p>
                  ) : null}
                </div>
                <KxdBadge variant={entry.ok === false ? "critical" : "success"}>
                  {entry.eventType.replace("reporting.sync.", "")}
                </KxdBadge>
              </div>
            </div>
          ))
        )}
      </KxdPage>
    </OperationsShell>
  );
}
