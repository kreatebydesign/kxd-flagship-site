"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { KxdShell } from "@/components/os";
import { ExecutiveWorkspaceShell } from "@/components/admin/executive-workspace";
import { WorkComposerHost } from "@/components/admin/work/composer";
import { ScheduleWorkHost } from "@/components/admin/work/scheduling";
import {
  WebsiteReviewRequestSection,
  WebsiteReviewSupportingSections,
  WebsiteReviewWorkPrimaryActions,
  clientReviewStatusLabel,
} from "@/components/admin/work/WebsiteReviewWorkDetailSections";
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
import type { WebsiteReviewWorkContext } from "@/lib/work/website-review-context-types";

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

function formatActivityLabel(action: string): string {
  const map: Record<string, string> = {
    created: "Created",
    updated: "Updated",
    "status-changed": "Status changed",
  };
  return map[action] ?? action.replace(/-/g, " ");
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

function completionActor(work: WorkListItem): string | null {
  if (work.status !== "completed" && !work.completedAt) return null;
  const history = [...(work.activityHistory ?? [])].reverse();
  const entry = history.find(
    (row) =>
      row.action === "status-changed" &&
      /→\s*Completed/i.test(row.detail ?? ""),
  );
  return entry?.actor ?? null;
}

export function WorkDetailClient({
  initialWork,
  currentUser,
  websiteReviewContext = null,
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
  websiteReviewContext?: WebsiteReviewWorkContext | null;
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
  const hasReviewContext = websiteReviewContext != null;
  const linkedReview = websiteReviewContext?.status === "linked";
  const displayTitle = linkedReview
    ? websiteReviewContext.displayTitle
    : work.title;
  const reviewStatusLabel = clientReviewStatusLabel(websiteReviewContext);
  const locationSummary =
    linkedReview && websiteReviewContext.location
      ? [
          websiteReviewContext.location.pageLabel,
          websiteReviewContext.location.pagePath,
        ]
          .filter(Boolean)
          .join(" · ") || null
      : null;

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
  const completedBy = completionActor(work);
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
  const actionsBusy = busyAction != null;

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
        <div
          className={`kxd-os-work-detail${
            hasReviewContext ? " kxd-os-work-detail--website-review" : ""
          }`}
        >
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
            <p className="kxd-os-work-engine__eyebrow">
              {hasReviewContext ? "Website Review Work" : "Work"}
            </p>
            <h1 className="kxd-os-work-detail__title">{displayTitle}</h1>

            {linkedReview ? (
              <div className="kxd-os-work-detail__summary" aria-label="Work summary">
                <MetaRow
                  label="Client"
                  value={
                    work.clientId != null && work.clientSuccessHref ? (
                      <Link href={work.clientSuccessHref} className="kxd-os-link-quiet">
                        {websiteReviewContext.clientName ?? work.clientName}
                      </Link>
                    ) : (
                      websiteReviewContext.clientName ?? work.clientName
                    )
                  }
                />
                <MetaRow
                  label="Submitter"
                  value={
                    websiteReviewContext.submittedBy
                      ? `${websiteReviewContext.submittedBy}${
                          websiteReviewContext.submittedByEmail
                            ? ` · ${websiteReviewContext.submittedByEmail}`
                            : ""
                        }`
                      : websiteReviewContext.submittedByEmail
                  }
                />
                <MetaRow
                  label="Submitted"
                  value={formatDateTime(websiteReviewContext.submittedAt)}
                />
                <MetaRow label="Work status" value={WORK_STATUS_LABELS[work.status]} />
                <MetaRow label="Client review status" value={reviewStatusLabel} />
                <MetaRow label="Assigned" value={assignee} />
                <MetaRow label="Priority" value={WORK_PRIORITY_LABELS[work.priority]} />
                <MetaRow label="Page" value={locationSummary} />
                {reviewStatusLabel &&
                reviewStatusLabel.toLowerCase().includes("complete") &&
                work.status !== "completed" &&
                work.status !== "archived" ? (
                  <p className="kxd-os-work-detail__status-note">
                    Client review and Work Engine statuses are separate. Completing
                    the review does not complete this work item.
                  </p>
                ) : null}
              </div>
            ) : work.description ? (
              <p className="kxd-os-work-detail__description">{work.description}</p>
            ) : work.summary ? (
              <p className="kxd-os-work-detail__description">{work.summary}</p>
            ) : (
              <p className="kxd-os-work-detail__description kxd-os-work-detail__description--empty">
                No description.
              </p>
            )}

            <div className="kxd-os-work-detail__actions" aria-label="Work actions">
              {websiteReviewContext ? (
                <WebsiteReviewWorkPrimaryActions context={websiteReviewContext} />
              ) : null}

              <div
                className="kxd-os-work-detail__action-group"
                aria-label="Editing and scheduling"
              >
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
                    disabled={actionsBusy}
                    aria-busy={busyAction === "schedule" || undefined}
                    onClick={() => openScheduleWork(work.id)}
                  >
                    Schedule Work
                  </button>
                ) : null}
              </div>

              {actions.length > 0 ? (
                <div
                  className="kxd-os-work-detail__action-group kxd-os-work-detail__action-group--workflow"
                  aria-label="Workflow status"
                >
                  {actions.map((action) => (
                    <button
                      key={action.id}
                      type="button"
                      className="kxd-os-work-detail__action"
                      disabled={actionsBusy}
                      aria-busy={busyAction === action.id || undefined}
                      onClick={() => void runTransition(action.status, action.id)}
                    >
                      {busyAction === action.id ? "…" : action.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            {error ? <p className="kxd-os-work-composer__error">{error}</p> : null}

            {websiteReviewContext ? (
              <WebsiteReviewRequestSection context={websiteReviewContext} />
            ) : null}

            {websiteReviewContext ? (
              <WebsiteReviewSupportingSections context={websiteReviewContext} />
            ) : null}

            <section
              className="kxd-os-work-detail__section kxd-os-work-detail__section--compact"
              aria-labelledby="work-status-heading"
            >
              <h2 id="work-status-heading" className="kxd-os-work-detail__section-title">
                Work Status &amp; Assignment
              </h2>
              <div className="kxd-os-work-detail__meta" aria-label="Work details">
                {!linkedReview ? (
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
                ) : null}
                <MetaRow label="Project" value={work.internalProject} />
                <MetaRow label="Work status" value={WORK_STATUS_LABELS[work.status]} />
                {reviewStatusLabel ? (
                  <MetaRow label="Client review status" value={reviewStatusLabel} />
                ) : null}
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
                            disabled={actionsBusy}
                            onClick={() => void checkCalendar()}
                            style={{
                              background: "none",
                              border: "none",
                              padding: 0,
                              cursor: actionsBusy ? "default" : "pointer",
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
                <MetaRow label="State age" value={age} />
                {work.source === "website-review" && work.sourceId ? (
                  <MetaRow label="Source" value={`Website Review #${work.sourceId}`} />
                ) : null}
              </div>
            </section>

            <section
              className="kxd-os-work-detail__section kxd-os-work-detail__section--compact"
              aria-labelledby="work-notes-heading"
            >
              <h2 id="work-notes-heading" className="kxd-os-work-detail__section-title">
                Internal Notes
              </h2>
              <p className="kxd-os-work-detail__hint">
                Internal only — not visible to the client. Edit via the Work composer.
              </p>
              {work.notes ? (
                <div className="kxd-os-work-detail__prose">
                  <p>{work.notes}</p>
                </div>
              ) : (
                <p className="kxd-os-work-detail__fallback">No internal notes yet.</p>
              )}
            </section>

            {(work.status === "completed" || work.completedAt) && (
              <section
                className="kxd-os-work-detail__section kxd-os-work-detail__section--compact"
                aria-labelledby="work-completion-heading"
              >
                <h2
                  id="work-completion-heading"
                  className="kxd-os-work-detail__section-title"
                >
                  Completion Summary
                </h2>
                <div className="kxd-os-work-detail__meta" aria-label="Completion">
                  <MetaRow label="Work status" value={WORK_STATUS_LABELS[work.status]} />
                  <MetaRow
                    label="Completed"
                    value={formatDateTime(work.completedAt)}
                  />
                  <MetaRow label="Completed by" value={completedBy} />
                </div>
                {work.notes && work.status === "completed" ? (
                  <div className="kxd-os-work-detail__prose">
                    <p className="kxd-os-work-detail__hint">Work notes at completion</p>
                    <p>{work.notes}</p>
                  </div>
                ) : null}
              </section>
            )}

            <section
              className="kxd-os-work-detail__section kxd-os-work-detail__section--compact kxd-os-work-detail__section--last"
              aria-label="Work activity"
            >
              <h2 className="kxd-os-work-detail__section-title">Work Activity</h2>
              {history.length === 0 ? (
                <p className="kxd-os-work-detail__fallback">
                  No internal activity recorded yet.
                </p>
              ) : (
                <ol className="kxd-os-work-detail__timeline">
                  {history.map((entry, i) => (
                    <li
                      key={`${entry.at}-${entry.action}-${i}`}
                      className="kxd-os-work-detail__timeline-item"
                    >
                      <p className="kxd-os-work-detail__timeline-event">
                        {formatActivityLabel(entry.action)}
                      </p>
                      <p className="kxd-os-work-detail__timeline-meta">
                        <time dateTime={entry.at}>
                          {formatDateTime(entry.at)}
                        </time>
                        {entry.actor ? ` · ${entry.actor}` : ""}
                      </p>
                      {entry.detail ? (
                        <p className="kxd-os-work-detail__timeline-note">
                          {entry.detail}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ol>
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
