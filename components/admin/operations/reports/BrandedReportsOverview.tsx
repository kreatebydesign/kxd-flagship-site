"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  BRANDED_REPORT_APPROVAL_LABEL,
  REPORT_SCOPE_LABEL,
  type BrandedReportOverviewRow,
} from "@/lib/reporting/branded-client/types";
import type { BrandedReportPeriod } from "@/lib/reporting/branded-client/types";

export function BrandedReportsOverview({
  period,
  rows,
}: {
  period: BrandedReportPeriod;
  rows: BrandedReportOverviewRow[];
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function generate(clientId: number) {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/branded-reports/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clientId,
            year: period.year,
            month: period.month,
            startDay: 1,
            endDay: period.isControlledJuly2026 ? 30 : undefined,
            timezone: period.timezone,
            operatorCapabilities: ["base-website"],
          }),
        });
        const data = (await res.json()) as {
          success?: boolean;
          error?: string;
          reportId?: number;
        };
        if (!res.ok || !data.success) {
          setError(data.error ?? "Failed to generate draft report.");
          return;
        }
        setMessage(`Draft report created (id ${data.reportId}).`);
        if (data.reportId) {
          window.location.href = `/admin/operations/reports/branded/${data.reportId}?clientId=${clientId}`;
        }
      } catch {
        setError("Failed to generate draft report.");
      }
    });
  }

  return (
    <section
      className="kxd-os-section"
      aria-labelledby="branded-july-reports-heading"
      style={{ marginTop: "2rem" }}
    >
      <div className="kxd-os-ops-section-head">
        <div>
          <p className="kxd-os-eyebrow">July 2026 · Approval-first</p>
          <h2 id="branded-july-reports-heading" className="kxd-os-h2">
            Branded client reports
          </h2>
          <p className="kxd-os-lead">
            Reporting period <strong>{period.label}</strong> · Timezone{" "}
            <strong>{period.timezone}</strong>. Manual delivery only — reports are
            never emailed automatically in this release.
          </p>
          {period.excludesFinalDayNote ? (
            <p className="kxd-os-muted" role="note">
              {period.excludesFinalDayNote}
            </p>
          ) : null}
        </div>
      </div>

      <div role="status" aria-live="polite">
        {pending ? <p className="kxd-os-muted">Working…</p> : null}
        {message ? <p className="kxd-os-success">{message}</p> : null}
        {error ? (
          <p className="kxd-os-error" role="alert">
            {error}
          </p>
        ) : null}
      </div>

      {rows.length === 0 ? (
        <p className="kxd-os-muted">No clients found in this environment.</p>
      ) : (
        <div className="kxd-os-table-wrap" style={{ overflowX: "auto" }}>
          <table className="kxd-os-table">
            <thead>
              <tr>
                <th scope="col">Client</th>
                <th scope="col">Status</th>
                <th scope="col">Scope</th>
                <th scope="col">Sources</th>
                <th scope="col">Freshness</th>
                <th scope="col">Delivery</th>
                <th scope="col">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.clientId}>
                  <td>
                    <strong>{row.clientName}</strong>
                    {row.warnings.length > 0 ? (
                      <div className="kxd-os-muted" style={{ fontSize: "0.8rem" }}>
                        {row.warnings[0]}
                      </div>
                    ) : null}
                  </td>
                  <td>
                    {row.approvalStatus === "none"
                      ? "Not started"
                      : BRANDED_REPORT_APPROVAL_LABEL[row.approvalStatus]}
                  </td>
                  <td>
                    {row.includedCapabilities
                      .map((c) => REPORT_SCOPE_LABEL[c])
                      .join(", ") || "—"}
                  </td>
                  <td>
                    <div>Available: {row.availableSources.join(", ") || "None"}</div>
                    <div className="kxd-os-muted">
                      Missing: {row.missingSources.join(", ") || "—"}
                    </div>
                  </td>
                  <td>{row.freshness}</td>
                  <td>
                    {row.deliveryStatus === "ready-for-manual-delivery"
                      ? "Ready for manual delivery"
                      : "Not emailed"}
                  </td>
                  <td>
                    {row.reportId ? (
                      <Link
                        className="kxd-os-btn kxd-os-btn--secondary"
                        href={`/admin/operations/reports/branded/${row.reportId}?clientId=${row.clientId}`}
                      >
                        Open
                      </Link>
                    ) : (
                      <button
                        type="button"
                        className="kxd-os-btn kxd-os-btn--primary"
                        disabled={pending || row.action === "blocked"}
                        onClick={() => generate(row.clientId)}
                      >
                        Generate July draft
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
