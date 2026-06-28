"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { KxdBadge, type KxdBadgeVariant } from "@/components/os";
import {
  TASK_CATEGORY_LABELS,
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
  type TaskListItem,
  type TaskStatus,
} from "@/lib/client-tasks/types";

const QUICK_STATUSES: TaskStatus[] = [
  "to-do",
  "in-progress",
  "review",
  "waiting-on-client",
  "waiting-on-kxd",
  "blocked",
  "completed",
];

function priorityVariant(priority: string): KxdBadgeVariant {
  switch (priority) {
    case "critical":
      return "critical";
    case "high":
      return "warning";
    case "medium":
      return "status";
    default:
      return "default";
  }
}

export function WorkTaskCard({
  task,
  compact,
  onStatusChange,
}: {
  task: TaskListItem;
  compact?: boolean;
  onStatusChange?: () => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function setStatus(status: TaskStatus) {
    setBusy(true);
    try {
      await fetch(`/api/admin/client-tasks/${task.id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      onStatusChange?.();
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const overdue =
    task.dueDate &&
    task.status !== "completed" &&
    task.status !== "cancelled" &&
    task.daysUntilDue != null &&
    task.daysUntilDue < 0;

  return (
    <div
      className="kxd-os-card"
      style={{
        padding: compact ? "0.65rem" : "0.85rem",
        marginBottom: "0.5rem",
        borderColor: overdue ? "var(--kxd-os-critical)" : undefined,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem", flexWrap: "wrap" }}>
        <p className="kxd-os-body" style={{ fontWeight: 500 }}>{task.title}</p>
        <KxdBadge variant={priorityVariant(task.priority)}>{TASK_PRIORITY_LABELS[task.priority]}</KxdBadge>
      </div>
      {!compact && task.clientName ? (
        <p className="kxd-os-meta">{task.clientName}</p>
      ) : null}
      <p className="kxd-os-meta">
        {TASK_CATEGORY_LABELS[task.category]}
        {task.dueDate ? ` · Due ${task.dueDate}` : ""}
        {task.assignedTo ? ` · ${task.assignedTo}` : ""}
      </p>
      {task.blockedReason ? (
        <p className="kxd-os-meta" style={{ color: "var(--kxd-os-critical)" }}>
          {task.blockedReason}
        </p>
      ) : null}
      <div
        className="kxd-os-ops-quick-grid"
        style={{ marginTop: "0.5rem", gridTemplateColumns: "repeat(auto-fill, minmax(5.5rem, 1fr))" }}
      >
        {QUICK_STATUSES.filter((s) => s !== task.status).slice(0, 4).map((status) => (
          <button
            key={status}
            type="button"
            className="kxd-os-btn kxd-os-btn--ghost kxd-os-btn--sm"
            disabled={busy}
            onClick={() => setStatus(status)}
          >
            {TASK_STATUS_LABELS[status]}
          </button>
        ))}
      </div>
    </div>
  );
}

export function WorkKanban({
  byStatus,
  columns,
  showClient,
  onStatusChange,
}: {
  byStatus: Record<TaskStatus, TaskListItem[]>;
  columns: TaskStatus[];
  showClient?: boolean;
  onStatusChange?: () => void;
}) {
  return (
    <div
      className="kxd-os-work-kanban"
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${columns.length}, minmax(11rem, 1fr))`,
        gap: "0.75rem",
        overflowX: "auto",
        paddingBottom: "0.5rem",
      }}
    >
      {columns.map((status) => {
        const items = byStatus[status] ?? [];
        return (
          <div key={status} style={{ minWidth: "11rem" }}>
            <p className="kxd-os-section__label" style={{ marginBottom: "0.5rem" }}>
              {TASK_STATUS_LABELS[status]} ({items.length})
            </p>
            {items.length === 0 ? (
              <p className="kxd-os-meta">Empty</p>
            ) : (
              items.map((task) => (
                <WorkTaskCard
                  key={task.id}
                  task={task}
                  compact={!showClient}
                  onStatusChange={onStatusChange}
                />
              ))
            )}
          </div>
        );
      })}
    </div>
  );
}
