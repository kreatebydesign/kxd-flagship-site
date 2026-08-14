"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { KxdPage } from "@/components/os";
import { ClientHqPageHero } from "./ClientHqPageHero";
import { monthLabel } from "@/lib/reporting/templates";
import { buildReportDownloadFilename } from "@/lib/reporting/export";
import {
  preparePortalReportEmbedHtml,
  resolvePortalReportHtmlSource,
} from "@/lib/reporting/portal/embed";
import type { PortalReportViewModel } from "@/lib/portal/requests-files-reports";
import "./kxd-report-portal-embed.css";

export function ReportViewScreen({ report }: { report: PortalReportViewModel }) {
  useEffect(() => {
    fetch(`/api/portal/reports/${report.id}/view`, { method: "POST" }).catch(() => {});
  }, [report.id]);

  const sourceHtml = resolvePortalReportHtmlSource(report);
  const embedHtml = useMemo(
    () => (sourceHtml ? preparePortalReportEmbedHtml(sourceHtml) : ""),
    [sourceHtml],
  );

  function downloadHtml() {
    const exportHtml = report.htmlExport || report.portalHtml;
    if (!exportHtml) return;
    const blob = new Blob([exportHtml], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = buildReportDownloadFilename({
      title: report.title,
      reportingMonth: report.reportingMonth,
      reportingYear: report.reportingYear,
    });
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <KxdPage className="kxd-os-page--ops">
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1rem" }}>
        <Link href="/portal/reports" className="kxd-os-btn kxd-os-btn--ghost">
          ← All reports
        </Link>
        {sourceHtml ? (
          <button type="button" className="kxd-os-btn kxd-os-btn--ghost" onClick={downloadHtml}>
            Download report
          </button>
        ) : null}
      </div>
      <ClientHqPageHero
        eyebrow="Executive Report"
        title={report.title}
        lead={monthLabel(report.reportingMonth, report.reportingYear)}
        presence
      />
      {embedHtml ? (
        <div
          className="kxd-report-portal-embed"
          dangerouslySetInnerHTML={{ __html: embedHtml }}
        />
      ) : (
        <p className="kxd-os-body">Report content is not available.</p>
      )}
    </KxdPage>
  );
}
