"use client";

import Link from "next/link";
import { PerformanceReportView } from "./PerformanceReportView";
import type { PerformanceReportViewModel } from "@/lib/reporting/performance-types";
import { statusDisplayLabel } from "@/lib/reporting/performance-format";

export function PerformanceReportShell({
  report,
  reportId,
}: {
  report: PerformanceReportViewModel;
  reportId: number;
}) {
  function handlePrint() {
    window.print();
  }

  return (
    <div className="kxd-os-perf-report-page">
      <div className="kxd-os-perf-report-toolbar">
        <div className="kxd-os-perf-report-toolbar__left">
          <Link href="/admin/operations/reports" className="kxd-os-btn kxd-os-btn--ghost">
            All Reports
          </Link>
          <span className="kxd-os-perf-report-toolbar__status">
            {statusDisplayLabel(report.status)}
          </span>
        </div>
        <div className="kxd-os-perf-report-toolbar__actions">
          <button type="button" className="kxd-os-btn" onClick={handlePrint}>
            Print / Save PDF
          </button>
          <Link
            href={`/admin/collections/monthly-reports/${reportId}`}
            className="kxd-os-btn kxd-os-btn--ghost"
          >
            Edit in CMS
          </Link>
        </div>
      </div>

      <div className="kxd-os-perf-report-stage">
        <PerformanceReportView report={report} />
      </div>
    </div>
  );
}
