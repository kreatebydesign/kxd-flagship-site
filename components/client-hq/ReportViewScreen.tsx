"use client";

import { useEffect } from "react";
import Link from "next/link";
import { KxdPage } from "@/components/os";
import { ClientHqPageHero } from "./ClientHqPageHero";
import { monthLabel } from "@/lib/reporting/templates";
import { buildReportDownloadFilename } from "@/lib/reporting/export";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ReportDoc = Record<string, any>;

export function ReportViewScreen({ report }: { report: ReportDoc }) {
  useEffect(() => {
    fetch(`/api/portal/reports/${report.id}/view`, { method: "POST" }).catch(() => {});
  }, [report.id]);

  const html = String(report.portalHtml ?? report.htmlExport ?? "");

  function downloadHtml() {
    const exportHtml = String(report.htmlExport ?? report.portalHtml ?? "");
    if (!exportHtml) return;
    const blob = new Blob([exportHtml], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = buildReportDownloadFilename(report);
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <KxdPage className="kxd-os-page--ops">
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1rem" }}>
        <Link href="/portal/reports" className="kxd-os-btn kxd-os-btn--ghost">
          ← All reports
        </Link>
        {html ? (
          <button type="button" className="kxd-os-btn kxd-os-btn--ghost" onClick={downloadHtml}>
            Download report
          </button>
        ) : null}
      </div>
      <ClientHqPageHero
        eyebrow="Executive Report"
        title={String(report.title ?? "Monthly Report")}
        lead={monthLabel(Number(report.reportingMonth), Number(report.reportingYear))}
        presence
      />
      {html ? (
        <div
          className="kxd-report-portal-embed"
          style={{ borderRadius: "4px", overflow: "hidden", background: "#080808" }}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : (
        <p className="kxd-os-body">Report content is not available.</p>
      )}
    </KxdPage>
  );
}
