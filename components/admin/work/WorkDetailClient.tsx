"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { KxdShell } from "@/components/os";
import { ExecutiveWorkspaceShell } from "@/components/admin/executive-workspace";
import { WorkComposerHost } from "@/components/admin/work/composer";
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
import { getWorkStatusActions } from "@/lib/work/transitions";
import type { WorkListItem, WorkStatus } from "@/lib/work/types";
import { useEffect } from "react";

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
}: {
  initialWork: WorkListItem;
  currentUser?: WorkComposerUserOption | null;
}) {
  const [work, setWork] = useState(initialWork);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const actions = useMemo(() => getWorkStatusActions(work.status), [work.status]);

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
        // Status route returns UpdateWorkResult — refetch for full item
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

  return (
    <KxdShell className="kxd-os-shell--ritual">
      <ExecutiveWorkspaceShell workspaceId="work" includeWorkComposer={false}>
        <div className="kxd-os-work-detail">
          <header className="kxd-os-work-engine__header kxd-os-work-engine__header--secondary">
            <nav className="kxd-os-work-engine__nav" aria-label="Work Engine">
              <Link href={WORK_ENGINE_HOME}>Work</Link>
              <span className="kxd-os-work-engine__nav-active">Detail</span>
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
      </ExecutiveWorkspaceShell>
    </KxdShell>
  );
}
