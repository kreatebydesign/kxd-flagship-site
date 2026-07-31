"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  BRANDED_REPORT_APPROVAL_LABEL,
  REPORT_SCOPE_LABEL,
  type BrandedReportApprovalStatus,
  type BrandedReportArchiveEntry,
  type BrandedReportSnapshot,
  type ReportScopeCapability,
} from "@/lib/reporting/branded-client/types";

type Props = {
  reportId: number;
  clientId: number;
  clientName: string;
  approvalStatus: BrandedReportApprovalStatus;
  version: number;
  periodLabel: string;
  timezone: string;
  snapshot: BrandedReportSnapshot;
  archive: BrandedReportArchiveEntry[];
  initialNarratives: {
    executiveSummary: string;
    websitePerformanceNarrative: string;
    organicSearchNarrative: string;
    googleAdsNarrative: string;
    workCompleted: string;
    improvementsMade: string;
    issuesOrRisks: string;
    recommendations: string;
    augustPriorities: string;
    closingNote: string;
    internalNotes: string;
  };
  includedCapabilities: ReportScopeCapability[];
};

export function BrandedReportWorkspace({
  reportId,
  clientId,
  clientName,
  approvalStatus,
  version,
  periodLabel,
  timezone,
  snapshot,
  archive,
  initialNarratives,
  includedCapabilities,
}: Props) {
  const locked =
    approvalStatus === "approved" ||
    approvalStatus === "ready-for-manual-delivery" ||
    approvalStatus === "archived";
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState(approvalStatus);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [confirmApprove, setConfirmApprove] = useState(false);
  const [fields, setFields] = useState(initialNarratives);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);

  const scopeLabel = useMemo(
    () => includedCapabilities.map((c) => REPORT_SCOPE_LABEL[c]).join(" · "),
    [includedCapabilities],
  );

  function setField(key: keyof typeof fields, value: string) {
    setFields((prev) => ({ ...prev, [key]: value }));
  }

  async function postAction(
    action: string,
    extra: Record<string, unknown> = {},
  ): Promise<{
    success?: boolean;
    error?: string;
    approvalStatus?: BrandedReportApprovalStatus;
    html?: string;
  }> {
    setError(null);
    setMessage(null);
    const res = await fetch(`/api/admin/branded-reports/${reportId}/action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, clientId, ...extra }),
    });
    if (action === "preview") {
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "Preview failed.");
      }
      return { html: await res.text() };
    }
    const data = (await res.json()) as {
      success?: boolean;
      error?: string;
      approvalStatus?: BrandedReportApprovalStatus;
    };
    if (!res.ok || !data.success) {
      throw new Error(data.error ?? "Action failed.");
    }
    return data;
  }

  function save() {
    startTransition(async () => {
      try {
        const data = await postAction("save", fields);
        if (data.approvalStatus) setStatus(data.approvalStatus);
        setMessage("Draft saved.");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Save failed.");
      }
    });
  }

  function submitReview() {
    startTransition(async () => {
      try {
        await postAction("save", fields);
        const data = await postAction("submit-review");
        if (data.approvalStatus) setStatus(data.approvalStatus);
        setMessage("Submitted for review.");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Submit failed.");
      }
    });
  }

  function approve() {
    if (!confirmApprove) {
      setConfirmApprove(true);
      setMessage("Confirm approval to lock an immutable snapshot.");
      return;
    }
    startTransition(async () => {
      try {
        await postAction("save", fields);
        const data = await postAction("approve", { confirm: true });
        if (data.approvalStatus) setStatus(data.approvalStatus);
        setMessage("Report approved. Snapshot is immutable.");
        setConfirmApprove(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Approval failed.");
      }
    });
  }

  function reopen() {
    startTransition(async () => {
      try {
        const data = await postAction("reopen");
        if (data.approvalStatus) setStatus(data.approvalStatus);
        setMessage("Reopened to draft (new revision if previously approved).");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Reopen failed.");
      }
    });
  }

  function preview() {
    startTransition(async () => {
      try {
        const data = await postAction("preview", { includeInternalNotes: false });
        setPreviewHtml(typeof data.html === "string" ? data.html : null);
        setMessage("Preview loaded.");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Preview failed.");
      }
    });
  }

  function downloadPdf() {
    startTransition(async () => {
      try {
        const res = await fetch(
          `/api/admin/branded-reports/${reportId}/pdf?clientId=${clientId}`,
        );
        if (!res.ok) {
          const data = (await res.json()) as { error?: string };
          throw new Error(data.error ?? "PDF failed.");
        }
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `KXD-Monthly-Report-${clientId}-v${version}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
        setStatus("ready-for-manual-delivery");
        setMessage("PDF downloaded for manual delivery. Not marked as emailed.");
      } catch (err) {
        setError(err instanceof Error ? err.message : "PDF download failed.");
      }
    });
  }

  return (
    <div className="kxd-os-page kxd-os-page--ops">
      <nav aria-label="Breadcrumb" style={{ marginBottom: "1rem" }}>
        <Link href="/admin/operations/reports">← Reporting overview</Link>
      </nav>

      <header>
        <p className="kxd-os-eyebrow">Branded monthly report</p>
        <h1 className="kxd-os-h1">{clientName}</h1>
        <p className="kxd-os-lead">
          {periodLabel} · {timezone} · Version {version} ·{" "}
          <strong>{BRANDED_REPORT_APPROVAL_LABEL[status]}</strong>
        </p>
        <p className="kxd-os-muted">Included services: {scopeLabel || "Base website"}</p>
      </header>

      <div role="status" aria-live="polite" style={{ margin: "1rem 0" }}>
        {pending ? <p>Working…</p> : null}
        {message ? <p>{message}</p> : null}
        {error ? (
          <p role="alert" className="kxd-os-error">
            {error}
          </p>
        ) : null}
      </div>

      <div className="kxd-os-portfolio-actions" style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
        <button type="button" className="kxd-os-btn kxd-os-btn--secondary" disabled={pending || locked} onClick={save}>
          Save draft
        </button>
        <button type="button" className="kxd-os-btn kxd-os-btn--secondary" disabled={pending || locked} onClick={submitReview}>
          Mark in review
        </button>
        <button type="button" className="kxd-os-btn kxd-os-btn--primary" disabled={pending || locked} onClick={approve}>
          {confirmApprove ? "Confirm approval" : "Approve"}
        </button>
        <button type="button" className="kxd-os-btn kxd-os-btn--secondary" disabled={pending} onClick={preview}>
          Preview
        </button>
        <button
          type="button"
          className="kxd-os-btn kxd-os-btn--primary"
          disabled={
            pending ||
            (status !== "approved" && status !== "ready-for-manual-delivery")
          }
          onClick={downloadPdf}
        >
          Generate / download PDF
        </button>
        <button type="button" className="kxd-os-btn kxd-os-btn--secondary" disabled={pending || status === "archived"} onClick={reopen}>
          Reopen to draft
        </button>
      </div>

      <section aria-labelledby="freshness-heading" style={{ marginTop: "1.5rem" }}>
        <h2 id="freshness-heading">Data sources & freshness</h2>
        <ul>
          {snapshot.dataSources.map((s) => (
            <li key={s.providerId}>
              <strong>{s.label}</strong> — {s.includedInReport ? "Included" : "Not included"};{" "}
              {s.connected ? "Connected" : "Not connected"}; freshness {s.freshness}.{" "}
              {s.statusNote}
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="metrics-heading">
        <h2 id="metrics-heading">Performance snapshot</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(12rem,1fr))", gap: "0.75rem" }}>
          {snapshot.metrics.map((m) => (
            <div key={m.key} style={{ border: "1px solid var(--kxd-line, #e2d8c8)", padding: "0.75rem" }}>
              <div style={{ fontSize: "0.75rem", textTransform: "uppercase" }}>{m.label}</div>
              <div style={{ fontSize: "1.35rem" }}>{m.displayValue}</div>
              <div style={{ fontSize: "0.8rem", opacity: 0.75 }}>
                {m.percentChangeLabel} · {m.completeness}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="narrative-heading" style={{ marginTop: "1.5rem" }}>
        <h2 id="narrative-heading">Client-facing narrative</h2>
        {(
          [
            ["executiveSummary", "Executive summary"],
            ["websitePerformanceNarrative", "Website performance"],
            ["organicSearchNarrative", "Organic search"],
            ["googleAdsNarrative", "Google Ads"],
            ["workCompleted", "Work completed"],
            ["improvementsMade", "Improvements and wins"],
            ["issuesOrRisks", "Issues or risks"],
            ["recommendations", "Recommendations"],
            ["augustPriorities", "August priorities"],
            ["closingNote", "Closing"],
          ] as const
        ).map(([key, label]) => (
          <label key={key} style={{ display: "block", marginBottom: "1rem" }}>
            <span style={{ display: "block", fontWeight: 600, marginBottom: "0.35rem" }}>
              {label}
            </span>
            <textarea
              value={fields[key]}
              onChange={(e) => setField(key, e.target.value)}
              disabled={locked || pending}
              rows={4}
              style={{ width: "100%", minHeight: "5rem" }}
            />
          </label>
        ))}
        <label style={{ display: "block", marginBottom: "1rem" }}>
          <span style={{ display: "block", fontWeight: 600, marginBottom: "0.35rem" }}>
            Internal notes (excluded from PDF)
          </span>
          <textarea
            value={fields.internalNotes}
            onChange={(e) => setField("internalNotes", e.target.value)}
            disabled={locked || pending}
            rows={3}
            style={{ width: "100%" }}
          />
        </label>
      </section>

      {snapshot.outOfScopeOpportunities.length > 0 ? (
        <section aria-labelledby="oos-heading">
          <h2 id="oos-heading">Out-of-scope opportunities (internal framing)</h2>
          <ul>
            {snapshot.outOfScopeOpportunities.map((o) => (
              <li key={o.capability}>
                <strong>{o.title}</strong> — {o.summary} <em>{o.upgradeFraming}</em>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section aria-labelledby="archive-heading" style={{ marginTop: "1.5rem" }}>
        <h2 id="archive-heading">Archive / history</h2>
        {archive.length === 0 ? (
          <p>No archive entries yet.</p>
        ) : (
          <ul>
            {archive.map((entry) => (
              <li key={`${entry.reportId}-${entry.version}`}>
                {entry.periodLabel} · v{entry.version} ·{" "}
                {BRANDED_REPORT_APPROVAL_LABEL[entry.approvalStatus]}
                {entry.approvedBy ? ` · approved by ${entry.approvedBy}` : ""}
                {entry.pdfAvailable ? " · PDF available" : ""}
                {entry.fingerprint ? ` · ${entry.fingerprint.slice(0, 12)}…` : ""}
                {entry.superseded ? " · superseded" : ""}
              </li>
            ))}
          </ul>
        )}
      </section>

      {previewHtml ? (
        <section aria-labelledby="preview-heading" style={{ marginTop: "1.5rem" }}>
          <h2 id="preview-heading">Preview</h2>
          <iframe
            title="Client report preview"
            srcDoc={previewHtml}
            style={{ width: "100%", minHeight: "70vh", border: "1px solid #e2d8c8" }}
          />
        </section>
      ) : null}
    </div>
  );
}
