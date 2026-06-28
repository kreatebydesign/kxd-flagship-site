import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import { buildBrain } from "@/lib/brain/engine";
import { loadBrainMemory, getSuppressedRecommendationIds } from "@/lib/brain/memory";
import type { BrainMemoryRecord } from "@/lib/brain/types";
import { getAutomationDashboard } from "@/lib/automation/engine";
import type { AutomationDoc } from "@/lib/automation/types";
import {
  getOverdueReminders,
  getRemindersDueToday,
} from "@/lib/executive-notes/reminders";
import { getFounderInsights } from "@/lib/intelligence/engine";
import { loadIntelligenceContext, clientId, clientName } from "@/lib/intelligence/context";
import { getReportingDashboard } from "@/lib/reporting/engine";
import {
  dedupeNotifications,
  normalizeAutomationFailureNotification,
  normalizeAutomationNotification,
  normalizeBrainRecommendationToNotification,
  normalizeBrainSignalToNotification,
  normalizeFounderPriorityToNotification,
  normalizeProposalNotification,
  normalizeReportDueNotification,
  normalizeReportReadyNotification,
  normalizeStrategyReminderToNotification,
  sortNotifications,
} from "./normalize";
import type {
  NotificationCenterData,
  NotificationCenterSummary,
  NotificationFilters,
  NotificationItem,
} from "./types";

const NOTIFICATIONS_COLLECTION = "automation-notifications";
const IGNORE_WINDOW_MS = 30 * 86_400_000;
const RECENT_RESOLVED_MS = 7 * 86_400_000;
const PROPOSAL_WINDOW_MS = 14 * 86_400_000;

function isVirtualIgnored(id: string, memory: BrainMemoryRecord[]): boolean {
  const now = Date.now();
  for (const event of memory) {
    if (event.recommendationId !== id || event.action !== "ignored") continue;
    if (now - new Date(event.createdAt).getTime() < IGNORE_WINDOW_MS) return true;
  }
  return false;
}

function applyVirtualMemoryState(
  items: NotificationItem[],
  memory: BrainMemoryRecord[],
): NotificationItem[] {
  const completed = new Set(
    memory.filter((m) => m.action === "completed").map((m) => m.recommendationId),
  );
  const dismissed = new Set(
    memory.filter((m) => m.action === "dismissed").map((m) => m.recommendationId),
  );

  return items.map((item) => {
    if (!item.virtual) return item;
    if (completed.has(item.id)) return { ...item, status: "resolved" };
    if (dismissed.has(item.id)) return { ...item, status: "read" };
    return item;
  });
}

function applyFilters(items: NotificationItem[], filters?: NotificationFilters): NotificationItem[] {
  if (!filters) return items;

  return items.filter((item) => {
    if (filters.severity && filters.severity !== "all" && item.severity !== filters.severity) {
      return false;
    }
    if (filters.module && filters.module !== "all" && item.module !== filters.module) {
      return false;
    }
    if (
      filters.clientId &&
      filters.clientId !== "all" &&
      item.clientId !== filters.clientId
    ) {
      return false;
    }
    if (filters.status && filters.status !== "all") {
      if (filters.status === "unread" && item.status !== "unread") return false;
      if (filters.status === "read" && item.status !== "read") return false;
      if (filters.status === "resolved" && item.status !== "resolved") return false;
    }
    return true;
  });
}

function buildSummary(items: NotificationItem[]): NotificationCenterSummary {
  const now = Date.now();
  const today = new Date().toISOString().slice(0, 10);

  let recentlyResolved = 0;
  for (const item of items) {
    if (item.status !== "resolved") continue;
    const age = now - new Date(item.createdAt).getTime();
    if (age <= RECENT_RESOLVED_MS) recentlyResolved += 1;
  }

  return {
    unread: items.filter((i) => i.status === "unread").length,
    critical: items.filter((i) => i.severity === "critical" && i.status !== "resolved").length,
    dueToday: items.filter((i) => {
      if (i.source !== "strategy") return false;
      return i.createdAt.slice(0, 10) === today && i.status !== "resolved";
    }).length,
    recentlyResolved,
  };
}

function extractMeta(items: NotificationItem[]): {
  modules: string[];
  clients: Array<{ id: number; name: string }>;
} {
  const modules = new Set<string>();
  const clientMap = new Map<number, string>();

  for (const item of items) {
    modules.add(item.module);
    if (item.clientId && item.clientName) {
      clientMap.set(item.clientId, item.clientName);
    }
  }

  return {
    modules: [...modules].sort(),
    clients: [...clientMap.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name)),
  };
}

async function collectNotificationItems(): Promise<NotificationItem[]> {
  const payload = await getPayload({ config });
  const ctx = await loadIntelligenceContext();
  const memory = await loadBrainMemory(200);

  const [
    notificationsR,
    brain,
    founder,
    reporting,
    automation,
    dueToday,
    overdue,
  ] = await Promise.all([
    payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: NOTIFICATIONS_COLLECTION as any,
      limit: 100,
      sort: "-createdAt",
      depth: 1,
      overrideAccess: true,
    }),
    buildBrain(),
    getFounderInsights(ctx),
    getReportingDashboard().catch(() => null),
    getAutomationDashboard().catch(() => null),
    getRemindersDueToday(),
    getOverdueReminders(15),
  ]);

  const persisted = (notificationsR.docs as AutomationDoc[]).map((doc) =>
    normalizeAutomationNotification(doc, ctx),
  );

  const virtual: NotificationItem[] = [];
  const proposalCutoff = Date.now() - PROPOSAL_WINDOW_MS;

  for (const sig of brain.signals.slice(0, 8)) {
    const id = `brain-sig-${sig.id}`;
    if (isVirtualIgnored(id, memory)) continue;
    virtual.push(normalizeBrainSignalToNotification(sig));
  }

  for (const rec of brain.recommendations.filter((r) => !r.suppressed).slice(0, 5)) {
    const id = `brain-rec-${rec.id}`;
    if (isVirtualIgnored(id, memory)) continue;
    virtual.push(normalizeBrainRecommendationToNotification(rec));
  }

  for (const rec of founder.recommendations
    .filter((r) => r.urgency === "critical" || r.urgency === "high")
    .slice(0, 5)) {
    const id = `founder-${rec.id}`;
    if (isVirtualIgnored(id, memory)) continue;
    virtual.push(normalizeFounderPriorityToNotification(rec));
  }

  for (const reminder of [...overdue, ...dueToday]) {
    const id = `strategy-${reminder.id}`;
    if (isVirtualIgnored(id, memory)) continue;
    virtual.push(normalizeStrategyReminderToNotification(reminder));
  }

  if (reporting?.clientsWithoutReport) {
    for (const client of reporting.clientsWithoutReport.slice(0, 10)) {
      const cid = clientId(client);
      if (!cid) continue;
      const id = `report-due-${cid}`;
      if (isVirtualIgnored(id, memory)) continue;
      virtual.push(
        normalizeReportDueNotification({
          clientId: cid,
          clientName: clientName(client, ctx),
          message: "Monthly report not yet generated for current period",
        }),
      );
    }
  }

  if (reporting?.recentReports) {
    for (const report of reporting.recentReports.slice(0, 8)) {
      const n = normalizeReportReadyNotification(report, ctx);
      if (!n || isVirtualIgnored(n.id, memory)) continue;
      virtual.push(n);
    }
  }

  for (const proposal of ctx.proposals) {
    const n = normalizeProposalNotification(proposal, ctx);
    if (!n) continue;
    if (new Date(n.createdAt).getTime() < proposalCutoff) continue;
    if (isVirtualIgnored(n.id, memory)) continue;
    virtual.push(n);
  }

  if (automation?.failedEvents) {
    for (const event of automation.failedEvents) {
      const id = `auto-fail-${event.id}`;
      if (isVirtualIgnored(id, memory)) continue;
      virtual.push(normalizeAutomationFailureNotification(event, ctx));
    }
  }

  const merged = applyVirtualMemoryState(
    dedupeNotifications([...persisted, ...virtual]),
    memory,
  );

  return sortNotifications(merged);
}

export async function getNotificationCenter(
  filters?: NotificationFilters,
): Promise<NotificationCenterData> {
  const allItems = await collectNotificationItems();
  const summary = buildSummary(allItems);
  const meta = extractMeta(allItems);
  const items = applyFilters(allItems, filters);

  return {
    items,
    summary,
    modules: meta.modules,
    clients: meta.clients,
  };
}

export async function getNotificationCenterSummary(): Promise<NotificationCenterSummary> {
  const allItems = await collectNotificationItems();
  return buildSummary(allItems);
}

/** Used when resolving virtual notifications to clear brain cache if needed */
export function getVirtualSuppressedIds(memory: BrainMemoryRecord[]): Set<string> {
  return getSuppressedRecommendationIds(memory);
}
