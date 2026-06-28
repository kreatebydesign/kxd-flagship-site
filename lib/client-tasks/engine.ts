import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import {
  clientId,
  clientName,
  daysUntil,
  loadIntelligenceContext,
} from "@/lib/intelligence/context";
import type { IntelligenceDoc } from "@/lib/intelligence/types";
import {
  KANBAN_STATUSES,
  OPEN_STATUSES,
  type ClientTasksMonthActivity,
  type ClientWorkBoardData,
  type ClientWorkSummary,
  type PortalClientTaskItem,
  type TaskListItem,
  type TaskStatus,
  type WorkPortfolioData,
} from "./types";

const COLLECTION = "client-tasks";

type TaskDoc = IntelligenceDoc;

function parseLabels(doc: TaskDoc): string[] {
  if (!Array.isArray(doc.labels)) return [];
  return doc.labels.map((l) =>
    typeof l === "object" && l !== null ? String((l as { label?: string }).label ?? "") : String(l),
  ).filter(Boolean);
}

function toTaskItem(doc: TaskDoc, ctx?: Awaited<ReturnType<typeof loadIntelligenceContext>>): TaskListItem {
  const cid = clientId(doc.client) ?? 0;
  const assigned =
    doc.assignedTo && typeof doc.assignedTo === "object"
      ? String((doc.assignedTo as TaskDoc).email ?? (doc.assignedTo as TaskDoc).name ?? "")
      : null;

  return {
    id: doc.id as number,
    clientId: cid,
    clientName: ctx ? clientName(cid, ctx) : clientName(doc.client),
    projectId:
      doc.project && typeof doc.project === "object"
        ? (doc.project as TaskDoc).id as number
        : doc.project
          ? Number(doc.project)
          : null,
    title: String(doc.title ?? "Task"),
    description: doc.description ? String(doc.description) : null,
    category: doc.category as TaskListItem["category"],
    priority: doc.priority as TaskListItem["priority"],
    status: doc.status as TaskStatus,
    assignedTo: assigned,
    estimatedHours: doc.estimatedHours != null ? Number(doc.estimatedHours) : null,
    actualHours: doc.actualHours != null ? Number(doc.actualHours) : null,
    dueDate: doc.dueDate ? String(doc.dueDate) : null,
    daysUntilDue: daysUntil(doc.dueDate ? String(doc.dueDate) : null),
    blockedReason: doc.blockedReason ? String(doc.blockedReason) : null,
    labels: parseLabels(doc),
    clientVisible: Boolean(doc.clientVisible ?? true),
    href: `/admin/operations/work/${cid}`,
    updatedAt: String(doc.updatedAt ?? doc.createdAt ?? ""),
  };
}

function groupByStatus(tasks: TaskListItem[]): Record<TaskStatus, TaskListItem[]> {
  const groups = Object.fromEntries(
    KANBAN_STATUSES.map((s) => [s, [] as TaskListItem[]]),
  ) as Record<TaskStatus, TaskListItem[]>;
  for (const task of tasks) {
    if (groups[task.status]) groups[task.status].push(task);
  }
  return groups;
}

function isOverdue(task: TaskListItem): boolean {
  if (!task.dueDate || task.status === "completed" || task.status === "cancelled") return false;
  const days = task.daysUntilDue;
  return days != null && days < 0;
}

function isDueToday(task: TaskListItem): boolean {
  if (!task.dueDate || task.status === "completed" || task.status === "cancelled") return false;
  return task.daysUntilDue === 0;
}

function isDueThisWeek(task: TaskListItem): boolean {
  if (!task.dueDate || task.status === "completed" || task.status === "cancelled") return false;
  const days = task.daysUntilDue;
  return days != null && days >= 0 && days <= 7;
}

function pickNextTask(tasks: TaskListItem[]): TaskListItem | null {
  const open = tasks.filter((t) => OPEN_STATUSES.includes(t.status));
  const priorityRank = { critical: 0, high: 1, medium: 2, low: 3 };
  open.sort((a, b) => {
    const pa = priorityRank[a.priority] ?? 9;
    const pb = priorityRank[b.priority] ?? 9;
    if (pa !== pb) return pa - pb;
    const da = a.daysUntilDue ?? 999;
    const db = b.daysUntilDue ?? 999;
    return da - db;
  });
  return open[0] ?? null;
}

async function loadTasks(where?: Record<string, unknown>, limit = 500): Promise<TaskDoc[]> {
  const payload = await getPayload({ config });
  try {
    const result = await payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: COLLECTION as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      where: where as any,
      limit,
      depth: 1,
      sort: "-updatedAt",
      overrideAccess: true,
    });
    return result.docs as TaskDoc[];
  } catch {
    return [];
  }
}

export async function getWorkPortfolio(): Promise<WorkPortfolioData> {
  const [ctx, docs] = await Promise.all([loadIntelligenceContext(), loadTasks()]);
  const tasks = docs.map((d) => toTaskItem(d, ctx));
  const open = tasks.filter((t) => OPEN_STATUSES.includes(t.status));

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const completedThisMonth = tasks.filter((t) => {
    if (t.status !== "completed") return false;
    const d = new Date(t.updatedAt);
    return d >= monthStart;
  }).length;

  const clientMap = new Map<number, { clientName: string; count: number; blocked: number }>();
  for (const t of open) {
    const entry = clientMap.get(t.clientId) ?? { clientName: t.clientName, count: 0, blocked: 0 };
    entry.count += 1;
    if (t.status === "blocked") entry.blocked += 1;
    clientMap.set(t.clientId, entry);
  }

  const byClient = [...clientMap.entries()]
    .map(([clientId, v]) => ({
      clientId,
      clientName: v.clientName,
      count: v.count,
      blocked: v.blocked,
      href: `/admin/operations/work/${clientId}`,
    }))
    .sort((a, b) => b.count - a.count);

  return {
    tasks: open,
    byStatus: groupByStatus(tasks),
    byClient,
    dueToday: open.filter(isDueToday),
    overdue: open.filter(isOverdue),
    waitingOnClient: open.filter((t) => t.status === "waiting-on-client"),
    waitingOnKxd: open.filter((t) => t.status === "waiting-on-kxd"),
    completedRecent: tasks.filter((t) => t.status === "completed").slice(0, 20),
    stats: {
      openCount: open.length,
      blockedCount: open.filter((t) => t.status === "blocked").length,
      dueTodayCount: open.filter(isDueToday).length,
      overdueCount: open.filter(isOverdue).length,
      waitingOnClientCount: open.filter((t) => t.status === "waiting-on-client").length,
      waitingOnKxdCount: open.filter((t) => t.status === "waiting-on-kxd").length,
      completedThisMonth,
      estimatedHoursOpen: open.reduce((sum, t) => sum + (t.estimatedHours ?? 0), 0),
    },
    generatedAt: new Date().toISOString(),
  };
}

export async function getClientWorkBoard(clientId: number): Promise<ClientWorkBoardData | null> {
  const ctx = await loadIntelligenceContext();
  if (!ctx.clientsById.has(clientId)) return null;

  const docs = await loadTasks({ client: { equals: clientId } }, 300);
  const tasks = docs.map((d) => toTaskItem(d, ctx));
  const open = tasks.filter((t) => OPEN_STATUSES.includes(t.status));

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const completedThisMonth = tasks.filter((t) => {
    if (t.status !== "completed") return false;
    return new Date(t.updatedAt) >= monthStart;
  }).length;

  const next = pickNextTask(tasks);
  const inProgress = open.find((t) => t.status === "in-progress");

  return {
    clientId,
    clientName: clientName(clientId, ctx),
    tasks,
    byStatus: groupByStatus(tasks),
    activity: tasks.slice(0, 30),
    completed: tasks.filter((t) => t.status === "completed").slice(0, 30),
    stats: {
      openCount: open.length,
      blockedCount: open.filter((t) => t.status === "blocked").length,
      dueThisWeek: open.filter(isDueThisWeek).length,
      completedThisMonth,
      estimatedHoursOpen: open.reduce((sum, t) => sum + (t.estimatedHours ?? 0), 0),
      currentFocus: inProgress?.title ?? next?.title ?? null,
      nextRecommendedTask: next,
    },
    generatedAt: new Date().toISOString(),
  };
}

export async function getClientWorkSummary(clientId: number): Promise<ClientWorkSummary> {
  const board = await getClientWorkBoard(clientId);
  if (!board) {
    return {
      openCount: 0,
      blockedCount: 0,
      dueThisWeek: 0,
      completedThisMonth: 0,
      estimatedHoursOpen: 0,
      currentFocus: null,
      nextTask: null,
      href: `/admin/operations/work/${clientId}`,
    };
  }

  return {
    openCount: board.stats.openCount,
    blockedCount: board.stats.blockedCount,
    dueThisWeek: board.stats.dueThisWeek,
    completedThisMonth: board.stats.completedThisMonth,
    estimatedHoursOpen: board.stats.estimatedHoursOpen,
    currentFocus: board.stats.currentFocus,
    nextTask: board.stats.nextRecommendedTask,
    href: `/admin/operations/work/${clientId}`,
  };
}

export async function getClientTasksForMonth(
  clientId: number,
  month: number,
  year: number,
): Promise<ClientTasksMonthActivity> {
  const docs = await loadTasks({ client: { equals: clientId } }, 300);
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59);

  let completed = 0;
  let created = 0;
  let hoursEstimated = 0;
  let hoursCompleted = 0;
  let outstanding = 0;
  let blocked = 0;

  for (const doc of docs) {
    const createdAt = new Date(String(doc.createdAt ?? ""));
    const updatedAt = new Date(String(doc.updatedAt ?? ""));
    const status = String(doc.status);

    if (createdAt >= start && createdAt <= end) created += 1;
    if (status === "completed" && updatedAt >= start && updatedAt <= end) {
      completed += 1;
      hoursCompleted += Number(doc.actualHours ?? doc.estimatedHours ?? 0);
    }
    if (OPEN_STATUSES.includes(status as TaskStatus)) {
      outstanding += 1;
      hoursEstimated += Number(doc.estimatedHours ?? 0);
      if (status === "blocked") blocked += 1;
    }
  }

  const velocityLabel =
    completed >= 8 ? "High velocity" : completed >= 3 ? "Steady progress" : "Light month";

  return {
    completed,
    created,
    hoursEstimated,
    hoursCompleted,
    outstanding,
    blocked,
    velocityLabel,
  };
}

export async function getWorkFounderSignals(): Promise<{
  blockedByClient: Array<{ clientId: number; clientName: string; count: number; href: string }>;
  overdueTasks: TaskListItem[];
  highPriority: TaskListItem[];
  waitingOnClient: TaskListItem[];
  waitingOnKxd: TaskListItem[];
  workloadByClient: Array<{ clientId: number; clientName: string; open: number; hours: number; href: string }>;
}> {
  const portfolio = await getWorkPortfolio();
  const highPriority = portfolio.tasks.filter(
    (t) => t.priority === "critical" || t.priority === "high",
  );

  const blockedByClient = portfolio.byClient.filter((c) => c.blocked > 0).map((c) => ({
    clientId: c.clientId,
    clientName: c.clientName,
    count: c.blocked,
    href: c.href,
  }));

  const workloadByClient = portfolio.byClient.map((c) => {
    const clientTasks = portfolio.tasks.filter((t) => t.clientId === c.clientId);
    return {
      clientId: c.clientId,
      clientName: c.clientName,
      open: c.count,
      hours: clientTasks.reduce((s, t) => s + (t.estimatedHours ?? 0), 0),
      href: c.href,
    };
  });

  return {
    blockedByClient,
    overdueTasks: portfolio.overdue.slice(0, 10),
    highPriority: highPriority.slice(0, 10),
    waitingOnClient: portfolio.waitingOnClient.slice(0, 10),
    waitingOnKxd: portfolio.waitingOnKxd.slice(0, 10),
    workloadByClient,
  };
}

export async function getPortalClientTasks(clientId: number): Promise<PortalClientTaskItem[]> {
  const docs = await loadTasks({ client: { equals: clientId } }, 100);
  return docs
    .filter((d) => Boolean(d.clientVisible ?? true) && String(d.status) !== "cancelled")
    .filter((d) => String(d.status) !== "backlog")
    .map((d) => ({
      id: d.id as number,
      title: String(d.title ?? "Task"),
      status: d.status as TaskStatus,
      dueDate: d.dueDate ? String(d.dueDate) : null,
      category: d.category as PortalClientTaskItem["category"],
      waitingOnClient: String(d.status) === "waiting-on-client",
      completed: String(d.status) === "completed",
    }));
}
