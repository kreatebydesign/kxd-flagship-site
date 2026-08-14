"use client";

import { useEffect } from "react";
import Link from "next/link";
import { KxdPage } from "@/components/os";
import { AuditDeliverableReport } from "./AuditDeliverableReport";
import { monthLabel } from "@/lib/reporting/templates";
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

  const auditDeliverable = report.auditDeliverable;
  const sourceHtml = auditDeliverable ? "" : resolvePortalReportHtmlSource(report);
  const embedHtml = auditDeliverable
    ? ""
    : sourceHtml
      ? preparePortalReportEmbedHtml(sourceHtml)
      : "";

  if (auditDeliverable) {
    return (
      <KxdPage className="kxd-os-page--ops">
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1rem" }}>
          <Link href="/portal/reports" className="kxd-ces-btn kxd-ces-btn--ghost">
            ← All reports
          </Link>
        </div>
        <AuditDeliverableReport
          model={auditDeliverable}
          pdfHref={`/api/portal/reports/${report.id}/pdf`}
        />
      </KxdPage>
    );
  }

  return (
    <KxdPage className="kxd-os-page--ops">
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1rem" }}>
        <Link href="/portal/reports" className="kxd-os-btn kxd-os-btn--ghost">
          ← All reports
        </Link>
      </div>
      <div style={{ marginBottom: "1rem" }}>
        <p className="kxd-os-eyebrow">Executive Report</p>
        <h1 className="kxd-os-page-title">{report.title}</h1>
        <p className="kxd-os-lead">{monthLabel(report.reportingMonth, report.reportingYear)}</p>
      </div>
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
