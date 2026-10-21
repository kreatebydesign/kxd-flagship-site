"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { OperationsPageHero } from "@/components/admin/operations/shared/OperationsPageHero";
import { OperationsShell } from "@/components/admin/operations/shared/OperationsShell";
import {
  OpsCard,
  OpsEmpty,
  OpsListRow,
  OpsSectionHead,
  OpsStatusBadge,
} from "@/components/admin/operations/shared/OpsBriefing";
import { KxdButton, KxdPage } from "@/components/os";
import type { StaffTimeClockPageData } from "@/lib/staff-time/load";
import type { StaffWorkIntentCategory } from "@/lib/staff-time/types";
import { staffWorkIntentLabel } from "@/lib/staff-time/intent";

function formatMinutes(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h <= 0) return `${m}m`;
  return `${h}h ${m}m`;
}

function formatStamp(iso: string, timeZone: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone,
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

const INTENT_OPTIONS: { value: StaffWorkIntentCategory; label: string }[] = [
  { value: "assigned_kxd_work", label: "Assigned KXD work" },
  { value: "client_project", label: "Client project" },
  { value: "meeting", label: "Meeting" },
  { value: "training", label: "Training" },
  { value: "internal_operations", label: "Internal operations" },
  { value: "other_authorized", label: "Other authorized work" },
];

export function StaffTimeClockScreen({ initial }: { initial: StaffTimeClockPageData }) {
  const [data, setData] = useState(initial);
  const [category, setCategory] = useState<StaffWorkIntentCategory>("internal_operations");
  const [workId, setWorkId] = useState("");
  const [clientId, setClientId] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<"start" | "end" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const active = data.activeShift;

  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => setNowMs(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, [active]);

  const elapsedLabel = useMemo(() => {
    if (!active) return null;
    const start = new Date(active.startedAt).getTime();
    const minutes = Math.max(0, Math.floor((nowMs - start) / 60_000));
    return formatMinutes(minutes);
  }, [active, nowMs]);

  const refresh = useCallback(async () => {
    const [currentRes, historyRes] = await Promise.all([
      fetch("/api/admin/staff/time/shift/current", { credentials: "same-origin" }),
      fetch("/api/admin/staff/time/shift/history?limit=20", { credentials: "same-origin" }),
    ]);
    const currentJson = (await currentRes.json()) as {
      success?: boolean;
      shift?: StaffTimeClockPageData["activeShift"];
    };
    const historyJson = (await historyRes.json()) as {
      success?: boolean;
      history?: StaffTimeClockPageData["history"];
    };
    setData((prev) => ({
      ...prev,
      activeShift: currentJson.shift ?? null,
      history: historyJson.history ?? prev.history,
    }));
  }, []);

  async function startShift() {
    setError(null);
    setBusy("start");
    try {
      const workIntent: Record<string, unknown> = { category };
      if (category === "assigned_kxd_work") workIntent.workId = Number(workId);
      if (category === "client_project") workIntent.clientId = Number(clientId);
      if (category === "other_authorized") workIntent.note = note.trim();

      const res = await fetch("/api/admin/staff/time/shift/start", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": `start-${Date.now()}`,
        },
        body: JSON.stringify({ workIntent }),
      });
      const payload = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || !payload.success) {
        throw new Error(payload.error ?? "Could not start shift.");
      }
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start shift.");
    } finally {
      setBusy(null);
    }
  }

  async function endShift() {
    setError(null);
    setBusy("end");
    try {
      const res = await fetch("/api/admin/staff/time/shift/end", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Idempotency-Key": `end-${Date.now()}`,
        },
      });
      const payload = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || !payload.success) {
        throw new Error(payload.error ?? "Could not end shift.");
      }
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not end shift.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <OperationsShell activeId="staff-time" variant="staff">
      <KxdPage className="kxd-os-page--ops kxd-os-page--staff kxd-os-page--staff-time">
        <OperationsPageHero
          eyebrow="Staff"
          title="Time clock"
          lead="Server-recorded shift time. Your punches stay on the record — approvals never erase worked hours."
        />

        {error ? (
          <div className="kxd-os-staff-time__error" role="alert">
            <p className="kxd-os-staff-time__error-title">Could not save your punch</p>
            <p className="kxd-os-meta">{error}</p>
          </div>
        ) : null}

        <section className="kxd-os-staff-time__section" aria-label="Current shift">
          <OpsSectionHead label="Current shift" />
          <OpsCard>
            {active ? (
              <div className="kxd-os-staff-time__active">
                <div className="kxd-os-staff-time__active-head">
                  <OpsStatusBadge label="On the clock" variant="success" />
                  <p className="kxd-os-staff-time__elapsed">Elapsed {elapsedLabel}</p>
                </div>
                <p className="kxd-os-ops-list-row__title">
                  {staffWorkIntentLabel(active.workIntent.category)}
                </p>
                <p className="kxd-os-meta">
                  Started {formatStamp(active.startedAt, data.workTimezone)} ({data.workTimezone})
                </p>
                <div className="kxd-os-staff-time__actions">
                  <KxdButton
                    type="button"
                    variant="primary"
                    disabled={busy !== null}
                    onClick={() => void endShift()}
                  >
                    {busy === "end" ? "Ending…" : "End shift"}
                  </KxdButton>
                </div>
              </div>
            ) : (
              <div className="kxd-os-staff-time__start">
                <p className="kxd-os-staff-time__intro">
                  Choose what you are working on, then start your shift.
                </p>
                <div className="kxd-os-staff-time__form">
                  <label className="kxd-os-field">
                    <span className="kxd-os-label">Work intent</span>
                    <select
                      className="kxd-os-select"
                      value={category}
                      onChange={(e) => setCategory(e.target.value as StaffWorkIntentCategory)}
                    >
                      {INTENT_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </label>

                  {category === "assigned_kxd_work" ? (
                    <label className="kxd-os-field">
                      <span className="kxd-os-label">Work item ID</span>
                      <input
                        className="kxd-os-input"
                        inputMode="numeric"
                        value={workId}
                        onChange={(e) => setWorkId(e.target.value)}
                        placeholder="e.g. 42"
                      />
                    </label>
                  ) : null}

                  {category === "client_project" ? (
                    <label className="kxd-os-field">
                      <span className="kxd-os-label">Client ID</span>
                      <input
                        className="kxd-os-input"
                        inputMode="numeric"
                        value={clientId}
                        onChange={(e) => setClientId(e.target.value)}
                        placeholder="Assigned client"
                      />
                    </label>
                  ) : null}

                  {category === "other_authorized" ? (
                    <label className="kxd-os-field">
                      <span className="kxd-os-label">Brief note</span>
                      <textarea
                        className="kxd-os-textarea"
                        rows={3}
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Describe the authorized work (required for audit)."
                      />
                    </label>
                  ) : null}
                </div>
                <div className="kxd-os-staff-time__actions">
                  <KxdButton
                    type="button"
                    variant="primary"
                    disabled={busy !== null}
                    onClick={() => void startShift()}
                  >
                    {busy === "start" ? "Starting…" : "Start shift"}
                  </KxdButton>
                </div>
              </div>
            )}
          </OpsCard>
        </section>

        <section className="kxd-os-staff-time__section" aria-label="Pay calendar">
          <OpsSectionHead label="Pay calendar" />
          <OpsCard>
            <dl className="kxd-os-staff-time__pay-facts">
              <div>
                <dt className="kxd-os-label">Current pay period</dt>
                <dd className="kxd-os-staff-time__pay-value">
                  {data.payroll.nextPeriodLabel ?? "Pending payroll configuration"}
                </dd>
              </div>
              <div>
                <dt className="kxd-os-label">Next payday</dt>
                <dd className="kxd-os-staff-time__pay-value">
                  {data.payroll.nextPayday ?? "Schedule pending"}
                </dd>
              </div>
              <div>
                <dt className="kxd-os-label">Scheduling guidance</dt>
                <dd className="kxd-os-meta">
                  {data.payroll.weeklyHoursLimit} hours per workweek — not a wage cap.
                </dd>
              </div>
            </dl>
          </OpsCard>
        </section>

        <section className="kxd-os-staff-time__section" aria-label="Recent shifts">
          <OpsSectionHead
            label="Recent shifts"
            count={data.history.length > 0 ? data.history.length : undefined}
          />
          <OpsCard>
            {data.history.length === 0 ? (
              <OpsEmpty message="No completed shifts yet. When you end a shift, it appears here with start time, end time, and duration." />
            ) : (
              <div className="kxd-os-staff-time__history">
                {data.history.map((row) => (
                  <OpsListRow key={row.id}>
                    <div className="kxd-os-ops-list-row__main">
                      <div className="kxd-os-ops-list-row__head">
                        <p className="kxd-os-ops-list-row__title">
                          {staffWorkIntentLabel(row.workIntent.category)}
                        </p>
                        {row.elapsedMinutes != null ? (
                          <OpsStatusBadge
                            label={formatMinutes(row.elapsedMinutes)}
                            variant="status"
                          />
                        ) : null}
                      </div>
                      <p className="kxd-os-meta">
                        {formatStamp(row.startedAt, row.workTimezone)}
                        {row.endedAt
                          ? ` → ${formatStamp(row.endedAt, row.workTimezone)}`
                          : ""}
                      </p>
                    </div>
                  </OpsListRow>
                ))}
              </div>
            )}
          </OpsCard>
        </section>
      </KxdPage>
    </OperationsShell>
  );
}
