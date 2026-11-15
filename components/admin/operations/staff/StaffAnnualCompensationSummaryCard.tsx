"use client";

import { useState } from "react";
import { KxdButton } from "@/components/os";
import { OpsCard, OpsSectionHead } from "@/components/admin/operations/shared/OpsBriefing";
import { formatUsdFromCents } from "@/lib/staff-pay/money";
import type { StaffAnnualCompensationSummary } from "@/lib/staff-pay/compensation-annual-summary-types";

export function StaffAnnualCompensationSummaryCard({
  staffUserId,
  staffLabel,
  onError,
}: {
  staffUserId: number;
  staffLabel: string;
  onError: (text: string) => void;
}) {
  const [taxYear, setTaxYear] = useState(String(new Date().getFullYear()));
  const [summary, setSummary] = useState<StaffAnnualCompensationSummary | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    setBusy(true);
    try {
      const res = await fetch(
        `/api/admin/staff/payroll/compensation-summary?staffUserId=${staffUserId}&taxYear=${taxYear}`,
        { credentials: "same-origin" },
      );
      const data = (await res.json()) as {
        success?: boolean;
        summary?: StaffAnnualCompensationSummary;
        error?: string;
      };
      if (!res.ok || !data.success || !data.summary) {
        throw new Error(data.error ?? "Could not load summary.");
      }
      setSummary(data.summary);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Could not load summary.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <OpsCard>
      <OpsSectionHead label={`Annual compensation summary · ${staffLabel}`} />
      <p className="kxd-os-meta">
        Owner-only reconciliation aid. Includes hourly gross and bonuses. Not a W-2 or payroll filing.
      </p>
      <label className="kxd-os-field">
        <span className="kxd-os-meta">Tax year</span>
        <input className="kxd-os-input" value={taxYear} onChange={(e) => setTaxYear(e.target.value)} />
      </label>
      <div className="kxd-os-staff-time__actions">
        <KxdButton type="button" variant="secondary" disabled={busy} onClick={() => void load()}>
          Load summary
        </KxdButton>
        <KxdButton
          type="button"
          variant="secondary"
          disabled={busy}
          onClick={() => {
            window.location.href = `/api/admin/staff/payroll/compensation-summary?staffUserId=${staffUserId}&taxYear=${taxYear}&format=csv`;
          }}
        >
          Export CSV
        </KxdButton>
      </div>
      {summary ? (
        <ul className="kxd-os-meta" style={{ marginTop: "0.75rem" }}>
          <li>Approved minutes: {summary.approvedMinutes}</li>
          <li>Hourly gross: {formatUsdFromCents(summary.hourlyGrossCents)}</li>
          <li>Bonus gross: {formatUsdFromCents(summary.bonusGrossCents)}</li>
          <li>Total gross compensation: {formatUsdFromCents(summary.totalGrossCompensationCents)}</li>
          <li>Payments made: {formatUsdFromCents(summary.totalPaymentsMadeCents)}</li>
          <li>Outstanding approved: {formatUsdFromCents(summary.outstandingApprovedCompensationCents)}</li>
        </ul>
      ) : null}
    </OpsCard>
  );
}