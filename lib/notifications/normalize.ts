import "server-only";

import type { BrainSignal, BrainRecommendation } from "@/lib/brain/types";
import type { IntelligenceRecommendation } from "@/lib/intelligence/types";
import type { ReminderItem } from "@/lib/executive-notes/types";
import type { AutomationDoc } from "@/lib/automation/types";
import { clientId, clientName } from "@/lib/intelligence/context";
import type { IntelligenceContext } from "@/lib/intelligence/types";
import type { NotificationItem, NotificationSeverity } from "./types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

function urgencyToSeverity(urgency: string): NotificationSeverity {
  if (urgency === "critical") return "critical";
  if (urgency === "high") return "warning";
  if (urgency === "low") return "info";
  return "warning";
}

function readStateFromDoc(doc: AnyDoc): NotificationItem["status"] {
  if (doc.status === "resolved") return "resolved";
  const meta = (doc.metadata ?? {}) as Record<string, unknown>;
  if (meta.readAt) return "read";
  return "unread";
}

function hrefFromMetadata(meta: Record<string, unknown> | undefined, fallback: string): string {
  if (meta?.href && typeof meta.href === "string") return meta.href;
  return fallback;
}

export function normalizeAutomationNotification(
  doc: AutomationDoc,
  ctx?: IntelligenceContext,
): NotificationItem {
  const meta = (doc.metadata ?? {}) as Record<string, unknown>;
  const cid = clientId(doc.client);
  return {
    id: `auto-${doc.id}`,
    persistedId: doc.id as number,
    virtual: false,
    source: "automation",
    title: String(doc.title ?? "Notification"),
    message: String(doc.summary ?? ""),
    clientId: cid,
    clientName: clientName(doc.client, ctx),
    severity: (doc.severity as NotificationSeverity) ?? "info",
    module: String(doc.module ?? "Automation"),
    status: readStateFromDoc(doc),
    href: hrefFromMetadata(meta, "/admin/operations/automation"),
    createdAt: String(doc.createdAt ?? new Date().toISOString()),
    actionLabel: "Open",
  };
}

export function normalizeBrainSignalToNotification(signal: BrainSignal): NotificationItem {
  return {
    id: `brain-sig-${signal.id}`,
    virtual: true,
    source: "brain",
    title: signal.title,
    message: signal.reason,
    clientId: signal.clientId,
    clientName: signal.clientName,
    severity: urgencyToSeverity(signal.urgency),
    module: signal.relatedModule || "Brain",
    status: "unread",
    href: signal.href ?? "/admin/operations/brain",
    createdAt: new Date().toISOString(),
    actionLabel: "Review",
  };
}

export function normalizeBrainRecommendationToNotification(
  rec: BrainRecommendation,
): NotificationItem {
  return {
    id: `brain-rec-${rec.id}`,
    virtual: true,
    source: "brain",
    title: rec.title,
    message: rec.reason,
    clientId: rec.clientId,
    clientName: rec.clientName,
    severity: urgencyToSeverity(rec.urgency),
    module: rec.relatedModules[0] ?? "Brain",
    status: "unread",
    href: rec.href ?? "/admin/operations/brain",
    createdAt: new Date().toISOString(),
    actionLabel: "Act",
  };
}

export function normalizeFounderPriorityToNotification(
  rec: IntelligenceRecommendation,
): NotificationItem {
  return {
    id: `founder-${rec.id}`,
    virtual: true,
    source: "founder",
    title: rec.title,
    message: rec.reason,
    clientId: rec.clientId,
    clientName: rec.clientName,
    severity: urgencyToSeverity(rec.urgency),
    module: rec.relatedModules[0] ?? "Founder Intelligence",
    status: "unread",
    href: rec.href ?? "/admin/operations/founder-intelligence",
    createdAt: new Date().toISOString(),
    actionLabel: "Review",
  };
}

export function normalizeStrategyReminderToNotification(reminder: ReminderItem): NotificationItem {
  return {
    id: `strategy-${reminder.id}`,
    virtual: true,
    source: "strategy",
    title: reminder.title,
    message: reminder.overdue
      ? "Strategy reminder overdue"
      : `Reminder due ${reminder.reminderDate.slice(0, 10)}`,
    clientId: reminder.clientId,
    clientName: reminder.clientName,
    severity: reminder.overdue ? "critical" : reminder.priority === "high" ? "warning" : "info",
    module: "Strategy Vault",
    status: "unread",
    href: reminder.href,
    createdAt: reminder.reminderDate,
    actionLabel: "Open",
  };
}

export function normalizeReportDueNotification(input: {
  clientId: number;
  clientName: string;
  message: string;
}): NotificationItem {
  return {
    id: `report-due-${input.clientId}`,
    virtual: true,
    source: "reports",
    title: `Report due — ${input.clientName}`,
    message: input.message,
    clientId: input.clientId,
    clientName: input.clientName,
    severity: "warning",
    module: "Reports",
    status: "unread",
    href: "/admin/operations/reports",
    createdAt: new Date().toISOString(),
    actionLabel: "Generate",
  };
}

export function normalizeProposalNotification(proposal: AnyDoc, ctx?: IntelligenceContext): NotificationItem | null {
  const status = String(proposal.status ?? "");
  const title = String(proposal.title ?? "Proposal");
  const cid = clientId(proposal.client);
  const name = clientName(proposal.client, ctx);

  if (status === "viewed" && proposal.viewedAt) {
    return {
      id: `proposal-viewed-${proposal.id}`,
      virtual: true,
      source: "sales",
      title: `Proposal viewed — ${title}`,
      message: `${name} opened the proposal`,
      clientId: cid,
      clientName: name,
      severity: "info",
      module: "Sales",
      status: "unread",
      href: `/admin/sales/proposals/${proposal.id}`,
      createdAt: String(proposal.viewedAt),
      actionLabel: "Open",
    };
  }
  if (status === "approved" && proposal.approvedAt) {
    return {
      id: `proposal-approved-${proposal.id}`,
      virtual: true,
      source: "sales",
      title: `Proposal approved — ${title}`,
      message: `${name} approved the proposal`,
      clientId: cid,
      clientName: name,
      severity: "success",
      module: "Sales",
      status: "unread",
      href: `/admin/sales/proposals/${proposal.id}`,
      createdAt: String(proposal.approvedAt),
      actionLabel: "Open",
    };
  }
  if (["paid", "deposit-paid"].includes(String(proposal.paymentStatus ?? ""))) {
    return {
      id: `proposal-paid-${proposal.id}`,
      virtual: true,
      source: "sales",
      title: `Payment received — ${title}`,
      message: `Proposal payment recorded for ${name}`,
      clientId: cid,
      clientName: name,
      severity: "success",
      module: "Sales",
      status: "unread",
      href: `/admin/sales/proposals/${proposal.id}`,
      createdAt: String(proposal.updatedAt ?? proposal.approvedAt ?? new Date().toISOString()),
      actionLabel: "Open",
    };
  }
  return null;
}

export function normalizeAutomationFailureNotification(
  event: AutomationDoc,
  ctx?: IntelligenceContext,
): NotificationItem {
  const cid = clientId(event.client);
  return {
    id: `auto-fail-${event.id}`,
    virtual: true,
    source: "infrastructure",
    title: `Automation failure — ${String(event.eventName ?? "event")}`,
    message: String(event.errorMessage ?? "Automation event failed"),
    clientId: cid,
    clientName: clientName(event.client, ctx),
    severity: "critical",
    module: String(event.module ?? "Automation"),
    status: "unread",
    href: "/admin/operations/automation",
    createdAt: String(event.createdAt ?? new Date().toISOString()),
    actionLabel: "Review",
  };
}

export function normalizeReportReadyNotification(report: AnyDoc, ctx?: IntelligenceContext): NotificationItem | null {
  const status = String(report.status ?? "");
  if (!["ready", "published"].includes(status)) return null;
  const cid = clientId(report.client);
  return {
    id: `report-ready-${report.id}`,
    virtual: true,
    source: "reports",
    title: `Report ready — ${String(report.title ?? "Monthly Report")}`,
    message: `Status: ${status}`,
    clientId: cid,
    clientName: clientName(report.client, ctx),
    severity: "info",
    module: "Reports",
    status: "unread",
    href: `/admin/operations/reports/${report.id}`,
    createdAt: String(report.updatedAt ?? report.createdAt ?? new Date().toISOString()),
    actionLabel: "Open",
  };
}

const SEVERITY_RANK: Record<NotificationSeverity, number> = {
  critical: 0,
  warning: 1,
  info: 2,
  success: 3,
};

export function sortNotifications(items: NotificationItem[]): NotificationItem[] {
  return [...items].sort((a, b) => {
    const sr = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
    if (sr !== 0) return sr;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

export function dedupeNotifications(items: NotificationItem[]): NotificationItem[] {
  const seen = new Set<string>();
  const out: NotificationItem[] = [];
  for (const item of items) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    out.push(item);
  }
  return out;
}
