"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { OperationsPageHero } from "@/components/admin/operations/shared/OperationsPageHero";
import { OperationsShell } from "@/components/admin/operations/shared/OperationsShell";
import {
  OpsCard,
  OpsKpiStrip,
  OpsListRow,
  OpsSectionHead,
  OpsStatusBadge,
} from "@/components/admin/operations/shared/OpsBriefing";
import { KxdButton, KxdPage, type KxdBadgeVariant } from "@/components/os";
import {
  staffMyWorkGroupLabel,
  type StaffMyWorkBoardColumnId,
} from "@/lib/staff/my-work-board";
import { workRequiresOperatorApproval } from "@/lib/staff/work-approval";
import type { StaffMyWorkData } from "@/lib/staff/types";
import type { WorkApprovalViewer } from "@/lib/staff/work-approval";
import { WORK_PRIORITY_LABELS, WORK_STATUS_LABELS } from "@/lib/work/constants";
import type { WorkListItem, WorkPriority, WorkStatus } from "@/lib/work/types";

function statusVariant(status: WorkStatus): KxdBadgeVariant {
  if (status === "blocked") return "critical";
  if (status === "review") return "pending";
  if (status === "completed") return "success";
  if (status === "in-progress") return "warning";
  return "status";
}

function staffStatusLabel(status: WorkStatus): string {
  if (status === "new" || status === "planned") return "To Do";
  if (status === "in-progress" || status === "waiting-on-client" || status === "waiting-on-kxd") {
    return WORK_STATUS_LABELS[status];
  }
  if (status === "blocked") return "Blocked";
  if (status === "review") return "In Review";
  if (status === "completed") return "Completed";
  return WORK_STATUS_LABELS[status] ?? status;
}

function priorityClass(priority: WorkPriority): string {
  return `kxd-os-staff-my-work__priority kxd-os-staff-my-work__priority--${priority}`;
}

function formatDueLabel(dueDate: string): string {
  const key = dueDate.slice(0, 10);
  const date = new Date(`${key}T12:00:00`);
  if (Number.isNaN(date.getTime())) return `Due ${key}`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function isOverdue(item: WorkListItem): boolean {
  return Boolean(
    item.dueDate &&
      item.status !== "completed" &&
      item.status !== "archived" &&
      item.dueDate.slice(0, 10) < new Date().toISOString().slice(0, 10),
  );
}

function projectLabel(item: WorkListItem): { text: string; kind: "client" | "internal" } {
  const meta = staffMyWorkGroupLabel(item);
  return { text: meta.label, kind: meta.kind };
}

function StatusActions({
  item,
  busy,
  viewer,
  onStatusChange,
  compact,
}: {
  item: WorkListItem;
  busy: number | null;
  viewer: WorkApprovalViewer;
  onStatusChange: (workId: number, status: WorkStatus, note?: string) => Promise<void>;
  compact?: boolean;
}) {
  const needsApproval = workRequiresOperatorApproval(item, viewer);
  if (item.status === "review" || item.status === "completed") return null;

  const actionClass = compact
    ? "kxd-os-staff-my-work__row-actions"
    : "kxd-os-staff-my-work__card-actions";

  return (
    <div className={actionClass}>
      {(item.status === "new" || item.status === "planned") && (
        <KxdButton
          type="button"
          size="sm"
          variant="ghost"
          disabled={busy === item.id}
          onClick={(e) => {
            e.preventDefault();
            onStatusChange(item.id, "in-progress");
          }}
        >
          Start
        </KxdButton>
      )}
      {item.status === "blocked" && (
        <KxdButton
          type="button"
          size="sm"
          variant="ghost"
          disabled={busy === item.id}
          onClick={(e) => {
            e.preventDefault();
            onStatusChange(item.id, "in-progress");
          }}
        >
          Resume
        </KxdButton>
      )}
      {(item.status === "new" ||
        item.status === "planned" ||
        item.status === "in-progress" ||
        item.status === "waiting-on-client" ||
        item.status === "waiting-on-kxd") && (
        <KxdButton
          type="button"
          size="sm"
          variant="ghost"
          disabled={busy === item.id}
          onClick={(e) => {
            e.preventDefault();
            const note = window.prompt("What is blocking this work? (required)");
            if (!note?.trim()) return;
            onStatusChange(item.id, "blocked", note.trim());
          }}
        >
          Mark blocked
        </KxdButton>
      )}
      {item.status === "in-progress" && (
        <KxdButton
          type="button"
          size="sm"
          variant="ghost"
          disabled={busy === item.id}
          onClick={(e) => {
            e.preventDefault();
            onStatusChange(item.id, "review");
          }}
        >
          {needsApproval ? "Submit for review" : "In review"}
        </KxdButton>
      )}
    </div>
  );
}

function WorkBoardCard({
  item,
  viewer,
  onStatusChange,
  busy,
}: {
  item: WorkListItem;
  viewer: WorkApprovalViewer;
  onStatusChange: (workId: number, status: WorkStatus, note?: string) => Promise<void>;
  busy: number | null;
}) {
  const overdue = isOverdue(item);
  const project = projectLabel(item);
  const approval = workRequiresOperatorApproval(item, viewer);

  return (
    <article
      className={`kxd-os-staff-my-work__card${
        item.status === "completed" ? " kxd-os-staff-my-work__card--completed" : ""
      }`}
    >
      <div className="kxd-os-staff-my-work__card-top">
        <span
          className={priorityClass(item.priority)}
          title={WORK_PRIORITY_LABELS[item.priority]}
          aria-label={`Priority: ${WORK_PRIORITY_LABELS[item.priority]}`}
        />
        <span
          className={`kxd-os-staff-my-work__project kxd-os-staff-my-work__project--${project.kind}`}
        >
          {project.text}
        </span>
      </div>
      <Link href={item.href} className="kxd-os-staff-my-work__card-link">
        <p className="kxd-os-staff-my-work__card-title">{item.title}</p>
        {item.summary ? (
          <p className="kxd-os-meta kxd-os-staff-my-work__card-summary">{item.summary}</p>
        ) : null}
        {item.deliverableProgress ? (
          <p className="kxd-os-meta kxd-os-staff-my-work__card-deliverables">
            Deliverables · {item.deliverableProgress.completed} of {item.deliverableProgress.total}
          </p>
        ) : null}
      </Link>
      <div className="kxd-os-staff-my-work__card-meta">
        <OpsStatusBadge label={staffStatusLabel(item.status)} variant={statusVariant(item.status)} />
        {approval ? (
          <OpsStatusBadge label="Approval required" variant="pending" />
        ) : null}
        {item.dueDate ? (
          <span
            className={`kxd-os-staff-my-work__due${
              overdue ? " kxd-os-staff-my-work__due--overdue" : ""
            }`}
          >
            {formatDueLabel(item.dueDate)}
          </span>
        ) : null}
      </div>
      <StatusActions
        item={item}
        viewer={viewer}
        busy={busy}
        onStatusChange={onStatusChange}
      />
    </article>
  );
}

function WorkListRowItem({
  item,
  viewer,
  onStatusChange,
  busy,
}: {
  item: WorkListItem;
  viewer: WorkApprovalViewer;
  onStatusChange: (workId: number, status: WorkStatus, note?: string) => Promise<void>;
  busy: number | null;
}) {
  const overdue = isOverdue(item);
  const project = projectLabel(item);
  const approval = workRequiresOperatorApproval(item, viewer);
  const completed = item.status === "completed";

  return (
    <div
      className={`kxd-os-staff-my-work__list-row${
        completed ? " kxd-os-staff-my-work__list-row--completed" : ""
      }`}
    >
      <OpsListRow href={item.href} className="kxd-os-staff-my-work__list-row-link">
        <div className="kxd-os-ops-list-row__main">
          <div className="kxd-os-staff-my-work__list-title-row">
            <span
              className={priorityClass(item.priority)}
              title={WORK_PRIORITY_LABELS[item.priority]}
              aria-hidden="true"
            />
            <p className="kxd-os-staff-my-work__list-title">{item.title}</p>
          </div>
          <p className="kxd-os-ops-list-row__meta kxd-os-staff-my-work__list-sub">
            <span
              className={`kxd-os-staff-my-work__project kxd-os-staff-my-work__project--${project.kind}`}
            >
              {project.text}
            </span>
            {item.summary ? <span className="kxd-os-staff-my-work__list-summary">{item.summary}</span> : null}
            {item.deliverableProgress ? (
              <span className="kxd-os-staff-my-work__list-deliverables">
                · {item.deliverableProgress.completed}/{item.deliverableProgress.total} deliverables
              </span>
            ) : null}
          </p>
        </div>
        <div className="kxd-os-ops-list-row__aside kxd-os-staff-my-work__list-aside">
          <OpsStatusBadge label={staffStatusLabel(item.status)} variant={statusVariant(item.status)} />
          {approval ? (
            <OpsStatusBadge label="Approval" variant="pending" />
          ) : null}
          {item.dueDate ? (
            <span
              className={`kxd-os-staff-my-work__due${
                overdue ? " kxd-os-staff-my-work__due--overdue" : ""
              }`}
            >
              {formatDueLabel(item.dueDate)}
            </span>
          ) : (
            <span className="kxd-os-meta kxd-os-staff-my-work__due kxd-os-staff-my-work__due--none">
              No due date
            </span>
          )}
        </div>
      </OpsListRow>
      {!completed ? (
        <StatusActions
          item={item}
          viewer={viewer}
          busy={busy}
          onStatusChange={onStatusChange}
          compact
        />
      ) : null}
    </div>
  );
}

function BoardColumnHeader({
  columnId,
  label,
  count,
}: {
  columnId: StaffMyWorkBoardColumnId;
  label: string;
  count: number;
}) {
  return (
    <header
      className={`kxd-os-staff-my-work__column-head kxd-os-staff-my-work__column-head--${columnId}`}
    >
      <h2 className="kxd-os-staff-my-work__column-title">{label}</h2>
      <span className="kxd-os-staff-my-work__column-count" aria-label={`${count} tasks`}>
        {count}
      </span>
    </header>
  );
}

export interface StaffMyWorkScreenProps {
  initialData: StaffMyWorkData;
  includeCompleted: boolean;
}

export function StaffMyWorkScreen({ initialData, includeCompleted }: StaffMyWorkScreenProps) {
  const router = useRouter();
  const [view, setView] = useState<"list" | "board">("list");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const data = initialData;

  const completedToggleHref = includeCompleted
    ? "/admin/operations/staff/my-work"
    : "/admin/operations/staff/my-work?completed=1";

  async function changeStatus(workId: number, status: WorkStatus, note?: string) {
    setBusyId(workId);
    setError(null);
    const item = data.items.find((row) => row.id === workId);
    try {
      if (
        status === "review" &&
        item &&
        workRequiresOperatorApproval(item, data.viewer)
      ) {
        const res = await fetch(`/api/admin/staff/work/${workId}/submit-review`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
        const payload = (await res.json()) as { success?: boolean; error?: string };
        if (!res.ok || payload.success === false) {
          throw new Error(payload.error ?? "Could not submit for review.");
        }
        router.refresh();
        return;
      }

      const res = await fetch(`/api/admin/work/${workId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, note }),
      });
      const payload = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !payload.ok) {
        throw new Error(payload.error ?? "Could not update status.");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update status.");
    } finally {
      setBusyId(null);
    }
  }

  const kpi = useMemo(
    () => [
      { label: "Open", value: String(data.counts.open) },
      { label: "To Do", value: String(data.counts.todo) },
      { label: "In progress", value: String(data.counts.inProgress) },
      { label: "Blocked", value: String(data.counts.blocked), alert: data.counts.blocked > 0 },
      { label: "In review", value: String(data.counts.inReview) },
    ],
    [data.counts],
  );

  return (
    <OperationsShell activeId="staff-my-work" variant="staff">
      <KxdPage className="kxd-os-page--ops kxd-os-page--staff kxd-os-page--staff-my-work">
        <OperationsPageHero
          eyebrow="My work"
          title="Assigned tasks"
          lead="Work assigned to you — list or board by status. Sensitive items show when studio approval is required before completion."
        />

        <p className="kxd-os-staff-my-work__crumb">
          <Link href="/admin/operations/staff" className="kxd-os-link-quiet">
            Staff home
          </Link>
        </p>

        <OpsKpiStrip items={kpi} />

        <div className="kxd-os-staff-my-work__toolbar">
          <div className="kxd-os-staff-my-work__view-toggle" role="tablist" aria-label="View mode">
            <button
              type="button"
              role="tab"
              aria-selected={view === "list"}
              className={
                view === "list"
                  ? "kxd-os-staff-my-work__view-btn kxd-os-staff-my-work__view-btn--active"
                  : "kxd-os-staff-my-work__view-btn"
              }
              onClick={() => setView("list")}
            >
              List
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={view === "board"}
              className={
                view === "board"
                  ? "kxd-os-staff-my-work__view-btn kxd-os-staff-my-work__view-btn--active"
                  : "kxd-os-staff-my-work__view-btn"
              }
              onClick={() => setView("board")}
            >
              Board
            </button>
          </div>
          <Link href={completedToggleHref} className="kxd-os-link-quiet kxd-os-staff-my-work__completed-toggle">
            {includeCompleted ? "Hide completed" : `Show completed (${data.counts.completed})`}
          </Link>
        </div>

        {error ? (
          <p className="kxd-os-meta kxd-os-staff-my-work__error" role="alert">{error}</p>
        ) : null}

        {data.items.length === 0 ? (
          <OpsCard className="kxd-os-ops-card-padding">
            <p className="kxd-os-meta">
              No assigned work yet. When Matt assigns tasks to you, they will appear here.
            </p>
          </OpsCard>
        ) : view === "board" ? (
          <div className="kxd-os-staff-my-work__board">
            {data.columns.map((col) => {
              const items = data.board[col.id as StaffMyWorkBoardColumnId];
              return (
                <section
                  key={col.id}
                  className={`kxd-os-staff-my-work__column kxd-os-staff-my-work__column--${col.id}`}
                  aria-label={col.label}
                >
                  <BoardColumnHeader
                    columnId={col.id as StaffMyWorkBoardColumnId}
                    label={col.label}
                    count={items.length}
                  />
                  <div className="kxd-os-staff-my-work__column-body">
                    {items.length === 0 ? (
                      <p className="kxd-os-meta kxd-os-staff-my-work__column-empty">No tasks</p>
                    ) : (
                      items.map((item) => (
                        <WorkBoardCard
                          key={item.id}
                          item={item}
                          viewer={data.viewer}
                          busy={busyId}
                          onStatusChange={changeStatus}
                        />
                      ))
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        ) : (
          <div className="kxd-os-staff-my-work__list">
            {data.groups.map((group) => (
              <section key={group.key} className="kxd-os-staff-my-work__group">
                <OpsSectionHead label={group.label} count={group.items.length} />
                <OpsCard className="kxd-os-staff-my-work__group-card">
                  {group.items.map((item) => (
                    <WorkListRowItem
                      key={item.id}
                      item={item}
                      viewer={data.viewer}
                      busy={busyId}
                      onStatusChange={changeStatus}
                    />
                  ))}
                </OpsCard>
              </section>
            ))}
          </div>
        )}
      </KxdPage>
    </OperationsShell>
  );
}
