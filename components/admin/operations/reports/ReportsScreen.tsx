import Link from "next/link";
import {
  KxdBadge,
  KxdEmptyState,
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
  fmtHealthScore,
  formatReportPeriod,
  reportTypeLabel,
  statusDisplayLabel,
} from "@/lib/reporting/performance-format";
import type { ReportingDashboardData } from "@/lib/reporting/types";
import { GenerateReportForm } from "./GenerateReportForm";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ReportDoc = Record<string, any>;

function statusVariant(status: string): KxdBadgeVariant {
  switch (status) {
    case "published":
    case "sent":
      return "success";
    case "ready":
      return "status";
    case "generating":
      return "critical";
    case "archived":
      return "default";
    default:
      return "default";
  }
}

function clientName(report: ReportDoc): string {
  const client = report.client;
  if (client && typeof client === "object") {
    return String((client as ReportDoc).name ?? "—");
  }
  return "—";
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
  const reports = dashboard.recentReports as ReportDoc[];

  return (
    <OperationsShell activeId="reports">
      <KxdPage className="kxd-os-page--ops">
        <div className="kxd-os-ops-section-head">
          <OperationsPageHero
            eyebrow="KXD OS · Reporting"
            title="Client Monthly Performance Reports"
            lead="Create polished executive reports for marketing retainers, Google Ads, SEO, websites, analytics, and ongoing client work."
          />
          <div className="kxd-os-portfolio-actions">
            <Link
              href="/admin/collections/monthly-reports/create"
              className="kxd-os-btn kxd-os-btn--primary"
            >
              New Report
            </Link>
          </div>
        </div>

        <KxdSection label="Recent Reports">
          {reports.length === 0 ? (
            <KxdEmptyState
              title="No reports yet"
              description="Create your first executive performance report to share polished client updates."
            />
          ) : (
            <KxdTable>
              <KxdTableHead>
                <KxdTableRow>
                  <KxdTableHeaderCell>Status</KxdTableHeaderCell>
                  <KxdTableHeaderCell>Client</KxdTableHeaderCell>
                  <KxdTableHeaderCell>Date Range</KxdTableHeaderCell>
                  <KxdTableHeaderCell>Report Type</KxdTableHeaderCell>
                  <KxdTableHeaderCell>Account Health</KxdTableHeaderCell>
                  <KxdTableHeaderCell>Actions</KxdTableHeaderCell>
                </KxdTableRow>
              </KxdTableHead>
              <KxdTableBody>
                {reports.map((report) => (
                  <KxdTableRow key={report.id as number}>
                    <KxdTableCell>
                      <KxdBadge variant={statusVariant(String(report.status ?? "draft"))}>
                        {statusDisplayLabel(String(report.status ?? "draft"))}
                      </KxdBadge>
                    </KxdTableCell>
                    <KxdTableCell>{clientName(report)}</KxdTableCell>
                    <KxdTableCell>{formatReportPeriod(report)}</KxdTableCell>
                    <KxdTableCell>{reportTypeLabel(String(report.reportType ?? ""))}</KxdTableCell>
                    <KxdTableCell>
                      {report.accountHealthScore != null
                        ? fmtHealthScore(Number(report.accountHealthScore))
                        : "—"}
                    </KxdTableCell>
                    <KxdTableCell>
                      <div className="kxd-os-perf-report-index-actions">
                        <Link
                          href={`/admin/operations/reports/${report.id}`}
                          className="kxd-os-btn kxd-os-btn--ghost"
                        >
                          View
                        </Link>
                        <Link
                          href={`/admin/collections/monthly-reports/${report.id}`}
                          className="kxd-os-btn kxd-os-btn--ghost"
                        >
                          Edit
                        </Link>
                      </div>
                    </KxdTableCell>
                  </KxdTableRow>
                ))}
              </KxdTableBody>
            </KxdTable>
          )}
        </KxdSection>

        <KxdSection label="Auto-generate (legacy)">
          <GenerateReportForm clients={clients} defaultMonth={defaultMonth} defaultYear={defaultYear} />
        </KxdSection>
      </KxdPage>
    </OperationsShell>
  );
}
