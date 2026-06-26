"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { KxdBadge, KxdPage, KxdSection } from "@/components/os";
import { OperationsPageHero } from "@/components/admin/operations/shared/OperationsPageHero";
import { OperationsShell } from "@/components/admin/operations/shared/OperationsShell";
import { monthLabel } from "@/lib/reporting/templates";
import { buildReportDownloadFilename } from "@/lib/reporting/export";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ReportDoc = Record<string, any>;

export function ReportDetailScreen({ report }: { report: ReportDoc }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const kpis = (report.kpis as { label: string; value: string }[]) ?? [];
  const recommendations = report.recommendations as {
    topPriorities?: string[];
    completedWins?: string[];
  } | null;

  async function publish() {
    setBusy(true);
    try {
      await fetch(`/api/admin/reports/${report.id}/publish`, { method: "POST" });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  function downloadHtml() {
    const html = String(report.htmlExport ?? "");
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = buildReportDownloadFilename(report);
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <OperationsShell activeId="reports">
      <KxdPage className="kxd-os-page--ops">
        <OperationsPageHero
          eyebrow="Reporting"
          title={String(report.title ?? "Executive Report")}
          lead={monthLabel(Number(report.reportingMonth), Number(report.reportingYear))}
          presence
        />

        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1.5rem" }}>
          <KxdBadge variant={report.status === "published" ? "success" : "status"}>
            {String(report.status)}
          </KxdBadge>
          {report.status === "ready" ? (
            <button type="button" className="kxd-os-btn" disabled={busy} onClick={publish}>
              Publish to Client HQ
            </button>
          ) : null}
          {report.htmlExport ? (
            <button type="button" className="kxd-os-btn kxd-os-btn--ghost" onClick={downloadHtml}>
              Download HTML
            </button>
          ) : null}
          <Link href="/admin/operations/reports" className="kxd-os-btn kxd-os-btn--ghost">
            All reports
          </Link>
        </div>

        <KxdSection label="Executive Summary">
          <p className="kxd-os-body">{String(report.executiveSummary ?? "")}</p>
        </KxdSection>

        {kpis.length > 0 ? (
          <KxdSection label="KPIs">
            <div className="kxd-os-ops-kpi-grid">
              {kpis.map((k) => (
                <div key={k.label} className="kxd-os-card">
                  <p className="kxd-os-meta">{k.label}</p>
                  <p className="kxd-os-card__title" style={{ marginTop: "0.35rem" }}>{k.value}</p>
                </div>
              ))}
            </div>
          </KxdSection>
        ) : null}

        <KxdSection label="Work Completed">
          <p className="kxd-os-body" style={{ whiteSpace: "pre-wrap" }}>{String(report.workCompleted ?? "")}</p>
        </KxdSection>

        {recommendations?.topPriorities?.length ? (
          <KxdSection label="Top Priorities">
            <ul className="kxd-os-body">
              {recommendations.topPriorities.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </KxdSection>
        ) : null}

        {report.portalHtml ? (
          <KxdSection label="Portal preview">
            <div
              className="kxd-os-card"
              style={{ overflow: "auto", maxHeight: "24rem", background: "#080808" }}
              dangerouslySetInnerHTML={{ __html: String(report.portalHtml).slice(0, 8000) }}
            />
          </KxdSection>
        ) : null}
      </KxdPage>
    </OperationsShell>
  );
}
