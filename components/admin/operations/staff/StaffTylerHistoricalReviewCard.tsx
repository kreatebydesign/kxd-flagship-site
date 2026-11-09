"use client";

import { useCallback, useEffect, useState } from "react";
import { OpsCard, OpsSectionHead, OpsStatusBadge } from "@/components/admin/operations/shared/OpsBriefing";
import { KxdButton } from "@/components/os";
import type { TylerHistoricalOwnerReviewPayload } from "@/lib/staff-pay/tyler-october-historical-reference";
import { formatUsdFromCents } from "@/lib/staff-pay/money";

export function StaffTylerHistoricalReviewCard({
  onError,
}: {
  onError: (text: string) => void;
}) {
  const [review, setReview] = useState<TylerHistoricalOwnerReviewPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [applyBusy, setApplyBusy] = useState(false);
  const [applyMessage, setApplyMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/staff/payroll/historical-reference", {
        credentials: "same-origin",
      });
      const data = (await res.json()) as {
        success?: boolean;
        review?: TylerHistoricalOwnerReviewPayload;
        error?: string;
      };
      if (!res.ok || !data.success || !data.review) {
        throw new Error(data.error ?? "Could not load historical reference.");
      }
      setReview(data.review);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Could not load historical reference.");
      setReview(null);
    } finally {
      setLoading(false);
    }
  }, [onError]);

  useEffect(() => {
    void load();
  }, [load]);

  async function recordApprovedDurations() {
    setApplyBusy(true);
    setApplyMessage(null);
    try {
      const res = await fetch("/api/admin/staff/payroll/historical-entries/apply-tyler", {
        method: "POST",
        credentials: "same-origin",
      });
      const data = (await res.json()) as {
        success?: boolean;
        error?: string;
        disclaimer?: string;
        inserted?: number;
        existing?: number;
      };
      if (!res.ok || !data.success) {
        throw new Error(data.error ?? "Could not record historical durations.");
      }
      setApplyMessage(
        data.disclaimer ??
          `Recorded ${data.inserted ?? 0} new duration row(s); ${data.existing ?? 0} already on file.`,
      );
    } catch (err) {
      onError(err instanceof Error ? err.message : "Could not record historical durations.");
    } finally {
      setApplyBusy(false);
    }
  }

  if (loading) {
    return (
      <OpsCard>
        <p className="kxd-os-meta">Loading Tyler historical reference…</p>
      </OpsCard>
    );
  }

  if (!review) return null;

  return (
    <OpsCard>
      <OpsSectionHead label="Tyler Rethwill · historical time (owner reference)" />
      <p className="kxd-os-meta">
        {review.windowLabel} · {review.hourlyRateLabel} · production shifts unchanged ·{" "}
        {review.october15Through29Unapproved.disclaimer}
      </p>
      <ul className="kxd-os-meta" style={{ lineHeight: 1.6, marginTop: "0.75rem" }}>
        <li>
          <strong>Verified Time Clock through Oct 29:</strong> {review.verifiedThroughOct29.shiftCount}{" "}
          shifts · {review.verifiedThroughOct29.minutesLabel} ·{" "}
          {review.verifiedThroughOct29.grossLabel} preliminary gross
        </li>
        <li>
          <strong>Owner-approved historical (Oct 15–20, manual records):</strong>{" "}
          {review.historicalOct15Through20.minutesLabel} ·{" "}
          {review.historicalOct15Through20.grossLabel} · unpaid · duration ledger only
        </li>
        <li>
          <strong>Oct 15–29 unapproved documented subtotal:</strong>{" "}
          {review.october15Through29Unapproved.grossLabel}
        </li>
      </ul>
      {review.historicalOct15Through20.unresolvedLocalDateKeys.length > 0 ? (
        <p className="kxd-os-meta" style={{ marginTop: "0.75rem" }}>
          Unresolved:{" "}
          {review.historicalOct15Through20.unresolvedLocalDateKeys.join(", ")} (excluded from historical
          minutes total)
        </p>
      ) : null}
      <div style={{ marginTop: "0.75rem", display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
        <KxdButton type="button" disabled={applyBusy} onClick={() => void recordApprovedDurations()}>
          Record owner-approved durations (Oct 15–20)
        </KxdButton>
      </div>
      {applyMessage ? (
        <p className="kxd-os-meta" style={{ marginTop: "0.5rem" }}>
          {applyMessage}
        </p>
      ) : null}
      <ul className="kxd-os-meta" style={{ marginTop: "0.75rem" }}>
        {review.historicalOct15Through20.days.map((day) => (
          <li key={day.localDateKey} style={{ marginBottom: "0.65rem" }}>
            <strong>{day.localDateKey}</strong> · {day.headline}{" "}
            <OpsStatusBadge
              label={day.status === "unresolved" ? "Unresolved" : "Owner-approved (unpaid)"}
              variant={day.status === "unresolved" ? "warning" : "success"}
            />
            {day.breakStatus === "owner_confirmed_unpaid" ? (
              <span> · Break owner-confirmed unpaid ({day.unpaidBreakMinutes} min)</span>
            ) : null}
            {day.netReportedMinutes != null ? ` · ${day.netReportedMinutes} min net` : " · no approved minutes"}
            {day.proposedCorrection ? (
              <span>
                {" "}
                · proposed {day.proposedCorrection.proposedMinutes} min (
                {formatUsdFromCents(day.proposedCorrection.preliminaryGrossCents)} gross):{" "}
                {day.proposedCorrection.intervalLabel}
              </span>
            ) : null}
            <br />
            {day.employeeNote}
            {day.auditTrail.length > 0 ? (
              <details style={{ marginTop: "0.35rem" }}>
                <summary className="kxd-os-link-quiet">Audit trail</summary>
                <ul>
                  {day.auditTrail.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </details>
            ) : null}
          </li>
        ))}
      </ul>
    </OpsCard>
  );
}
