import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import type { CommandSearchResult } from "@/lib/search/types";
import { groupForType } from "@/lib/search/types";

export async function searchPlaybooks(query: string): Promise<CommandSearchResult[]> {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];

  const payload = await getPayload({ config });
  try {
    const playbooks = await payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "playbooks" as any,
      where: {
        or: [
          { name: { contains: query } },
          { slug: { contains: query } },
          { description: { contains: query } },
        ],
      },
      limit: 8,
      depth: 0,
      overrideAccess: true,
    });

    return (playbooks.docs as Record<string, unknown>[]).map((p) => ({
      id: `playbook-${p.id}`,
      type: "playbook" as const,
      group: groupForType("playbook"),
      title: String(p.name ?? "Playbook"),
      subtitle: String(p.category ?? "Playbook"),
      href: `/admin/operations/playbooks?playbook=${p.slug}`,
      actionLabel: "Open",
      icon: "▣",
      updatedAt: p.updatedAt ? String(p.updatedAt) : null,
    }));
  } catch {
    return [];
  }
}

export async function searchPlaybookRuns(query: string): Promise<CommandSearchResult[]> {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];

  const payload = await getPayload({ config });
  try {
    const runs = await payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "playbook-runs" as any,
      limit: 8,
      sort: "-updatedAt",
      depth: 1,
      overrideAccess: true,
    });

    return (runs.docs as Record<string, unknown>[])
      .filter((r) => {
        const pb = r.playbook as Record<string, unknown> | number;
        const client = r.client as Record<string, unknown> | number;
        const pbName = typeof pb === "object" ? String(pb.name ?? "") : "";
        const clientName = typeof client === "object" ? String(client.name ?? "") : "";
        return (
          pbName.toLowerCase().includes(q) ||
          clientName.toLowerCase().includes(q) ||
          String(r.status ?? "").toLowerCase().includes(q)
        );
      })
      .map((r) => {
        const pb = r.playbook as Record<string, unknown>;
        const client = r.client as Record<string, unknown>;
        return {
          id: `playbook-run-${r.id}`,
          type: "playbook-run" as const,
          group: groupForType("playbook-run"),
          title: `${String(pb?.name ?? "Playbook")} — ${String(client?.name ?? "Client")}`,
          subtitle: String(r.status ?? "run"),
          href: `/admin/operations/playbooks/runs/${r.id}`,
          clientId: client?.id as number,
          clientName: String(client?.name ?? ""),
          actionLabel: "Open run",
          icon: "▣",
          updatedAt: r.updatedAt ? String(r.updatedAt) : null,
        };
      });
  } catch {
    return [];
  }
}
