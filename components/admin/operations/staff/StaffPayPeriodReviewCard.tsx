"use client";

/* eslint-disable react-hooks/set-state-in-effect -- async founder payroll review fetches */
import { useCallback, useEffect, useState } from "react";
import { KxdButton } from "@/components/os";
import { OpsCard, OpsSectionHead, OpsStatusBadge } from "@/components/admin/operations/shared/OpsBriefing";
import type { PayPeriodListItem, PayPeriodReviewPayload } from "@/lib/staff-pay/types";
import { formatUsdFromCents } from "@/lib/staff-pay/money";
import { hasBlockingPayPeriodExceptions } from "@/lib/staff-pay/exceptions";

function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}m`;
}

function stateBadge(state: string): { label: string; variant: "default" | "warning" | "success" } {
  if (state === "payable") return { label: "Payable (external payroll)", variant: "success" };
  if (state === "reviewed") return { label: "Reviewed", variant: "warning" };
  return { label: "Recorded", variant: "default" };
}

export function StaffPayPeriodReviewCard({
  onMessage,
  onError,
}: {
  onMessage: (text: string) => void;
  onError: (text: string) => void;
}) {
  const [periods, setPeriods] = useState<PayPeriodListItem[]>([]);
  const [periodId, setPeriodId] = useState<string>("");
  const [review, setReview] = useState<PayPeriodReviewPayload | null>(null);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<"reviewed" | "payable" | null>(null);

  const loadPeriods = useCallback(async () => {
    const res = await fetch("/api/admin/staff/payroll/periods");
    const data = (await res.json()) as {
      success?: boolean;
      periods?: PayPeriodListItem[];
      error?: string;
    };
    if (!res.ok || !data.success || !data.periods) {
      throw new Error(data.error ?? "Could not load pay periods.");
    }
    setPeriods(data.periods);
    if (!periodId && data.periods.length > 0) {
      const current =
        data.periods.find((p) => p.workflowState !== "payable") ??
        data.periods[data.periods.length - 1];
      setPeriodId(String(current?.id ?? data.periods[0].id));
    }
  }, [periodId]);

  const loadReview = useCallback(
    async (id: string) => {
      if (!id) return;
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/staff/payroll/periods/${id}/review`);
        const data = (await res.json()) as {
          success?: boolean;
          review?: PayPeriodReviewPayload;
          error?: string;
        };
        if (!res.ok || !data.success || !data.review) {
          throw new Error(data.error ?? "Could not load pay period review.");
        }
        setReview(data.review);
      } catch (err) {
        onError(err instanceof Error ? err.message : "Could not load review.");
        setReview(null);
      } finally {
        setLoading(false);
      }
    },
    [onError],
  );

  useEffect(() => {
    loadPeriods().catch((err) => {
      onError(err instanceof Error ? err.message : "Could not load pay periods.");
    });
  }, [loadPeriods, onError]);

  useEffect(() => {
    if (!periodId) return;
    void loadReview(periodId);
  }, [periodId, loadReview]);

  async function acknowledge(targetState: "reviewed" | "payable") {
    if (!periodId) return;
    setBusy(targetState);
    try {
      const res = await fetch(
        `/api/admin/staff/payroll/periods/${periodId}/review/acknowledge`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ targetState, note: note.trim() || null }),
        },
      );
      const data = (await res.json()) as {
        success?: boolean;
        review?: PayPeriodReviewPayload;
        error?: string;
      };
      if (!res.ok || !data.success || !data.review) {
        throw new Error(data.error ?? "Could not update review status.");
      }
      setReview(data.review);
      setNote("");
      onMessage(
        targetState === "reviewed"
          ? "Pay period marked reviewed (not a payment)."
          : "Pay period marked payable for external payroll processing.",
      );
      await loadPeriods();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Could not acknowledge review.");
    } finally {
      setBusy(null);
    }
  }

  const badge = review ? stateBadge(review.review.workflowState) : null;
  const blockingExceptions = review
    ? hasBlockingPayPeriodExceptions([
        ...review.periodExceptions,
        ...review.employees.flatMap((e) => e.exceptions),
      ])
    : false;

  return (
    <section style={{ marginTop: "1.5rem" }} aria-label="Pay period review">
      <OpsSectionHead label="Pay period review & export" />
      <OpsCard className="kxd-os-ops-card-padding">
        <p className="kxd-os-meta" style={{ marginBottom: "0.75rem" }}>
          Founder-only preliminary totals from recorded shifts. Review acknowledgment is not payroll
          payment.
        </p>
        <label className="kxd-os-meta" style={{ display: "block", marginBottom: "0.75rem" }}>
          Pay period
          <select
            className="kxd-os-input"
            style={{ display: "block", width: "100%", marginTop: "0.35rem" }}
            value={periodId}
            onChange={(e) => setPeriodId(e.target.value)}
          >
            {periods.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label} · payday {p.payday} · {p.workflowState}
              </option>
            ))}
          </select>
        </label>

        {loading ? <p className="kxd-os-meta">Loading period review…</p> : null}

        {review ? (
          <>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "0.75rem",
                alignItems: "center",
                marginBottom: "0.75rem",
              }}
            >
              {badge ? (
                <OpsStatusBadge label={badge.label} variant={badge.variant} />
              ) : null}
              <span className="kxd-os-meta">
                {review.period.periodStart} → {review.period.periodEnd} · Payday{" "}
                {review.period.payday}
              </span>
              {review.review.reviewedByLabel ? (
                <span className="kxd-os-meta">
                  Last review: {review.review.reviewedByLabel}
                  {review.review.reviewedAt
                    ? ` · ${new Date(review.review.reviewedAt).toLocaleString()}`
                    : ""}
                </span>
              ) : null}
            </div>

            <p className="kxd-os-meta" style={{ marginBottom: "0.5rem" }}>
              {review.preliminaryDisclaimer}
            </p>
            <p className="kxd-os-meta" style={{ marginBottom: "1rem" }}>
              {review.missingDayDisclaimer}
            </p>

            {!review.review.reviewMatchesCurrentData &&
            review.review.workflowState !== "recorded" ? (
              <p className="kxd-os-meta" style={{ marginBottom: "1rem", color: "var(--kxd-warning, #c9a227)" }}>
                Prior review was superseded by shift, rate, or correction changes — acknowledge review
                again before export readiness.
              </p>
            ) : null}

            {review.periodExceptions.length > 0 ? (
              <div
                className="kxd-os-meta"
                style={{
                  marginBottom: "1rem",
                  padding: "0.75rem",
                  border: "1px solid var(--kxd-border-subtle, #333)",
                  borderRadius: "6px",
                }}
              >
                <strong>Period exceptions</strong>
                <ul style={{ margin: "0.5rem 0 0", paddingLeft: "1.25rem" }}>
                  {review.periodExceptions.map((ex) => (
                    <li key={ex.message}>{ex.message}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {review.employees.map((employee) => (
              <div
                key={employee.staffUserId}
                style={{
                  marginBottom: "1.25rem",
                  paddingBottom: "1rem",
                  borderBottom: "1px solid var(--kxd-border-subtle, #2a2a2a)",
                }}
              >
                <p className="kxd-os-ops-list-row__title">{employee.displayName}</p>
                <p className="kxd-os-meta">
                  {formatMinutes(employee.totalMinutes)} · Preliminary straight-time{" "}
                  {formatUsdFromCents(employee.preliminaryStraightTimeGrossCents)} ·{" "}
                  {employee.shiftCount} completed shift(s)
                </p>
                {employee.workweekOvertimeWarnings.length > 0 ? (
                  <ul className="kxd-os-meta" style={{ paddingLeft: "1.25rem" }}>
                    {employee.workweekOvertimeWarnings.map((w) => (
                      <li key={w.workweekStart}>
                        Workweek {w.workweekStart}–{w.workweekEnd}: {formatMinutes(w.totalMinutes)}{" "}
                        (limit {formatMinutes(w.weeklyLimitMinutes)}) — overtime review required;
                        not included in straight-time gross.
                      </li>
                    ))}
                  </ul>
                ) : null}
                {employee.missingOrUnverifiedDateKeys.length > 0 ? (
                  <p className="kxd-os-meta" style={{ color: "var(--kxd-warning, #c9a227)" }}>
                    Review prompt — no recorded time on:{" "}
                    {employee.missingOrUnverifiedDateKeys.join(", ")}
                  </p>
                ) : null}
                {employee.exceptions.length > 0 ? (
                  <ul className="kxd-os-meta" style={{ paddingLeft: "1.25rem" }}>
                    {employee.exceptions.map((ex) => (
                      <li key={`${ex.kind}-${ex.message}`}>{ex.message}</li>
                    ))}
                  </ul>
                ) : null}
                {employee.daily.map((day) => (
                  <div key={day.localDateKey} style={{ marginTop: "0.5rem" }}>
                    <p className="kxd-os-meta">
                      <strong>{day.localDateKey}</strong> · {formatMinutes(day.minutes)} ·{" "}
                      {formatUsdFromCents(day.preliminaryGrossCents)}
                    </p>
                    <ul className="kxd-os-meta" style={{ paddingLeft: "1.25rem" }}>
                      {day.shifts.map((shift) => (
                        <li key={shift.shiftId}>
                          Shift #{shift.shiftId} · {shift.status} ·{" "}
                          {formatMinutes(shift.minutes)} @{" "}
                          {formatUsdFromCents(shift.hourlyRateCents)}/hr →{" "}
                          {formatUsdFromCents(shift.preliminaryGrossCents)}
                          {shift.hasCorrectionAudit ? " · corrected" : ""}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            ))}

            <label className="kxd-os-meta" style={{ display: "block", marginBottom: "0.75rem" }}>
              Review note (optional)
              <textarea
                className="kxd-os-input"
                style={{ display: "block", width: "100%", minHeight: "3rem", marginTop: "0.35rem" }}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Internal note for audit trail…"
              />
            </label>

            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
              <KxdButton
                type="button"
                size="sm"
                loading={busy === "reviewed"}
                disabled={review.review.workflowState === "payable"}
                onClick={() => acknowledge("reviewed")}
              >
                Acknowledge review
              </KxdButton>
              <KxdButton
                type="button"
                size="sm"
                variant="ghost"
                loading={busy === "payable"}
                disabled={
                  review.review.workflowState !== "reviewed" ||
                  blockingExceptions ||
                  !review.review.reviewMatchesCurrentData
                }
                onClick={() => acknowledge("payable")}
              >
                Mark payable (external — not paid)
              </KxdButton>
              <KxdButton
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => {
                  window.location.href = `/api/admin/staff/payroll/periods/${periodId}/export`;
                }}
              >
                Export CSV
              </KxdButton>
            </div>
          </>
        ) : null}
      </OpsCard>
    </section>
  );
}
