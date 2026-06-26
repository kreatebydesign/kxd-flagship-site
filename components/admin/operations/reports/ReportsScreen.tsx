import Link from "next/link";
import { KxdBadge, KxdEmptyState, KxdMetric, KxdPage, KxdSection } from "@/components/os";
import { OperationsPageHero } from "@/components/admin/operations/shared/OperationsPageHero";
import { OperationsShell } from "@/components/admin/operations/shared/OperationsShell";
import type { ReportingDashboardData } from "@/lib/reporting/types";
import { monthLabel } from "@/lib/reporting/templates";
import { GenerateReportForm } from "./GenerateReportForm";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ReportDoc = Record<string, any>;

function statusVariant(status: string): "default" | "status" | "success" | "critical" {
  switch (status) {
    case "published":
      return "success";
    case "ready":
      return "status";
    case "generating":
      return "critical";
    default:
      return "default";
  }
}

function fmtWhen(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  } catch {
    return "—";
  }
}

export function ReportsScreen({
  dashboard,
  clients,
  defaultMonth,
  defaultYear,
}: {
  dashboard: ReportingDashboardData;
  clients: { id: number; name: string }[];
  defaultMonth: number;
  defaultYear: number;
}) {
  const kpis = [
    { label: "Reports due", value: String(dashboard.reportsDue) },
    { label: "Generated (this month)", value: String(dashboard.reportsGenerated) },
    { label: "Approved", value: String(dashboard.reportsApproved) },
    { label: "Published", value: String(dashboard.reportsPublished) },
    { label: "Viewed in portal", value: String(dashboard.reportsViewed) },
    { label: "Last generated", value: dashboard.lastGeneratedAt ? fmtWhen(dashboard.lastGeneratedAt) : "—" },
  ];

  return (
    <OperationsShell activeId="reports">
      <KxdPage className="kxd-os-page--ops">
        <OperationsPageHero
          eyebrow="KXD OS · Reporting"
          title="Executive Reports"
          lead="Premium monthly reporting — automatically gathered from every connected KXD Core module."
        />

        <div className="kxd-os-ops-kpi-grid">
          {kpis.map((k) => (
            <KxdMetric key={k.label} label={k.label} value={k.value} />
          ))}
        </div>

        <KxdSection>
          <GenerateReportForm clients={clients} defaultMonth={defaultMonth} defaultYear={defaultYear} />
        </KxdSection>

        <KxdSection label="Recent reports">
          {dashboard.recentReports.length === 0 ? (
            <KxdEmptyState title="No reports yet" description="Generate your first monthly executive report above." />
          ) : (
            <div className="kxd-os-card-list">
              {(dashboard.recentReports as ReportDoc[]).map((r) => (
                <Link
                  key={r.id as number}
                  href={`/admin/operations/reports/${r.id}`}
                  className="kxd-os-card kxd-os-card--link"
                  style={{ display: "block", marginBottom: "0.65rem", textDecoration: "none" }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
                    <div>
                      <p className="kxd-os-card__title">{String(r.title ?? "Report")}</p>
                      <p className="kxd-os-meta" style={{ marginTop: "0.3rem" }}>
                        {monthLabel(Number(r.reportingMonth), Number(r.reportingYear))}
                        {r.viewCount ? ` · ${r.viewCount} views` : ""}
                      </p>
                    </div>
                    <KxdBadge variant={statusVariant(String(r.status ?? "draft"))}>
                      {String(r.status ?? "draft")}
                    </KxdBadge>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </KxdSection>
      </KxdPage>
    </OperationsShell>
  );
}
