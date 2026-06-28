import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import type { CommandSearchResult } from "@/lib/search/types";
import { groupForType } from "@/lib/search/types";

export async function searchClientSuccessPlans(query: string): Promise<CommandSearchResult[]> {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];

  const payload = await getPayload({ config });
  try {
    const plans = await payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "client-success-plans" as any,
      limit: 8,
      depth: 1,
      overrideAccess: true,
    });

    return (plans.docs as Record<string, unknown>[])
      .filter((p) => {
        const client = p.client as Record<string, unknown> | number;
        const clientName = typeof client === "object" ? String(client.name ?? "") : "";
        return (
          clientName.toLowerCase().includes(q) ||
          String(p.currentFocus ?? "").toLowerCase().includes(q) ||
          String(p.quarterlyGoals ?? "").toLowerCase().includes(q) ||
          q.includes("success plan") ||
          q.includes("quarterly")
        );
      })
      .map((p) => {
        const client = p.client as Record<string, unknown>;
        const cid = client?.id as number;
        return {
          id: `success-plan-${p.id}`,
          type: "success-plan" as const,
          group: groupForType("success-plan"),
          title: `Success Plan — ${String(client?.name ?? "Client")}`,
          subtitle: String(p.currentFocus ?? "Client success plan"),
          clientId: cid,
          clientName: String(client?.name ?? ""),
          href: `/admin/operations/client-success/${cid}`,
          actionLabel: "Open",
          icon: "◆",
          updatedAt: p.updatedAt ? String(p.updatedAt) : null,
        };
      });
  } catch {
    return [];
  }
}

export async function searchSuccessCheckIns(query: string): Promise<CommandSearchResult[]> {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];

  const payload = await getPayload({ config });
  try {
    const checkIns = await payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "success-check-ins" as any,
      limit: 8,
      sort: "-meetingDate",
      depth: 1,
      overrideAccess: true,
    });

    return (checkIns.docs as Record<string, unknown>[])
      .filter((c) => {
        const client = c.client as Record<string, unknown> | number;
        const clientName = typeof client === "object" ? String(client.name ?? "") : "";
        return (
          clientName.toLowerCase().includes(q) ||
          String(c.summary ?? "").toLowerCase().includes(q) ||
          q.includes("check-in") ||
          q.includes("check in")
        );
      })
      .map((c) => {
        const client = c.client as Record<string, unknown>;
        const cid = client?.id as number;
        return {
          id: `success-checkin-${c.id}`,
          type: "success-check-in" as const,
          group: groupForType("success-check-in"),
          title: `Check-In — ${String(client?.name ?? "Client")}`,
          subtitle: String(c.summary ?? "Success check-in"),
          clientId: cid,
          clientName: String(client?.name ?? ""),
          href: `/admin/operations/client-success/${cid}`,
          actionLabel: "Open",
          icon: "◆",
          updatedAt: c.meetingDate ? String(c.meetingDate) : null,
        };
      });
  } catch {
    return [];
  }
}
