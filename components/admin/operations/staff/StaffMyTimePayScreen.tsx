"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { OperationsPageHero } from "@/components/admin/operations/shared/OperationsPageHero";
import { OperationsShell } from "@/components/admin/operations/shared/OperationsShell";
import {
  OpsCard,
  OpsSectionHead,
  OpsStatusBadge,
} from "@/components/admin/operations/shared/OpsBriefing";
import { KxdButton, KxdPage } from "@/components/os";
import type { StaffMyTimePayPageData } from "@/lib/staff-pay/employee-view-types";
import { formatStaffPayMinutesLabel } from "@/lib/staff-pay/format-minutes";
import { formatUsdFromCents } from "@/lib/staff-pay/money";

function formatPacificRange(startIso: string, endIso: string | null): string {
  if (!endIso) return "—";
  try {
    const fmt = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Los_Angeles",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
    return `${fmt.format(new Date(startIso))} – ${fmt.format(new Date(endIso))}`;
  } catch {
    return `${startIso} – ${endIso}`;
  }
}

function reviewBadge(state: string): {
  label: string;
  variant: "default" | "warning" | "success";
} {
  if (state === "payable") return { label: "Payable (external payroll)", variant: "success" };
  if (state === "reviewed") return { label: "Reviewed by owner", variant: "warning" };
  return { label: "Recorded (not reviewed)", variant: "default" };
}

export function StaffMyTimePayScreen({
  initial,
  payRequestsEnabled,
}: {
  initial: StaffMyTimePayPageData;
  payRequestsEnabled: boolean;
}) {
  const [view, setView] = useState(initial);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyShiftId, setBusyShiftId] = useState<number | null>(null);
  const [disputeShiftId, setDisputeShiftId] = useState<number | null>(null);
  const [disputeNote, setDisputeNote] = useState("");
  const [disputeStart, setDisputeStart] = useState("");
  const [disputeEnd, setDisputeEnd] = useState("");
  const [historicalNote, setHistoricalNote] = useState("");
  const [historicalDate, setHistoricalDate] = useState("2026-10-20");

  const verifiedMinutes = useMemo(
    () => view.periods.reduce((s, p) => s + p.verifiedTotalMinutes, 0),
    [view.periods],
  );

  const refresh = useCallback(async () => {
    const res = await fetch("/api/admin/staff/time/my-pay", { credentials: "same-origin" });
    const data = (await res.json()) as {
      success?: boolean;
      view?: StaffMyTimePayPageData;
      error?: string;
    };
    if (!res.ok || !data.success || !data.view) {
      throw new Error(data.error ?? "Could not refresh.");
    }
    setView(data.view);
  }, []);

  async function submitRequest(payload: Record<string, unknown>) {
    setError(null);
    setMessage(null);
    const res = await fetch("/api/admin/staff/time/my-pay/requests", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = (await res.json()) as { success?: boolean; error?: string; disclaimer?: string };
    if (!res.ok || !data.success) {
      throw new Error(data.error ?? "Could not submit.");
    }
    setMessage(data.disclaimer ?? "Submitted for owner review.");
    await refresh();
  }

  async function acknowledgeShift(shiftId: number, localDateKey: string, payPeriodId: number | null) {
    if (!payRequestsEnabled) {
      setError("Acknowledgments require a database update (migration pending).");
      return;
    }
    setBusyShiftId(shiftId);
    try {
      await submitRequest({
        requestKind: "shift_acknowledgment",
        shiftId,
        localDateKey,
        payPeriodId,
        employeeNote: `I reviewed shift #${shiftId} on ${localDateKey} and acknowledge the recorded times.`,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not acknowledge.");
    } finally {
      setBusyShiftId(null);
    }
  }

  async function submitDispute() {
    if (disputeShiftId == null) return;
    const shift = view.periods
      .flatMap((p) => p.daily.flatMap((d) => d.shifts))
      .find((s) => s.shiftId === disputeShiftId);
    if (!shift) return;
    try {
      await submitRequest({
        requestKind: "correction_dispute",
        shiftId: disputeShiftId,
        localDateKey: shift.localDateKey,
        payPeriodId: shift.payPeriodId,
        proposedStartAt: disputeStart.trim() || null,
        proposedEndAt: disputeEnd.trim() || null,
        employeeNote: disputeNote.trim(),
      });
      setDisputeShiftId(null);
      setDisputeNote("");
      setDisputeStart("");
      setDisputeEnd("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit dispute.");
    }
  }

  async function submitHistoricalNote() {
    try {
      await submitRequest({
        requestKind: "historical_backfill",
        localDateKey: historicalDate,
        employeeNote: historicalNote.trim(),
      });
      setHistoricalNote("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit.");
    }
  }

  async function acknowledgeHistoricalTimesheet() {
    if (!payRequestsEnabled) {
      setError("Acknowledgments require a database update (migration pending).");
      return;
    }
    try {
      await submitRequest({
        requestKind: "historical_timesheet_acknowledgment",
        localDateKey: "2026-10-15",
        employeeNote:
          "I reviewed the Oct 15–20, 2026 historical timesheet summary in My Time & Pay (Matt manual records and Time Clock sections).",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not acknowledge timesheet.");
    }
  }

  const historicalTimesheetAcknowledged = view.myRequests.some(
    (r) =>
      r.requestKind === "historical_timesheet_acknowledgment" &&
      (r.status === "submitted" || r.status === "under_review" || r.status === "resolved"),
  );

  return (
    <KxdPage className="kxd-os-page--ops kxd-os-page--staff">
      <OperationsShell activeId="staff" variant="staff">
        <OperationsPageHero
          eyebrow="Staff"
          title="My Time & Pay"
          lead="Review recorded shifts, provisional historical time, and submit corrections. Nothing here approves payroll or records payment."
        />

        <p className="kxd-os-meta" style={{ marginBottom: "1rem" }}>
          <Link href="/admin/operations/staff/time" className="kxd-os-link-quiet">
            Time Clock
          </Link>
          {" · "}
          <Link href="/admin/operations/staff" className="kxd-os-link-quiet">
            Staff home
          </Link>
        </p>

        {!payRequestsEnabled ? (
          <OpsCard>
            <p className="kxd-os-meta">
              Acknowledgments and disputes will be enabled after the owner applies migration{" "}
              <code>20261101_staff_time_pay_requests</code> to your environment. You can still review
              totals below.
            </p>
          </OpsCard>
        ) : null}

        {message ? (
          <p className="kxd-os-meta" style={{ color: "var(--kxd-os-status-success, #2d6a4f)" }}>
            {message}
          </p>
        ) : null}
        {error ? (
          <p className="kxd-os-meta" style={{ color: "var(--kxd-os-status-critical, #b42318)" }}>
            {error}
          </p>
        ) : null}

        <OpsCard>
          <OpsSectionHead label="Summary" />
          <ul className="kxd-os-meta" style={{ lineHeight: 1.6 }}>
            <li>
              <strong>Verified production shifts:</strong> {formatStaffPayMinutesLabel(verifiedMinutes)} ·{" "}
              {formatUsdFromCents(view.summaryTotals.verifiedPreliminaryGrossCents)} preliminary gross
            </li>
            {view.provisionalHistorical ? (
              <li>
                <strong>Owner-approved historical (not Time Clock):</strong>{" "}
                {formatStaffPayMinutesLabel(view.provisionalHistorical.ownerApprovedTotalMinutes)} ·{" "}
                {formatUsdFromCents(view.provisionalHistorical.ownerApprovedPreliminaryGrossCents)} ·{" "}
                unpaid in KXD OS
              </li>
            ) : null}
            {view.summaryTotals.combinedIllustrativeGrossCents != null ? (
              <li>
                <strong>Documented gross:</strong>{" "}
                {formatUsdFromCents(
                  view.wageSettlement?.documentedGrossCents ??
                    view.summaryTotals.documentedGrossSubtotalCents ??
                    view.summaryTotals.combinedIllustrativeGrossCents,
                )}{" "}
                · Time Clock plus owner-approved historical durations
              </li>
            ) : null}
            {view.wageSettlement ? (
              <>
                <li>
                  <strong>Externally settled (recorded in KXD OS):</strong>{" "}
                  {formatUsdFromCents(view.wageSettlement.settledGrossCents)}
                </li>
                <li>
                  <strong>Outstanding gross:</strong>{" "}
                  {formatUsdFromCents(view.wageSettlement.outstandingGrossCents)}
                </li>
              </>
            ) : null}
            <li>{view.grossBeforeTaxDisclaimer}</li>
            <li>{view.paymentRecordedDisclaimer}</li>
          </ul>
          {view.summaryTotals.combinedIllustrativeDisclaimer ? (
            <p className="kxd-os-meta" style={{ marginTop: "0.75rem" }}>
              {view.summaryTotals.combinedIllustrativeDisclaimer}
            </p>
          ) : null}
        </OpsCard>

        {view.provisionalHistorical ? (
          <section style={{ marginTop: "1.5rem" }}>
            <OpsSectionHead label="Owner-approved historical time (not Time Clock)" />
            <OpsCard>
              <p className="kxd-os-meta">{view.provisionalHistorical.disclaimer}</p>
              <ul className="kxd-os-meta" style={{ marginTop: "0.75rem" }}>
                {view.provisionalHistorical.days.map((day) => (
                  <li key={day.localDateKey} style={{ marginBottom: "0.5rem" }}>
                    <strong>{day.localDateKey}</strong> · {day.headline} ·{" "}
                    <OpsStatusBadge
                      label={
                        day.status === "unresolved"
                          ? "Unresolved"
                          : "Owner-approved (unpaid)"
                      }
                      variant={day.status === "unresolved" ? "warning" : "success"}
                    />
                    {day.breakStatus === "owner_confirmed_unpaid" ? (
                      <span> · Break confirmed unpaid</span>
                    ) : day.breakStatus === "pending_verification" ? (
                      <span> · Break pending verification</span>
                    ) : null}
                    {day.reportedMinutes != null
                      ? ` · ${formatStaffPayMinutesLabel(day.reportedMinutes)} owner-approved`
                      : " · minutes not set"}
                    <br />
                    {day.employeeNote}
                  </li>
                ))}
              </ul>
              {payRequestsEnabled ? (
                <div style={{ marginTop: "1rem", display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                  {historicalTimesheetAcknowledged ? (
                    <OpsStatusBadge label="Optional timesheet review submitted" variant="success" />
                  ) : (
                    <KxdButton type="button" variant="secondary" onClick={() => void acknowledgeHistoricalTimesheet()}>
                      Optional: confirm you reviewed historical summary
                    </KxdButton>
                  )}
                </div>
              ) : null}
              {payRequestsEnabled ? (
                <div style={{ marginTop: "1rem" }}>
                  <p className="kxd-os-meta">Propose corrections for historical days (owner approval required).</p>
                  <label className="kxd-os-meta">
                    Date
                    <input
                      className="kxd-os-input"
                      type="date"
                      value={historicalDate}
                      onChange={(e) => setHistoricalDate(e.target.value)}
                    />
                  </label>
                  <label className="kxd-os-meta" style={{ display: "block", marginTop: "0.5rem" }}>
                    Note
                    <textarea
                      className="kxd-os-input"
                      rows={3}
                      value={historicalNote}
                      onChange={(e) => setHistoricalNote(e.target.value)}
                      placeholder="Proposed start/end, breaks, or sick leave context"
                    />
                  </label>
                  <KxdButton
                    type="button"
                    variant="secondary"
                    style={{ marginTop: "0.5rem" }}
                    onClick={() => void submitHistoricalNote()}
                  >
                    Submit historical note
                  </KxdButton>
                </div>
              ) : null}
            </OpsCard>
          </section>
        ) : null}

        <section style={{ marginTop: "1.5rem" }}>
          <OpsSectionHead label="Oct 21 reconciliation (manual note vs Time Clock)" />
          <OpsCard>
            <p className="kxd-os-meta">{view.oct21Reconciliation.verdict}</p>
            <p className="kxd-os-meta" style={{ marginTop: "0.5rem" }}>
              Manual note: {view.oct21Reconciliation.ownerManualSpanLabel} (
              {formatStaffPayMinutesLabel(view.oct21Reconciliation.ownerManualGrossSpanMinutes)} gross span, not
              auto-paid). Production clock:{" "}
              {formatStaffPayMinutesLabel(view.oct21Reconciliation.productionTotalMinutes)} payable ·{" "}
              {formatUsdFromCents(view.oct21Reconciliation.productionPreliminaryGrossCents)} · gap between shifts
              ~{view.oct21Reconciliation.gapBetweenShiftsMinutes} minutes.
            </p>
          </OpsCard>
        </section>

        <section style={{ marginTop: "1.5rem" }}>
          <OpsSectionHead label="Documented activity outside clock (not hours)" />
          <OpsCard>
            <p className="kxd-os-meta">
              These events are listed for review only. KXD OS does not convert them to payable time.
            </p>
            <ul className="kxd-os-meta" style={{ marginTop: "0.75rem" }}>
              {view.documentedOutsideClockEvents.map((ev) => (
                <li key={`${ev.localDateKey}-${ev.evidenceRef}`} style={{ marginBottom: "0.5rem" }}>
                  <strong>{ev.localDateKey}</strong> · {ev.occurredAtPacific} · {ev.source}: {ev.action}
                  <br />
                  {ev.evidenceRef}. {ev.note}
                </li>
              ))}
            </ul>
          </OpsCard>
        </section>

        {view.periods.map((period) => {
          const badge = reviewBadge(period.reviewWorkflowState);
          return (
            <section key={period.period.id} style={{ marginTop: "1.5rem" }}>
              <OpsSectionHead label={period.period.label} />
              <OpsCard>
                <p className="kxd-os-meta">
                  Scheduled payday {period.scheduledPayday} · {period.paymentStatusLabel} ·{" "}
                  <OpsStatusBadge label={badge.label} variant={badge.variant} />
                </p>
                <p className="kxd-os-meta">
                  Verified this period: {formatStaffPayMinutesLabel(period.verifiedTotalMinutes)} ·{" "}
                  {formatUsdFromCents(period.verifiedPreliminaryGrossCents)} ·{" "}
                  {period.verifiedShiftCount} shift(s)
                </p>
                {period.periodOpenNote ? (
                  <p className="kxd-os-meta">{period.periodOpenNote}</p>
                ) : null}

                {period.daily.map((day) => (
                  <div key={day.localDateKey} style={{ marginTop: "1rem" }}>
                    <p className="kxd-os-ops-list-row__title">{day.localDateKey}</p>
                    {day.shifts.map((shift) => (
                      <div
                        key={shift.shiftId}
                        className="kxd-os-meta"
                        style={{
                          borderTop: "1px solid var(--kxd-os-border-subtle, #eee)",
                          paddingTop: "0.5rem",
                          marginTop: "0.5rem",
                        }}
                      >
                        <p>
                          Shift #{shift.shiftId} · {formatPacificRange(shift.startedAt, shift.endedAt)} PT
                          · {formatStaffPayMinutesLabel(shift.minutes)} ·{" "}
                          {formatUsdFromCents(shift.preliminaryGrossCents)}
                          {shift.hasCorrectionAudit ? " · operator corrected" : ""}
                        </p>
                        <p>
                          {shift.employeeAcknowledged ? (
                            <OpsStatusBadge label="You acknowledged" variant="success" />
                          ) : (
                            <KxdButton
                              type="button"
                              variant="secondary"
                              disabled={busyShiftId === shift.shiftId}
                              onClick={() =>
                                void acknowledgeShift(
                                  shift.shiftId,
                                  shift.localDateKey,
                                  shift.payPeriodId,
                                )
                              }
                            >
                              Acknowledge shift
                            </KxdButton>
                          )}{" "}
                          {shift.openDisputeRequestId ? (
                            <OpsStatusBadge label="Dispute open" variant="warning" />
                          ) : (
                            <KxdButton
                              type="button"
                              variant="ghost"
                              onClick={() => {
                                setDisputeShiftId(shift.shiftId);
                                setDisputeNote("");
                              }}
                            >
                              Dispute / propose correction
                            </KxdButton>
                          )}
                        </p>
                      </div>
                    ))}
                  </div>
                ))}
              </OpsCard>
            </section>
          );
        })}

        {disputeShiftId != null ? (
          <div style={{ marginTop: "1.5rem" }}>
          <OpsCard>
            <OpsSectionHead label={`Dispute shift #${disputeShiftId}`} />
            <p className="kxd-os-meta">
              Proposed times optional (ISO or datetime-local). Owner must approve before payroll changes.
            </p>
            <textarea
              className="kxd-os-input"
              rows={3}
              value={disputeNote}
              onChange={(e) => setDisputeNote(e.target.value)}
              placeholder="Explain the correction you are requesting"
            />
            <input
              className="kxd-os-input"
              placeholder="Proposed start (optional)"
              value={disputeStart}
              onChange={(e) => setDisputeStart(e.target.value)}
            />
            <input
              className="kxd-os-input"
              placeholder="Proposed end (optional)"
              value={disputeEnd}
              onChange={(e) => setDisputeEnd(e.target.value)}
            />
            <KxdButton type="button" onClick={() => void submitDispute()}>
              Submit dispute
            </KxdButton>
            <KxdButton type="button" variant="ghost" onClick={() => setDisputeShiftId(null)}>
              Cancel
            </KxdButton>
          </OpsCard>
          </div>
        ) : null}

        <p className="kxd-os-meta" style={{ marginTop: "1.5rem" }}>
          {view.preliminaryDisclaimer}
        </p>
      </OperationsShell>
    </KxdPage>
  );
}
