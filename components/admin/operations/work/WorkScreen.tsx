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
  OpsSectionHead,
} from "@/components/admin/operations/shared/OpsBriefing";
import {
  KANBAN_STATUSES,
  TASK_CATEGORY_LABELS,
  type TaskListItem,
  type WorkPortfolioData,
} from "@/lib/client-tasks/types";
import { WorkKanban } from "./WorkKanban";

type PortfolioView =
  | "kanban"
  | "my-tasks"
  | "due-today"
  | "overdue"
  | "blocked"
  | "waiting-on-client"
  | "waiting-on-kxd"
  | "completed"
  | "by-client"
  | "by-category";

const VIEW_OPTIONS: Array<{ id: PortfolioView; label: string }> = [
  { id: "kanban", label: "Kanban" },
  { id: "my-tasks", label: "My Tasks" },
  { id: "due-today", label: "Due Today" },
  { id: "overdue", label: "Overdue" },
  { id: "blocked", label: "Blocked" },
  { id: "waiting-on-client", label: "Waiting On Client" },
  { id: "waiting-on-kxd", label: "Waiting On KXD" },
  { id: "completed", label: "Completed" },
  { id: "by-client", label: "By Client" },
  { id: "by-category", label: "By Category" },
];

function filterForView(
  view: PortfolioView,
  data: WorkPortfolioData,
  adminEmail?: string | null,
): TaskListItem[] {
  switch (view) {
    case "due-today":
      return data.dueToday;
    case "overdue":
      return data.overdue;
    case "blocked":
      return data.tasks.filter((t) => t.status === "blocked");
    case "waiting-on-client":
      return data.waitingOnClient;
    case "waiting-on-kxd":
      return data.waitingOnKxd;
    case "completed":
      return data.completedRecent;
    case "my-tasks":
      if (!adminEmail) return data.tasks.filter((t) => t.priority === "critical" || t.priority === "high");
      return data.tasks.filter((t) => t.assignedTo?.toLowerCase() === adminEmail.toLowerCase());
    default:
      return data.tasks;
  }
}

export function WorkScreen({
  data,
  initialView,
  adminEmail,
}: {
  data: WorkPortfolioData;
  initialView?: string;
  adminEmail?: string | null;
}) {
  const [view, setView] = useState<PortfolioView>(
    (VIEW_OPTIONS.find((v) => v.id === initialView)?.id ?? "kanban") as PortfolioView,
  );
  const [search, setSearch] = useState("");

  const q = search.trim().toLowerCase();
  const baseTasks = filterForView(view, data, adminEmail);
  const filteredTasks = q
    ? baseTasks.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.clientName.toLowerCase().includes(q) ||
          t.category.includes(q) ||
          t.labels.some((l) => l.toLowerCase().includes(q)),
      )
    : baseTasks;

  const byStatus = useMemo(() => {
    const groups = Object.fromEntries(KANBAN_STATUSES.map((s) => [s, [] as TaskListItem[]])) as Record<
      TaskListItem["status"],
      TaskListItem[]
    >;
    for (const task of filteredTasks) {
      if (groups[task.status]) groups[task.status].push(task);
    }
    return groups;
  }, [filteredTasks]);

  const byCategory = useMemo(() => {
    const map = new Map<string, TaskListItem[]>();
    for (const task of filteredTasks) {
      const list = map.get(task.category) ?? [];
      list.push(task);
      map.set(task.category, list);
    }
    return [...map.entries()];
  }, [filteredTasks]);

  return (
    <OperationsShell activeId="work">
      <KxdPage className="kxd-os-page--ops">
        <OperationsPageHero
          eyebrow="KXD OS · Client Work"
          title="Work Manager"
          lead="Day-to-day execution board — every edit, task, follow-up, and delivery item across the portfolio."
          presence
        />

        <OpsKpiStrip
          items={[
            { label: "Open", value: String(data.stats.openCount), alert: data.stats.openCount > 0 },
            { label: "Blocked", value: String(data.stats.blockedCount), alert: data.stats.blockedCount > 0 },
            { label: "Due Today", value: String(data.stats.dueTodayCount), alert: data.stats.dueTodayCount > 0 },
            { label: "Overdue", value: String(data.stats.overdueCount), alert: data.stats.overdueCount > 0 },
            { label: "Waiting Client", value: String(data.stats.waitingOnClientCount) },
            { label: "Est. Hours", value: `${data.stats.estimatedHoursOpen}h` },
          ]}
        />

        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", margin: "1rem 0" }}>
          {VIEW_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              className={`kxd-os-btn kxd-os-btn--ghost kxd-os-btn--sm${view === opt.id ? " kxd-os-btn--active" : ""}`}
              onClick={() => setView(opt.id)}
            >
              {opt.label}
            </button>
          ))}
          <Link href="/admin/collections/client-tasks/create" className="kxd-os-btn kxd-os-btn--ghost kxd-os-btn--sm">
            New task
          </Link>
        </div>

        <input
          className="kxd-notif-select"
          type="search"
          placeholder="Search tasks, clients, categories, labels…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search work"
          style={{ width: "100%", maxWidth: "28rem", marginBottom: "1rem" }}
        />

        {view === "kanban" ? (
          <WorkKanban byStatus={byStatus} columns={KANBAN_STATUSES} showClient />
        ) : null}

        {view === "by-client" ? (
          <KxdSection label="By client">
            <div className="kxd-os-list-stack">
              {data.byClient.map((row) => (
                <OpsListRow key={row.clientId} href={row.href}>
                  <p className="kxd-os-body">{row.clientName}</p>
                  <p className="kxd-os-meta">
                    {row.count} open · {row.blocked} blocked
                  </p>
                </OpsListRow>
              ))}
            </div>
          </KxdSection>
        ) : null}

        {view === "by-category" ? (
          <div className="kxd-os-operations-columns">
            {byCategory.map(([category, tasks]) => (
              <KxdSection key={category} label={TASK_CATEGORY_LABELS[category as keyof typeof TASK_CATEGORY_LABELS] ?? category}>
                <div className="kxd-os-list-stack">
                  {tasks.slice(0, 8).map((task) => (
                    <OpsListRow key={task.id} href={task.href}>
                      <p className="kxd-os-body">{task.title}</p>
                      <p className="kxd-os-meta">{task.clientName} · {task.status}</p>
                    </OpsListRow>
                  ))}
                </div>
              </KxdSection>
            ))}
          </div>
        ) : null}

        {view !== "kanban" && view !== "by-client" && view !== "by-category" ? (
          <KxdSection label={VIEW_OPTIONS.find((v) => v.id === view)?.label ?? "Tasks"}>
            <div className="kxd-os-list-stack">
              {filteredTasks.length === 0 ? (
                <p className="kxd-os-meta">No tasks in this view.</p>
              ) : (
                filteredTasks.map((task) => (
                  <OpsListRow key={task.id} href={task.href}>
                    <p className="kxd-os-body">{task.title}</p>
                    <p className="kxd-os-meta">
                      {task.clientName} · {task.status.replace(/-/g, " ")}
                      {task.dueDate ? ` · ${task.dueDate}` : ""}
                    </p>
                  </OpsListRow>
                ))
              )}
            </div>
          </KxdSection>
        ) : null}

        <div style={{ marginTop: "1.5rem" }}>
          <KxdSection label="Portfolio clients" className="kxd-os-operations-section">
            <OpsSectionHead label="Open work by client" href="/admin/operations/clients" />
            <div className="kxd-os-list-stack">
              {data.byClient.slice(0, 12).map((row) => (
                <OpsListRow key={row.clientId} href={row.href}>
                  <p className="kxd-os-body">{row.clientName}</p>
                  <p className="kxd-os-meta">{row.count} open tasks</p>
                </OpsListRow>
              ))}
            </div>
          </KxdSection>
        </div>
      </KxdPage>
    </OperationsShell>
  );
}
