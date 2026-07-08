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
  OpsCard,
  OpsFocusPill,
  OpsKpiStrip,
  OpsListRow,
  OpsQuickGrid,
  OpsSectionHead,
} from "@/components/admin/operations/shared/OpsBriefing";
import {
  KANBAN_STATUSES,
  TASK_CATEGORY_LABELS,
  TASK_PRIORITY_LABELS,
  type TaskListItem,
  type WorkPortfolioData,
} from "@/lib/client-tasks/types";
import {
  sortWorkItemsByPriority,
} from "@/lib/work-items/views";
import {
  WORK_ITEM_STATUS_LABELS,
} from "@/lib/work-items/types";
import { WorkKanban } from "./WorkKanban";

type PortfolioView =
  | "kanban"
  | "today"
  | "this-week"
  | "by-priority"
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
  { id: "today", label: "Today" },
  { id: "this-week", label: "This Week" },
  { id: "by-priority", label: "By Priority" },
  { id: "my-tasks", label: "Assigned to Me" },
  { id: "overdue", label: "Overdue" },
  { id: "blocked", label: "Blocked" },
  { id: "waiting-on-client", label: "Waiting On Client" },
  { id: "waiting-on-kxd", label: "Waiting On KXD" },
  { id: "completed", label: "Completed" },
  { id: "by-client", label: "By Client" },
  { id: "by-category", label: "By Category" },
];

const QUICK_ACTIONS = [
  {
    label: "Create Work Item",
    sub: "New execution task",
    href: "/admin/collections/client-tasks/create",
  },
  {
    label: "Open Client Command",
    sub: "Client workspace hub",
    href: "/admin/operations/client-command",
  },
  {
    label: "Launch Playbook",
    sub: "Run automation",
    href: "/admin/operations/playbooks",
  },
  {
    label: "Run Website Audit",
    sub: "Lead intelligence",
    href: "/admin/operations/audits",
  },
] as const;

function filterForView(
  view: PortfolioView,
  data: WorkPortfolioData,
  adminEmail?: string | null,
): TaskListItem[] {
  switch (view) {
    case "today":
    case "due-today":
      return data.dueToday;
    case "this-week":
      return data.dueThisWeek;
    case "by-priority":
      return sortWorkItemsByPriority(data.tasks);
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
      if (!adminEmail) {
        return data.tasks.filter((t) => t.priority === "critical" || t.priority === "high");
      }
      return data.tasks.filter((t) => t.assignedTo?.toLowerCase() === adminEmail.toLowerCase());
    default:
      return data.tasks;
  }
}

function statusLabel(status: TaskListItem["status"]): string {
  return WORK_ITEM_STATUS_LABELS[status] ?? status.replace(/-/g, " ");
}

function timeGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function greetingName(displayName?: string | null): string {
  if (!displayName?.trim()) return "there";
  return displayName.trim().split(/\s+/)[0] ?? displayName.trim();
}

function executionBrief(stats: WorkPortfolioData["stats"]): {
  healthLine: string;
  focusLabel: string;
  focusDescription: string;
  tone: "default" | "warning" | "critical" | "clear";
  statements: string[];
} {
  let healthLine: string;
  let focusLabel: string;
  let focusDescription: string;
  let tone: "default" | "warning" | "critical" | "clear";

  if (stats.overdueCount > 0) {
    healthLine = "There are overdue work items that need attention.";
    focusLabel = "Attention Needed";
    focusDescription = `${stats.overdueCount} overdue item${stats.overdueCount === 1 ? "" : "s"}.`;
    tone = stats.overdueCount >= 3 ? "critical" : "warning";
  } else if (stats.blockedCount > 0) {
    healthLine = "Some work is blocked and needs review.";
    focusLabel = "Blocked";
    focusDescription = `${stats.blockedCount} item${stats.blockedCount === 1 ? "" : "s"} need review.`;
    tone = "warning";
  } else {
    healthLine = "Agency execution is healthy.";
    focusLabel = "Healthy";
    focusDescription = "Execution pipeline is clear.";
    tone = "clear";
  }

  const statements = [
    stats.overdueCount === 0
      ? "Nothing is overdue."
      : `${stats.overdueCount} item${stats.overdueCount === 1 ? "" : "s"} overdue.`,
    stats.blockedCount === 0
      ? "No work is blocked."
      : `${stats.blockedCount} item${stats.blockedCount === 1 ? "" : "s"} blocked.`,
    stats.waitingOnKxdCount === 0
      ? "No clients are waiting on KXD."
      : `${stats.waitingOnKxdCount} item${stats.waitingOnKxdCount === 1 ? "" : "s"} waiting on KXD.`,
  ];

  return { healthLine, focusLabel, focusDescription, tone, statements };
}

function pickTodaysFocus(data: WorkPortfolioData): TaskListItem[] {
  const seen = new Set<number>();
  const result: TaskListItem[] = [];

  function add(tasks: TaskListItem[]) {
    for (const task of tasks) {
      if (seen.has(task.id)) continue;
      seen.add(task.id);
      result.push(task);
      if (result.length >= 3) return;
    }
  }

  add(sortWorkItemsByPriority(data.dueToday));
  if (result.length < 3) add(sortWorkItemsByPriority(data.overdue));
  if (result.length < 3) {
    add(
      sortWorkItemsByPriority(
        data.tasks.filter((t) => t.priority === "critical" || t.priority === "high"),
      ),
    );
  }
  if (result.length < 3) {
    add(data.tasks.filter((t) => t.status === "in-progress"));
  }

  return result.slice(0, 3);
}

function focusContext(task: TaskListItem): string {
  if (task.daysUntilDue === 0) return "Due today";
  if (task.daysUntilDue != null && task.daysUntilDue < 0) {
    const days = Math.abs(task.daysUntilDue);
    return `${days} day${days === 1 ? "" : "s"} overdue`;
  }
  if (task.status === "in-progress") return "In progress";
  if (task.priority === "critical" || task.priority === "high") {
    return `${TASK_PRIORITY_LABELS[task.priority]} priority`;
  }
  return statusLabel(task.status);
}

function countCompletedThisWeek(completed: TaskListItem[]): number {
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  return completed.filter((task) => {
    const at = new Date(task.updatedAt).getTime();
    return !Number.isNaN(at) && at >= weekAgo;
  }).length;
}

function fmtCompletedDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

export function WorkScreen({
  data,
  initialView,
  adminEmail,
  adminDisplayName,
}: {
  data: WorkPortfolioData;
  initialView?: string;
  adminEmail?: string | null;
  adminDisplayName?: string | null;
}) {
  const [view, setView] = useState<PortfolioView>(
    (VIEW_OPTIONS.find((v) => v.id === initialView)?.id ?? "kanban") as PortfolioView,
  );
  const [search, setSearch] = useState("");

  const brief = useMemo(() => executionBrief(data.stats), [data.stats]);
  const todaysFocus = useMemo(() => pickTodaysFocus(data), [data]);
  const completedThisWeek = useMemo(
    () => countCompletedThisWeek(data.completedRecent),
    [data.completedRecent],
  );
  const recentlyCompleted = useMemo(
    () => data.completedRecent.slice(0, 5),
    [data.completedRecent],
  );

  const q = search.trim().toLowerCase();
  const baseTasks = filterForView(view, data, adminEmail);
  const filteredTasks = q
    ? baseTasks.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.clientName.toLowerCase().includes(q) ||
          t.category.includes(q) ||
          (t.sourceType?.toLowerCase().includes(q) ?? false) ||
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

  const kpiItems = [
    {
      label: "Today's Work",
      value: String(data.stats.dueTodayCount),
      sub: "Due today",
      alert: data.stats.dueTodayCount > 0,
    },
    {
      label: "This Week",
      value: String(data.stats.dueThisWeekCount),
      sub: "Due in 7 days",
    },
    {
      label: "Overdue",
      value: String(data.stats.overdueCount),
      sub: "Past due date",
      alert: data.stats.overdueCount > 0,
    },
    {
      label: "Waiting on Client",
      value: String(data.stats.waitingOnClientCount),
      sub: "Client action needed",
      alert: data.stats.waitingOnClientCount > 0,
    },
    {
      label: "Blocked",
      value: String(data.stats.blockedCount),
      sub: "Needs review",
      alert: data.stats.blockedCount > 0,
    },
    ...(completedThisWeek > 0
      ? [
          {
            label: "Completed This Week",
            value: String(completedThisWeek),
            sub: "Last 7 days",
          },
        ]
      : []),
    {
      label: "Estimated Hours",
      value: `${data.stats.estimatedHoursOpen}h`,
      sub: "Open work load",
    },
  ];

  return (
    <OperationsShell activeId="work">
      <KxdPage className="kxd-os-page--ops">
        <OperationsPageHero
          eyebrow="KXD OS · Work Items"
          title={`${timeGreeting()}, ${greetingName(adminDisplayName)}.`}
          lead={brief.healthLine}
          presence
        />

        <div className="kxd-os-ops-hero-row">
          <ul className="kxd-os-ops-brief-status">
            {brief.statements.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <OpsFocusPill
            label={brief.focusLabel}
            description={brief.focusDescription}
            tone={brief.tone}
          />
        </div>

        <section className="kxd-os-ops-section">
          <OpsSectionHead label="Today's Focus" count={todaysFocus.length || undefined} />
          {todaysFocus.length === 0 ? (
            <OpsCard className="kxd-os-ops-briefing-card">
              <p className="kxd-os-ops-briefing-card__body">No work scheduled today.</p>
            </OpsCard>
          ) : (
            <OpsCard>
              <div className="kxd-os-list-stack">
                {todaysFocus.map((task) => (
                  <OpsListRow key={task.id} href={`/admin/collections/client-tasks/${task.id}`}>
                    <div className="kxd-os-ops-list-row__main">
                      <p className="kxd-os-ops-list-row__title">{task.title}</p>
                      <p className="kxd-os-ops-list-row__meta">
                        {task.clientName ? `${task.clientName} · ` : ""}
                        {focusContext(task)}
                      </p>
                    </div>
                  </OpsListRow>
                ))}
              </div>
            </OpsCard>
          )}
        </section>

        <section className="kxd-os-ops-section">
          <OpsSectionHead label="Execution Snapshot" />
          <OpsKpiStrip items={kpiItems} />
        </section>

        <div className="kxd-os-ops-view-tabs">
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
            New work item
          </Link>
        </div>

        <input
          className="kxd-os-input kxd-os-ops-search"
          type="search"
          placeholder="Search clients, work items, requests, projects..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search work items"
        />

        {data.stats.openCount === 0 ? (
          <section className="kxd-os-ops-section">
            <OpsCard className="kxd-os-ops-briefing-card">
              <h2 className="kxd-os-headline kxd-os-headline--presence">You&apos;re caught up.</h2>
              <p className="kxd-os-ops-briefing-card__body">
                No active work items are currently waiting on KXD.
              </p>
              <div className="kxd-os-mt-page">
                <OpsSectionHead label="Quick actions" />
                <OpsQuickGrid items={[...QUICK_ACTIONS]} />
              </div>
            </OpsCard>
          </section>
        ) : null}

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
                      <p className="kxd-os-meta">{task.clientName} · {statusLabel(task.status)}</p>
                    </OpsListRow>
                  ))}
                </div>
              </KxdSection>
            ))}
          </div>
        ) : null}

        {view !== "kanban" && view !== "by-client" && view !== "by-category" ? (
          <KxdSection label={VIEW_OPTIONS.find((v) => v.id === view)?.label ?? "Work items"}>
            <div className="kxd-os-list-stack">
              {filteredTasks.length === 0 ? (
                <p className="kxd-os-meta">No work items in this view.</p>
              ) : (
                filteredTasks.map((task) => (
                  <OpsListRow key={task.id} href={`/admin/collections/client-tasks/${task.id}`}>
                    <p className="kxd-os-body">{task.title}</p>
                    <p className="kxd-os-meta">
                      {task.clientName} · {statusLabel(task.status)}
                      {task.dueDate ? ` · ${task.dueDate}` : ""}
                      {task.sourceType ? ` · ${task.sourceType.replace(/-/g, " ")}` : ""}
                    </p>
                  </OpsListRow>
                ))
              )}
            </div>
          </KxdSection>
        ) : null}

        {recentlyCompleted.length > 0 ? (
          <section className="kxd-os-ops-section">
            <OpsSectionHead
              label="Recently Completed"
              count={recentlyCompleted.length}
              href="/admin/operations/work?view=completed"
              linkText="View all"
            />
            <OpsCard>
              <div className="kxd-os-list-stack">
                {recentlyCompleted.map((task) => (
                  <OpsListRow key={task.id} href={`/admin/collections/client-tasks/${task.id}`}>
                    <div className="kxd-os-ops-list-row__main">
                      <p className="kxd-os-ops-list-row__title">{task.title}</p>
                      <p className="kxd-os-ops-list-row__meta">
                        {task.clientName}
                        {task.updatedAt ? ` · Completed ${fmtCompletedDate(task.updatedAt)}` : ""}
                      </p>
                    </div>
                  </OpsListRow>
                ))}
              </div>
            </OpsCard>
          </section>
        ) : null}

        <div className="kxd-os-mt-section">
          <KxdSection label="Portfolio clients" className="kxd-os-operations-section">
            <OpsSectionHead label="Open work by client" href="/admin/operations/clients" />
            <div className="kxd-os-list-stack">
              {data.byClient.slice(0, 12).map((row) => (
                <OpsListRow key={row.clientId} href={row.href}>
                  <p className="kxd-os-body">{row.clientName}</p>
                  <p className="kxd-os-meta">{row.count} open work items</p>
                </OpsListRow>
              ))}
            </div>
          </KxdSection>
        </div>
      </KxdPage>
    </OperationsShell>
  );
}
