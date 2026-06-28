"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  KxdPage,
  KxdSection,
} from "@/components/os";
import { OperationsPageHero } from "@/components/admin/operations/shared/OperationsPageHero";
import { OperationsShell } from "@/components/admin/operations/shared/OperationsShell";
import {
  OpsKpiStrip,
  OpsListRow,
} from "@/components/admin/operations/shared/OpsBriefing";
import { ClientOpsNav } from "@/components/admin/operations/client-command/ClientOpsNav";
import {
  KANBAN_STATUSES,
  TASK_STATUS_LABELS,
  type ClientWorkBoardData,
  type TaskListItem,
} from "@/lib/client-tasks/types";
import { WorkKanban } from "./WorkKanban";

type ClientView = "kanban" | "list" | "timeline" | "completed" | "activity";

const CLIENT_VIEWS: Array<{ id: ClientView; label: string }> = [
  { id: "kanban", label: "Kanban" },
  { id: "list", label: "List" },
  { id: "timeline", label: "Timeline" },
  { id: "completed", label: "Completed" },
  { id: "activity", label: "Activity" },
];

export function ClientWorkScreen({
  data,
  initialView,
}: {
  data: ClientWorkBoardData;
  initialView?: string;
}) {
  const [view, setView] = useState<ClientView>(
    (CLIENT_VIEWS.find((v) => v.id === initialView)?.id ?? "kanban") as ClientView,
  );

  const openTasks = data.tasks.filter((t) => t.status !== "completed" && t.status !== "cancelled");

  const timelineTasks = useMemo(() => {
    return [...data.tasks]
      .filter((t) => t.dueDate)
      .sort((a, b) => String(a.dueDate).localeCompare(String(b.dueDate)));
  }, [data.tasks]);

  function renderList(items: TaskListItem[]) {
    if (items.length === 0) return <p className="kxd-os-meta">No tasks.</p>;
    return (
      <div className="kxd-os-list-stack">
        {items.map((task) => (
          <OpsListRow key={task.id} href={`/admin/collections/client-tasks/${task.id}`}>
            <p className="kxd-os-body">{task.title}</p>
            <p className="kxd-os-meta">
              {TASK_STATUS_LABELS[task.status]} · {task.priority}
              {task.dueDate ? ` · ${task.dueDate}` : ""}
            </p>
          </OpsListRow>
        ))}
      </div>
    );
  }

  return (
    <OperationsShell activeId="work" clientId={data.clientId}>
      <KxdPage className="kxd-os-page--ops">
        <div className="kxd-os-ops-section-head">
          <OperationsPageHero
            eyebrow="KXD OS · Client Work"
            title={data.clientName}
            lead="Execution board for every website edit, SEO task, design request, and follow-up."
            presence
          />
          <Link href="/admin/operations/work" className="kxd-os-link-quiet">
            ← Portfolio work
          </Link>
        </div>

        <ClientOpsNav clientId={data.clientId} active="work" />

        <OpsKpiStrip
          items={[
            { label: "Open", value: String(data.stats.openCount), alert: data.stats.openCount > 0 },
            { label: "Blocked", value: String(data.stats.blockedCount), alert: data.stats.blockedCount > 0 },
            { label: "Due This Week", value: String(data.stats.dueThisWeek) },
            { label: "Completed (Month)", value: String(data.stats.completedThisMonth) },
            { label: "Est. Hours", value: `${data.stats.estimatedHoursOpen}h` },
            {
              label: "Focus",
              value: data.stats.currentFocus ?? "—",
              sub: data.stats.nextRecommendedTask?.title ?? undefined,
            },
          ]}
        />

        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", margin: "1rem 0" }}>
          {CLIENT_VIEWS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              className={`kxd-os-btn kxd-os-btn--ghost kxd-os-btn--sm${view === opt.id ? " kxd-os-btn--active" : ""}`}
              onClick={() => setView(opt.id)}
            >
              {opt.label}
            </button>
          ))}
          <Link
            href={`/admin/collections/client-tasks/create?client=${data.clientId}`}
            className="kxd-os-btn kxd-os-btn--ghost kxd-os-btn--sm"
          >
            New task
          </Link>
        </div>

        {view === "kanban" ? (
          <WorkKanban byStatus={data.byStatus} columns={KANBAN_STATUSES} />
        ) : null}

        {view === "list" ? (
          <KxdSection label="All open tasks">{renderList(openTasks)}</KxdSection>
        ) : null}

        {view === "timeline" ? (
          <KxdSection label="Timeline (by due date)">{renderList(timelineTasks)}</KxdSection>
        ) : null}

        {view === "completed" ? (
          <KxdSection label="Completed">{renderList(data.completed)}</KxdSection>
        ) : null}

        {view === "activity" ? (
          <KxdSection label="Recent activity">{renderList(data.activity)}</KxdSection>
        ) : null}
      </KxdPage>
    </OperationsShell>
  );
}
