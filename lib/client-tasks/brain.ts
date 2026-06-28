import "server-only";

import type { BrainPattern, BrainSignal } from "@/lib/brain/types";
import type { IntelligenceContext } from "@/lib/intelligence/types";
import { getWorkFounderSignals } from "./engine";
import type { TaskListItem } from "./types";

function signal(
  item: Omit<BrainSignal, "id" | "estimatedValue"> & { id?: string; estimatedValue?: number | null },
): BrainSignal {
  return {
    estimatedValue: null,
    ...item,
    id: item.id ?? `work-${item.kind}-${item.clientId ?? item.title}`,
  };
}

export async function buildWorkTaskSignals(ctx: IntelligenceContext): Promise<BrainSignal[]> {
  const work = await getWorkFounderSignals();
  const signals: BrainSignal[] = [];

  for (const task of work.overdueTasks.slice(0, 5)) {
    signals.push(
      signal({
        kind: "delivery-risk",
        title: `Overdue task — ${task.title}`,
        reason: `${task.clientName} · due ${task.dueDate ?? "past due"}`,
        urgency: task.priority === "critical" ? "critical" : "high",
        confidence: "high",
        suggestedAction: "Complete or reschedule immediately.",
        relatedModule: "Client Work",
        clientId: task.clientId,
        clientName: task.clientName,
        href: task.href,
      }),
    );
  }

  for (const client of work.blockedByClient.slice(0, 5)) {
    signals.push(
      signal({
        kind: "delivery-risk",
        title: `Blocked work — ${client.clientName}`,
        reason: `${client.count} blocked task(s)`,
        urgency: "high",
        confidence: "high",
        suggestedAction: "Review blockers and unblock delivery.",
        relatedModule: "Client Work",
        clientId: client.clientId,
        clientName: client.clientName,
        href: client.href,
      }),
    );
  }

  for (const task of work.waitingOnClient.slice(0, 4)) {
    signals.push(
      signal({
        kind: "relationship-risk",
        title: `Waiting on client — ${task.title}`,
        reason: `${task.clientName} approval or input required`,
        urgency: "medium",
        confidence: "high",
        suggestedAction: "Follow up with client.",
        relatedModule: "Client Work",
        clientId: task.clientId,
        clientName: task.clientName,
        href: task.href,
      }),
    );
  }

  for (const w of work.workloadByClient.filter((c) => c.open >= 8).slice(0, 3)) {
    signals.push(
      signal({
        kind: "delivery-risk",
        title: `Heavy workload — ${w.clientName}`,
        reason: `${w.open} open tasks · ${w.hours}h estimated`,
        urgency: "medium",
        confidence: "medium",
        suggestedAction: "Assign resources or prioritize backlog.",
        relatedModule: "Client Work",
        clientId: w.clientId,
        clientName: w.clientName,
        href: w.href,
      }),
    );
  }

  return signals;
}

export async function detectWorkTaskPatterns(ctx: IntelligenceContext): Promise<BrainPattern[]> {
  const patterns: BrainPattern[] = [];
  const { getWorkPortfolio } = await import("./engine");
  const portfolio = await getWorkPortfolio();

  for (const client of portfolio.byClient) {
    const cid = client.clientId;
    const clientTasks = portfolio.tasks.filter((t) => t.clientId === cid);
    const waiting = clientTasks.filter((t) => t.status === "waiting-on-client").length;
    const blocked = client.blocked;
    const open = client.count;
    const completedThisMonth = portfolio.completedRecent.filter((t) => t.clientId === cid).length;

    if (waiting >= 3) {
      patterns.push({
        id: `client-delays-approvals-${cid}`,
        label: "Client approval delays",
        description: `${client.clientName} — ${waiting} tasks waiting on client.`,
        severity: "medium",
        clientId: cid,
        clientName: client.clientName,
        metric: waiting,
      });
    }

    if (blocked >= 2) {
      patterns.push({
        id: `too-many-blocked-${cid}`,
        label: "Too many blocked tasks",
        description: `${blocked} blocked items slowing delivery.`,
        severity: "high",
        clientId: cid,
        clientName: client.clientName,
        metric: blocked,
      });
    }

    if (open >= 10 && completedThisMonth < 2) {
      patterns.push({
        id: `project-slowing-${cid}`,
        label: "Project slowing",
        description: `${open} open tasks with low completion this month.`,
        severity: "medium",
        clientId: cid,
        clientName: client.clientName,
        metric: open,
      });
    }

    if (open === 0 && completedThisMonth >= 3) {
      patterns.push({
        id: `ahead-of-schedule-${cid}`,
        label: "Completed ahead of schedule",
        description: `${completedThisMonth} tasks completed this month.`,
        severity: "low",
        clientId: cid,
        clientName: client.clientName,
        metric: completedThisMonth,
      });
    }
  }

  if (portfolio.stats.openCount === 0 && portfolio.tasks.length === 0) {
    for (const client of ctx.clients.filter((c) => String(c.status) === "active").slice(0, 20)) {
      patterns.push({
        id: `no-work-activity-${client.id}`,
        label: "No work activity",
        description: `${String(client.name)} — no client tasks on file.`,
        severity: "low",
        clientId: client.id as number,
        clientName: String(client.name),
        metric: 0,
      });
    }
  }

  return patterns;
}

export function workTaskRecommendationsFromSignals(
  overdue: TaskListItem[],
  blocked: TaskListItem[],
  waitingOnClient: TaskListItem[],
): Array<{ id: string; title: string; action: string; clientId: number; href: string }> {
  const recs: Array<{ id: string; title: string; action: string; clientId: number; href: string }> = [];

  for (const t of overdue.slice(0, 3)) {
    recs.push({
      id: `rec-work-overdue-${t.id}`,
      title: `Overdue — ${t.title}`,
      action: "Follow up and complete",
      clientId: t.clientId,
      href: t.href,
    });
  }

  for (const t of blocked.slice(0, 2)) {
    recs.push({
      id: `rec-work-blocked-${t.id}`,
      title: `Unblock — ${t.title}`,
      action: "Resolve blocker",
      clientId: t.clientId,
      href: t.href,
    });
  }

  for (const t of waitingOnClient.slice(0, 2)) {
    recs.push({
      id: `rec-work-waiting-${t.id}`,
      title: `Client follow-up — ${t.title}`,
      action: "Schedule review with client",
      clientId: t.clientId,
      href: t.href,
    });
  }

  return recs;
}
