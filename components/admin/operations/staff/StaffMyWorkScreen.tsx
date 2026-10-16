"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { OperationsPageHero } from "@/components/admin/operations/shared/OperationsPageHero";
import { OperationsShell } from "@/components/admin/operations/shared/OperationsShell";
import {
  OpsCard,
  OpsKpiStrip,
  OpsSectionHead,
  OpsStatusBadge,
} from "@/components/admin/operations/shared/OpsBriefing";
import { KxdButton, KxdPage, type KxdBadgeVariant } from "@/components/os";
import type { StaffMyWorkData } from "@/lib/staff/types";
import type { StaffMyWorkBoardColumnId } from "@/lib/staff/my-work-board";
import { WORK_PRIORITY_LABELS, WORK_STATUS_LABELS } from "@/lib/work/constants";
import type { WorkListItem, WorkStatus } from "@/lib/work/types";

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

function WorkCard({
  item,
  onStatusChange,
  busy,
}: {
  item: WorkListItem;
  onStatusChange: (workId: number, status: WorkStatus, note?: string) => Promise<void>;
  busy: number | null;
}) {
  const overdue =
    item.dueDate &&
    item.status !== "completed" &&
    item.status !== "archived" &&
    item.dueDate.slice(0, 10) < new Date().toISOString().slice(0, 10);

  return (
    <article className="kxd-os-staff-my-work__card">
      <Link href={item.href} className="kxd-os-staff-my-work__card-link">
        <p className="kxd-os-staff-my-work__card-title">{item.title}</p>
        {item.summary ? (
          <p className="kxd-os-meta kxd-os-staff-my-work__card-summary">{item.summary}</p>
        ) : null}
      </Link>
      <div className="kxd-os-staff-my-work__card-meta">
        <OpsStatusBadge label={staffStatusLabel(item.status)} variant={statusVariant(item.status)} />
        <span className="kxd-os-meta">{WORK_PRIORITY_LABELS[item.priority]}</span>
        {item.dueDate ? (
          <span className={`kxd-os-meta${overdue ? " kxd-os-staff-my-work__overdue" : ""}`}>
            Due {item.dueDate.slice(0, 10)}
          </span>
        ) : null}
      </div>
      {item.status !== "review" && item.status !== "completed" ? (
        <div className="kxd-os-staff-my-work__card-actions">
          {(item.status === "new" || item.status === "planned") && (
            <KxdButton
              type="button"
              size="sm"
              variant="ghost"
              disabled={busy === item.id}
              onClick={() => onStatusChange(item.id, "in-progress")}
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
              onClick={() => onStatusChange(item.id, "in-progress")}
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
              onClick={() => {
                const note = window.prompt("What is blocking this work?");
                if (note?.trim()) onStatusChange(item.id, "blocked", note.trim());
              }}
            >
              Blocked
            </KxdButton>
          )}
          {item.status === "in-progress" && (
            <KxdButton
              type="button"
              size="sm"
              variant="ghost"
              disabled={busy === item.id}
              onClick={() => onStatusChange(item.id, "review")}
            >
              In Review
            </KxdButton>
          )}
        </div>
      ) : null}
    </article>
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
    try {
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
      { label: "Blocked", value: String(data.counts.blocked) },
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
          lead="Work assigned to you — grouped by client or internal project. Status changes follow your approval boundary."
        />

        <p className="kxd-os-meta" style={{ marginBottom: "1rem" }}>
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
          <Link href={completedToggleHref} className="kxd-os-link-quiet kxd-os-meta">
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
                <section key={col.id} className="kxd-os-staff-my-work__column" aria-label={col.label}>
                  <OpsSectionHead label={col.label} count={items.length} />
                  <div className="kxd-os-staff-my-work__column-body">
                    {items.length === 0 ? (
                      <p className="kxd-os-meta">—</p>
                    ) : (
                      items.map((item) => (
                        <WorkCard
                          key={item.id}
                          item={item}
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
                    <WorkCard
                      key={item.id}
                      item={item}
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
