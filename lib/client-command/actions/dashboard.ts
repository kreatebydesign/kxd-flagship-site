import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import type { ClientPrioritiesWidget, ClientPrioritiesWidgetItem } from "./types";

const COLLECTION = "client-actions";
const OPEN = ["pending", "in-progress", "waiting"];

function relId(value: unknown): number | null {
  if (typeof value === "number") return value;
  if (typeof value === "object" && value !== null && "id" in value) {
    return Number((value as { id: number }).id);
  }
  return null;
}

function clientName(raw: unknown): string {
  if (typeof raw === "object" && raw !== null && "name" in raw) {
    return String((raw as { name: string }).name);
  }
  return "Client";
}

function isDueToday(dateStr: string): boolean {
  const due = new Date(dateStr);
  const now = new Date();
  return (
    due.getFullYear() === now.getFullYear() &&
    due.getMonth() === now.getMonth() &&
    due.getDate() === now.getDate()
  );
}

export async function loadClientPrioritiesWidget(): Promise<ClientPrioritiesWidget> {
  const payload = await getPayload({ config });
  const now = new Date();

  const [actionsR, commsR] = await Promise.all([
    payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: COLLECTION as any,
      where: { status: { in: OPEN } },
      limit: 200,
      depth: 1,
      sort: "-priority",
      overrideAccess: true,
    }),
    payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "client-communications" as any,
      where: { status: { equals: "needs_reply" } },
      limit: 50,
      depth: 1,
      overrideAccess: true,
    }),
  ]);

  const critical: ClientPrioritiesWidgetItem[] = [];
  const high: ClientPrioritiesWidgetItem[] = [];
  const dueToday: ClientPrioritiesWidgetItem[] = [];
  const overdue: ClientPrioritiesWidgetItem[] = [];

  for (const doc of actionsR.docs) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const row = doc as Record<string, any>;
    const clientId = relId(row.client);
    if (!clientId) continue;

    const item: ClientPrioritiesWidgetItem = {
      id: row.id as number,
      clientId,
      clientName: clientName(row.client),
      title: String(row.title ?? "Action"),
      priority: String(row.priority ?? "medium") as ClientPrioritiesWidgetItem["priority"],
      status: String(row.status ?? "pending") as ClientPrioritiesWidgetItem["status"],
      dueDate: row.dueDate ? String(row.dueDate) : null,
      href: `/admin/operations/client-command/${clientId}?tab=actions`,
      bucket: "high",
    };

    if (row.priority === "critical") {
      item.bucket = "critical";
      critical.push(item);
    } else if (row.priority === "high") {
      high.push(item);
    }

    if (row.dueDate) {
      const due = new Date(String(row.dueDate));
      if (due < now) {
        item.bucket = "overdue";
        overdue.push(item);
      } else if (isDueToday(String(row.dueDate))) {
        item.bucket = "due-today";
        dueToday.push(item);
      }
    }
  }

  const needsReply: ClientPrioritiesWidgetItem[] = [];
  for (const doc of commsR.docs) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const row = doc as Record<string, any>;
    const clientId = relId(row.client);
    if (!clientId) continue;
    needsReply.push({
      id: row.id as number,
      clientId,
      clientName: clientName(row.client),
      title: String(row.subject ?? row.summary ?? "Needs reply"),
      priority: "high",
      status: "pending",
      dueDate: null,
      href: `/admin/operations/client-command/${clientId}?tab=emails`,
      bucket: "needs-reply",
    });
  }

  return {
    critical: critical.slice(0, 8),
    high: high.slice(0, 8),
    dueToday: dueToday.slice(0, 8),
    overdue: overdue.slice(0, 8),
    needsReply: needsReply.slice(0, 8),
    totals: {
      critical: critical.length,
      high: high.length,
      dueToday: dueToday.length,
      overdue: overdue.length,
      needsReply: needsReply.length,
    },
  };
}
