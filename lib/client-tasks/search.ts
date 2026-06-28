import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import type { CommandSearchResult } from "@/lib/search/types";
import { groupForType } from "@/lib/search/types";

export async function searchClientTasks(query: string): Promise<CommandSearchResult[]> {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];

  const payload = await getPayload({ config });
  try {
    const result = await payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "client-tasks" as any,
      limit: 12,
      depth: 1,
      sort: "-updatedAt",
      overrideAccess: true,
    });

    return (result.docs as Record<string, unknown>[])
      .filter((t) => {
        const client = t.client as Record<string, unknown> | number;
        const clientName = typeof client === "object" ? String(client.name ?? "") : "";
        return (
          String(t.title ?? "").toLowerCase().includes(q) ||
          clientName.toLowerCase().includes(q) ||
          String(t.status ?? "").includes(q) ||
          String(t.category ?? "").includes(q)
        );
      })
      .map((t) => {
        const client = t.client as Record<string, unknown>;
        const cid = client?.id as number;
        return {
          id: `client-task-${t.id}`,
          type: "client-task" as const,
          group: groupForType("client-task"),
          title: String(t.title ?? "Task"),
          subtitle: `${String(t.status ?? "")} · ${String(client?.name ?? "")}`,
          clientId: cid,
          clientName: String(client?.name ?? ""),
          href: `/admin/operations/work/${cid}`,
          actionLabel: "Open",
          icon: "▣",
          updatedAt: t.updatedAt ? String(t.updatedAt) : null,
        };
      });
  } catch {
    return [];
  }
}
