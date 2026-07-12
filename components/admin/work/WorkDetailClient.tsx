"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { KxdShell } from "@/components/os";
import { ExecutiveWorkspaceShell } from "@/components/admin/executive-workspace";
import { WorkComposerHost } from "@/components/admin/work/composer";
import { ScheduleWorkHost } from "@/components/admin/work/scheduling";
import {
  formatTimeBudgetHours,
  openWorkComposerForEdit,
  WORK_COMPOSER_UPDATED_EVENT,
  type WorkComposerUpdatedDetail,
  type WorkComposerUserOption,
} from "@/lib/work/composer";
import {
  WORK_ENGINE_HOME,
  WORK_PRIORITY_LABELS,
  WORK_STATUS_LABELS,
} from "@/lib/work/constants";
import {
  formatWorkAssignee,
  formatWorkDue,
  formatWorkStateAge,
} from "@/lib/work/display";
import {
  canShowScheduleWorkAction,
  openScheduleWork,
  SCHEDULING_STATUS_LABELS,
} from "@/lib/work/scheduling";
import {
  calendarRecoveryGuidance,
  humanSyncHealth,
} from "@/lib/scheduling/workspace";
import { getWorkStatusActions } from "@/lib/work/transitions";
import type { WorkListItem, WorkStatus } from "@/lib/work/types";

function formatDateTime(iso: string | null): string | null {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return null;
  }
}

function MetaRow({ label, value }: { label: string; value: React.ReactNode }) {
  if (value == null || value === "") return null;
  return (
    <div className="kxd-os-work-detail__meta-row">
      <span className="kxd-os-work-detail__meta-label">{label}</span>
      <span className="kxd-os-work-detail__meta-value">{value}</span>
    </div>
  );
}

export function WorkDetailClient({
  initialWork,
  currentUser,
  calendarEventHtmlLink = null,
  calendarWriteAt = null,
  scheduleLinkId = null,
  calendarSyncStatus = null,
  calendarRecoveryState = null,
  calendarExternalChangeClass = null,
  calendarLastSyncAt = null,
}: {
  initialWork: WorkListItem;
  currentUser?: WorkComposerUserOption | null;
  calendarEventHtmlLink?: string | null;
  calendarWriteAt?: string | null;
  scheduleLinkId?: number | null;
  calendarSyncStatus?: string | null;
  calendarRecoveryState?: string | null;
  calendarExternalChangeClass?: string | null;
  calendarLastSyncAt?: string | null;
}) {
  const [work, setWork] = useState(initialWork);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState(calendarSyncStatus);
  const [recoveryState, setRecoveryState] = useState(calendarRecoveryState);
  const [externalChangeClass, setExternalChangeClass] = useState(
    calendarExternalChangeClass,
  );
  const [lastSyncAt, setLastSyncAt] = useState(calendarLastSyncAt);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const actions = useMemo(() => getWorkStatusActions(work.status), [work.status]);
  const showSchedule = canShowScheduleWorkAction(work);

  useEffect(() => {
    function onUpdated(e: Event) {
      const detail = (e as CustomEvent<WorkComposerUpdatedDetail>).detail;
      if (detail?.work?.id === work.id) setWork(detail.work);
    }
    window.addEventListener(WORK_COMPOSER_UPDATED_EVENT, onUpdated);
    return () => window.removeEventListener(WORK_COMPOSER_UPDATED_EVENT, onUpdated);
  }, [work.id]);

  const runTransition = useCallback(
    async (status: WorkStatus, actionId: string) => {
      setBusyAction(actionId);
      setError(null);
      try {
        const res = await fetch(`/api/admin/work/${work.id}/status`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        });
        const data = (await res.json()) as {
          ok?: boolean;
          work?: WorkListItem;
          error?: string;
          status?: WorkStatus;
        };
        if (!res.ok || data.ok === false) {
          setError(data.error ?? "Could not update status.");
          return;
        }
        const refresh = await fetch(`/api/admin/work/${work.id}`);
        const refreshed = (await refresh.json()) as {
          ok?: boolean;
          work?: WorkListItem;
        };
        if (refreshed.ok && refreshed.work) {
          setWork(refreshed.work);
        } else if (data.status) {
          setWork((prev) => ({ ...prev, status: data.status as WorkStatus }));
        }
      } catch {
        setError("Could not update status.");
      } finally {
        setBusyAction(null);
      }
    },
    [work.id],
  );

  const due = formatWorkDue(work.dueDate);
  const start = formatWorkDue(work.startDate);
  const assignee = formatWorkAssignee(work.assignedTo);
  const age = formatWorkStateAge(work);
  const budget = formatTimeBudgetHours(work.estimatedEffort);
  const history = [...(work.activityHistory ?? [])].reverse();
  const showCalendarSync =
    scheduleLinkId != null &&
    (work.schedulingStatus === "scheduled" ||
      work.schedulingStatus === "sync_error" ||
      Boolean(calendarWriteAt) ||
      Boolean(calendarEventHtmlLink));
  const recoveryNote = calendarRecoveryGuidance({
    recoveryState,
    syncStatus,
  });

  async function checkCalendar() {
    if (scheduleLinkId == null) return;
    setBusyAction("sync");
    setError(null);
    setSyncMessage(null);
    try {
      const res = await fetch(
        `/api/admin/scheduling/proposals/${scheduleLinkId}/sync`,
        { method: "POST" },
      );
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        result?: {
          message?: string;
          syncStatus?: string;
          recoveryState?: string;
          externalChangeClass?: string;
          link?: {
            lastSyncAt?: string | null;
            syncStatus?: string;
            recoveryState?: string;
            externalChangeClass?: string;
          };
        };
      };
      if (!res.ok || data.ok === false) {
        setError(data.error ?? "Could not check calendar.");
        return;
      }
      const link = data.result?.link;
      setSyncStatus(link?.syncStatus ?? data.result?.syncStatus ?? syncStatus);
      setRecoveryState(
        link?.recoveryState ?? data.result?.recoveryState ?? recoveryState,
      );
      setExternalChangeClass(
        link?.externalChangeClass ??
          data.result?.externalChangeClass ??
          externalChangeClass,
      );
      setLastSyncAt(link?.lastSyncAt ?? lastSyncAt);
      setSyncMessage(data.result?.message ?? "Calendar checked.");
      const refresh = await fetch(`/api/admin/work/${work.id}`);
      const refreshed = (await refresh.json()) as {
        ok?: boolean;
        work?: WorkListItem;
      };
      if (refreshed.ok && refreshed.work) setWork(refreshed.work);
    } catch {
      setError("Could not check calendar.");
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <KxdShell className="kxd-os-shell--ritual">
      <ExecutiveWorkspaceShell workspaceId="work" includeWorkComposer={false}>
        <div className="kxd-os-work-detail">
          <header className="kxd-os-work-engine__header kxd-os-work-engine__header--secondary">
            <nav className="kxd-os-work-engine__nav" aria-label="Work Engine">
              <Link href={WORK_ENGINE_HOME}>Work</Link>
              <span className="kxd-os-work-engine__nav-active">Detail</span>
              <Link href="/admin/work/scheduling">Scheduling</Link>
            </nav>
            <Link href={WORK_ENGINE_HOME} className="kxd-os-work-engine__exit">
              Back to Work Engine
            </Link>
          </header>

          <main className="kxd-os-work-detail__main">
            <p className="kxd-os-work-engine__eyebrow">Work</p>
            <h1 className="kxd-os-work-detail__title">{work.title}</h1>

            {work.description ? (
              <p className="kxd-os-work-detail__description">{work.description}</p>
            ) : (
              <p className="kxd-os-work-detail__description kxd-os-work-detail__description--empty">
                No description.
              </p>
            )}

            <div className="kxd-os-work-detail__actions">
              <button
                type="button"
                className="kxd-os-work-detail__edit"
                onClick={() => openWorkComposerForEdit(work)}
              >
                Edit
              </button>
              {showSchedule ? (
                <button
                  type="button"
                  className="kxd-os-work-detail__action kxd-os-work-detail__action--schedule"
                  disabled={busyAction != null}
                  onClick={() => openScheduleWork(work.id)}
                >
                  Schedule Work
                </button>
              ) : null}
              {actions.map((action) => (
                <button
                  key={action.id}
                  type="button"
                  className="kxd-os-work-detail__action"
                  disabled={busyAction != null}
                  onClick={() => void runTransition(action.status, action.id)}
                >
                  {busyAction === action.id ? "…" : action.label}
                </button>
              ))}
            </div>

            {error ? <p className="kxd-os-work-composer__error">{error}</p> : null}

            <section className="kxd-os-work-detail__meta" aria-label="Work details">
              <MetaRow
                label="Client"
                value={
                  work.clientId != null && work.clientSuccessHref ? (
                    <Link href={work.clientSuccessHref} className="kxd-os-link-quiet">
                      {work.clientName}
                    </Link>
                  ) : (
                    work.clientName
                  )
                }
              />
              <MetaRow label="Project" value={work.internalProject} />
              <MetaRow label="Status" value={WORK_STATUS_LABELS[work.status]} />
              <MetaRow label="Priority" value={WORK_PRIORITY_LABELS[work.priority]} />
              <MetaRow label="Due date" value={due} />
              <MetaRow label="Start date" value={start} />
              <MetaRow label="Planned for" value={formatWorkDue(work.plannedForDate)} />
              <MetaRow
                label="Scheduling"
                value={SCHEDULING_STATUS_LABELS[work.schedulingStatus]}
              />
              <MetaRow
                label="Proposed window"
                value={
                  work.scheduledStart && work.scheduledEnd
                    ? `${formatDateTime(work.scheduledStart)} – ${formatDateTime(work.scheduledEnd)}`
                    : null
                }
              />
              {work.schedulingStatus === "scheduled" ||
              work.schedulingStatus === "sync_error" ||
              showCalendarSync ? (
                <>
                  <MetaRow label="Calendar" value="Matt" />
                  {syncStatus ? (
                    <MetaRow
                      label="Calendar sync"
                      value={humanSyncHealth({
                        syncStatus,
                        recoveryState,
                        externalChangeClass,
                      })}
                    />
                  ) : (
                    <MetaRow label="Google Calendar" value="Linked" />
                  )}
                  {lastSyncAt ? (
                    <MetaRow
                      label="Last checked"
                      value={formatDateTime(lastSyncAt)}
                    />
                  ) : null}
                  {calendarWriteAt ? (
                    <MetaRow
                      label="Calendar created"
                      value={formatDateTime(calendarWriteAt)}
                    />
                  ) : null}
                  {calendarEventHtmlLink ? (
                    <MetaRow
                      label="Open event"
                      value={
                        <a
                          href={calendarEventHtmlLink}
                          target="_blank"
                          rel="noreferrer"
                          className="kxd-os-link-quiet"
                        >
                          Open in Google Calendar
                        </a>
                      }
                    />
                  ) : null}
                  {showCalendarSync ? (
                    <MetaRow
                      label="Synchronize"
                      value={
                        <button
                          type="button"
                          className="kxd-os-link-quiet"
                          disabled={busyAction != null}
                          onClick={() => void checkCalendar()}
                          style={{
                            background: "none",
                            border: "none",
                            padding: 0,
                            cursor: busyAction != null ? "default" : "pointer",
                            font: "inherit",
                            color: "inherit",
                          }}
                        >
                          {busyAction === "sync"
                            ? "Checking…"
                            : syncStatus === "error" ||
                                recoveryState === "missing_remote" ||
                                recoveryState === "cancelled_remote"
                              ? "Retry Sync"
                              : "Check Calendar"}
                        </button>
                      }
                    />
                  ) : null}
                  {syncMessage ? (
                    <MetaRow label="Sync result" value={syncMessage} />
                  ) : null}
                  {recoveryNote ? (
                    <MetaRow label="Recovery" value={recoveryNote} />
                  ) : null}
                </>
              ) : null}
              <MetaRow label="Assigned" value={assignee} />
              <MetaRow label="Created by" value={work.createdBy} />
              <MetaRow label="Time budget" value={budget} />
              <MetaRow
                label="Tags"
                value={work.tags.length ? work.tags.join(", ") : null}
              />
              <MetaRow label="Created" value={formatDateTime(work.createdAt)} />
              <MetaRow label="Updated" value={formatDateTime(work.updatedAt)} />
              <MetaRow label="Completed" value={formatDateTime(work.completedAt)} />
              <MetaRow label="State age" value={age} />
            </section>

            <section className="kxd-os-work-detail__history" aria-label="Activity history">
              <h2 className="kxd-os-work-engine__section-title">Activity</h2>
              {history.length === 0 ? (
                <p className="kxd-os-meta">No internal activity recorded yet.</p>
              ) : (
                <ul className="kxd-os-work-detail__history-list">
                  {history.map((entry, i) => (
                    <li key={`${entry.at}-${entry.action}-${i}`}>
                      <p className="kxd-os-body">{entry.action}</p>
                      <p className="kxd-os-meta">
                        {formatDateTime(entry.at)}
                        {entry.actor ? ` · ${entry.actor}` : ""}
                        {entry.detail ? ` · ${entry.detail}` : ""}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </main>
        </div>

        <WorkComposerHost
          currentUser={currentUser}
          onUpdated={(next) => setWork(next)}
        />
        <ScheduleWorkHost work={work} onWorkRefresh={(next) => setWork(next)} />
      </ExecutiveWorkspaceShell>
    </KxdShell>
  );
}
