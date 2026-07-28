import Link from "next/link";
import {
  KxdBadge,
  KxdEmptyState,
  KxdMetric,
  KxdPage,
  KxdSection,
  KxdTable,
  KxdTableBody,
  KxdTableCell,
  KxdTableHead,
  KxdTableHeaderCell,
  KxdTableRow,
  type KxdBadgeVariant,
} from "@/components/os";
import { OperationsPageHero } from "@/components/admin/operations/shared/OperationsPageHero";
import { OperationsShell } from "@/components/admin/operations/shared/OperationsShell";
import {
  formatInfraCurrency,
  formatInfraDate,
  infraStatusLabel,
} from "@/lib/infrastructure/data";
import type { InfrastructureDashboardData, InfrastructureStatus } from "@/lib/infrastructure/types";
import {
  formatDaysRemainingLabel,
  providerClassLabel,
  urgencyBadgeLabel,
  type HostingRenewalUrgency,
} from "@/lib/infrastructure/hosting-renewal-readiness";

export interface InfrastructureScreenProps {
  data: InfrastructureDashboardData;
  statusFilter?: InfrastructureStatus | "all";
  backfillCreated?: number;
}

function statusVariant(status: string): KxdBadgeVariant {
  switch (status) {
    case "healthy":
      return "success";
    case "attention":
      return "warning";
    case "critical":
      return "critical";
    default:
      return "default";
  }
}

function renewalUrgencyVariant(urgency: HostingRenewalUrgency): KxdBadgeVariant {
  switch (urgency) {
    case "critical":
      return "critical";
    case "attention":
    case "watch":
      return "warning";
    case "ok":
      return "success";
    default:
      return "default";
  }
}

const FILTER_OPTIONS: Array<{ id: InfrastructureStatus | "all"; label: string }> = [
  { id: "all", label: "All" },
  { id: "healthy", label: "Healthy" },
  { id: "attention", label: "Attention" },
  { id: "critical", label: "Critical" },
  { id: "unknown", label: "Unknown" },
];

export function InfrastructureScreen({
  data,
  statusFilter = "all",
  backfillCreated,
}: InfrastructureScreenProps) {
  const filteredRecords =
    statusFilter === "all"
      ? data.records
      : data.records.filter((r) => String(r.status) === statusFilter);

  const kpis = [
    {
      label: "Infrastructure health",
      value: data.overallHealthScore != null ? String(data.overallHealthScore) : "—",
      sub: data.overallHealthLabel,
    },
    { label: "Clients tracked", value: String(data.totalClientsTracked) },
    { label: "Critical issues", value: String(data.criticalIssues) },
    { label: "Monthly stack cost", value: formatInfraCurrency(data.monthlyStackCost) },
    { label: "Annual stack cost", value: formatInfraCurrency(data.annualStackCost) },
    {
      label: "Margin opportunity",
      value:
        data.marginOpportunity != null
          ? formatInfraCurrency(data.marginOpportunity)
          : "—",
      sub: "MRR minus monthly stack",
    },
  ];

  return (
    <OperationsShell activeId="infrastructure">
      <KxdPage className="kxd-os-page--ops">
        <OperationsPageHero
          eyebrow="KXD OS · Infrastructure Manager"
          title="Infrastructure Command"
          lead="Domains, DNS, hosting, deployments, analytics, email, payments, renewals, and stack costs — one executive source of truth."
        />

        {backfillCreated != null && backfillCreated > 0 ? (
          <p className="kxd-os-meta" style={{ marginBottom: "1.5rem" }}>
            {backfillCreated} placeholder infrastructure record
            {backfillCreated === 1 ? "" : "s"} created from existing client data.
          </p>
        ) : null}

        <div className="kxd-os-ops-kpi-grid">
          {kpis.map((kpi) => (
            <KxdMetric key={kpi.label} label={kpi.label} value={kpi.value} sub={kpi.sub} />
          ))}
        </div>

        <div className="kxd-os-operations-split" style={{ marginTop: "2rem" }}>
          <KxdSection label="Hosting renewal readiness">
            {data.hostingRenewalWatchlist.length === 0 ? (
              <p className="kxd-os-meta">No infrastructure records to evaluate.</p>
            ) : (
              <div className="kxd-os-ops-list">
                {data.hostingRenewalWatchlist.map((record) => {
                  const readiness = record.readiness;
                  const soonest =
                    readiness.hosting.daysRemaining != null &&
                    readiness.domain.daysRemaining != null
                      ? Math.min(
                          readiness.hosting.daysRemaining,
                          readiness.domain.daysRemaining,
                        )
                      : (readiness.hosting.daysRemaining ??
                        readiness.domain.daysRemaining);
                  return (
                    <Link
                      key={record.id as number}
                      href={`/admin/operations/infrastructure/${record.clientId}`}
                      className="kxd-os-ops-list__row"
                      style={{ textDecoration: "none", display: "block" }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: "0.75rem",
                          alignItems: "flex-start",
                        }}
                      >
                        <div>
                          <p className="kxd-os-card__title">{String(record.clientName)}</p>
                          <p className="kxd-os-meta">
                            {record.primaryDomain
                              ? String(record.primaryDomain)
                              : "Domain TBD"}{" "}
                            · {providerClassLabel(readiness.providerClass)} ·{" "}
                            {formatDaysRemainingLabel(soonest)}
                          </p>
                        </div>
                        <KxdBadge variant={renewalUrgencyVariant(readiness.overallUrgency)}>
                          {urgencyBadgeLabel(readiness.overallUrgency)}
                        </KxdBadge>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </KxdSection>

          <KxdSection label="Critical issues">
            {data.criticalEvents.length === 0 ? (
              <p className="kxd-os-meta">No open critical infrastructure events.</p>
            ) : (
              <div className="kxd-os-ops-list">
                {data.criticalEvents.map((event) => (
                  <div key={event.id as number} className="kxd-os-ops-list__row">
                    <p className="kxd-os-card__title">{String(event.title)}</p>
                    <p className="kxd-os-meta">
                      {infraStatusLabel(String(event.eventType))} ·{" "}
                      {formatInfraDate(event.occurredAt as string)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </KxdSection>
        </div>

        <div className="kxd-os-ops-section-head" style={{ marginTop: "2.5rem" }}>
          <KxdSection label="Client infrastructure" />
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {FILTER_OPTIONS.map((opt) => (
              <Link
                key={opt.id}
                href={
                  opt.id === "all"
                    ? "/admin/operations/infrastructure"
                    : `/admin/operations/infrastructure?status=${opt.id}`
                }
                className={`kxd-os-sidebar__link${statusFilter === opt.id ? " kxd-os-sidebar__link--active" : ""}`}
                style={{ padding: "0.35rem 0.65rem", fontSize: "0.75rem" }}
              >
                {opt.label}
                {opt.id !== "all" ? ` (${data.statusCounts[opt.id]})` : ""}
              </Link>
            ))}
            <Link href="/admin/collections/client-infrastructure" className="kxd-os-link-quiet">
              Payload →
            </Link>
          </div>
        </div>

        {filteredRecords.length === 0 ? (
          <KxdEmptyState
            title="No infrastructure records"
            description="Run backfill on page load or create records in Payload."
          />
        ) : (
          <KxdTable>
            <KxdTableHead>
              <KxdTableRow>
                {["Client", "Domain", "Score", "Status", "Hosting", "Renewal", ""].map(
                  (heading) => (
                    <KxdTableHeaderCell key={heading || "action"}>{heading}</KxdTableHeaderCell>
                  ),
                )}
              </KxdTableRow>
            </KxdTableHead>
            <KxdTableBody>
              {filteredRecords.map((record) => {
                const status = String(record.status ?? "unknown");
                const readiness =
                  record.readiness ??
                  null;
                return (
                  <KxdTableRow key={record.id as number}>
                    <KxdTableCell primary>{String(record.clientName)}</KxdTableCell>
                    <KxdTableCell>
                      {record.primaryDomain ? String(record.primaryDomain) : "—"}
                    </KxdTableCell>
                    <KxdTableCell>
                      {record.computedScore != null ? String(record.computedScore) : "—"}
                    </KxdTableCell>
                    <KxdTableCell>
                      <KxdBadge variant={statusVariant(status)}>
                        {infraStatusLabel(status)}
                      </KxdBadge>
                    </KxdTableCell>
                    <KxdTableCell>
                      {readiness
                        ? providerClassLabel(readiness.providerClass)
                        : record.hostingProvider
                          ? String(record.hostingProvider)
                          : "—"}
                    </KxdTableCell>
                    <KxdTableCell>
                      {readiness ? (
                        <span style={{ display: "inline-flex", gap: "0.5rem", alignItems: "center" }}>
                          <KxdBadge variant={renewalUrgencyVariant(readiness.overallUrgency)}>
                            {urgencyBadgeLabel(readiness.overallUrgency)}
                          </KxdBadge>
                          <span className="kxd-os-meta">
                            {formatDaysRemainingLabel(
                              readiness.hosting.daysRemaining ??
                                readiness.domain.daysRemaining,
                            )}
                          </span>
                        </span>
                      ) : (
                        formatInfraDate(record.nextRenewalDate as string)
                      )}
                    </KxdTableCell>
                    <KxdTableCell>
                      <Link
                        href={`/admin/operations/infrastructure/${record.clientId}`}
                        className="kxd-os-link-quiet"
                      >
                        Open →
                      </Link>
                    </KxdTableCell>
                  </KxdTableRow>
                );
              })}
            </KxdTableBody>
          </KxdTable>
        )}

        <KxdSection label="Recent infrastructure events" />
        {data.recentEvents.length === 0 ? (
          <KxdEmptyState
            title="No events yet"
            description="Infrastructure events will appear here as they are logged."
          />
        ) : (
          <KxdTable>
            <KxdTableHead>
              <KxdTableRow>
                {["Event", "Type", "Severity", "Status", "Date"].map((heading) => (
                  <KxdTableHeaderCell key={heading}>{heading}</KxdTableHeaderCell>
                ))}
              </KxdTableRow>
            </KxdTableHead>
            <KxdTableBody>
              {data.recentEvents.map((event) => (
                <KxdTableRow key={event.id as number}>
                  <KxdTableCell primary>{String(event.title)}</KxdTableCell>
                  <KxdTableCell>{infraStatusLabel(String(event.eventType))}</KxdTableCell>
                  <KxdTableCell>
                    <KxdBadge
                      variant={
                        event.severity === "critical"
                          ? "critical"
                          : event.severity === "warning"
                            ? "warning"
                            : event.severity === "success"
                              ? "success"
                              : "default"
                      }
                    >
                      {String(event.severity)}
                    </KxdBadge>
                  </KxdTableCell>
                  <KxdTableCell>{String(event.status)}</KxdTableCell>
                  <KxdTableCell>{formatInfraDate(event.occurredAt as string)}</KxdTableCell>
                </KxdTableRow>
              ))}
            </KxdTableBody>
          </KxdTable>
        )}
      </KxdPage>
    </OperationsShell>
  );
}
