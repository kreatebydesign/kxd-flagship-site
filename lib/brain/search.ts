import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import { searchExecutiveNotes } from "@/lib/executive-notes/search";
import { clientId, clientName } from "@/lib/intelligence/context";
import type { IntelligenceContext } from "@/lib/intelligence/types";
import type { BrainSearchResult } from "./types";

export async function executiveBrainSearch(
  query: string,
  ctx?: IntelligenceContext,
  limit = 40,
): Promise<BrainSearchResult[]> {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const results: BrainSearchResult[] = [];

  if (ctx) {
    for (const client of ctx.clients) {
      if (String(client.name ?? "").toLowerCase().includes(q)) {
        results.push({
          id: `client-${client.id}`,
          type: "client",
          title: String(client.name),
          subtitle: String(client.status ?? ""),
          href: `/admin/operations/client-command/${client.id}`,
          clientId: client.id as number,
          clientName: String(client.name),
        });
      }
    }

    for (const project of ctx.projects) {
      const title = String(project.projectName ?? project.title ?? "Project");
      if (title.toLowerCase().includes(q)) {
        const cid = clientId(project.client);
        results.push({
          id: `project-${project.id}`,
          type: "project",
          title,
          subtitle: clientName(project.client, ctx),
          href: `/admin/collections/client-projects/${project.id}`,
          clientId: cid,
          clientName: clientName(project.client, ctx),
        });
      }
    }

    for (const d of ctx.deliverables) {
      const title = String(d.title ?? "Deliverable");
      if (title.toLowerCase().includes(q)) {
        results.push({
          id: `deliverable-${d.id}`,
          type: "deliverable",
          title,
          subtitle: clientName(d.client, ctx),
          href: `/admin/collections/client-deliverables/${d.id}`,
          clientId: clientId(d.client),
          clientName: clientName(d.client, ctx),
        });
      }
    }

    for (const r of ctx.requests) {
      const title = String(r.title ?? r.requestTitle ?? "Request");
      if (title.toLowerCase().includes(q)) {
        results.push({
          id: `request-${r.id}`,
          type: "request",
          title,
          subtitle: String(r.status ?? ""),
          href: `/admin/operations/requests/${r.id}`,
          clientId: clientId(r.client),
          clientName: clientName(r.client, ctx),
        });
      }
    }

    for (const p of ctx.proposals) {
      const title = String(p.title ?? "Proposal");
      if (title.toLowerCase().includes(q)) {
        results.push({
          id: `proposal-${p.id}`,
          type: "proposal",
          title,
          subtitle: String(p.status ?? ""),
          href: `/admin/sales/proposals/${p.id}`,
          clientId: clientId(p.client),
          clientName: clientName(p.client, ctx),
        });
      }
    }

    for (const report of ctx.monthlyReports) {
      const title = String(report.title ?? "Report");
      if (title.toLowerCase().includes(q)) {
        results.push({
          id: `report-${report.id}`,
          type: "report",
          title,
          subtitle: String(report.status ?? ""),
          href: `/admin/operations/reports/${report.id}`,
          clientId: clientId(report.client),
          clientName: clientName(report.client, ctx),
        });
      }
    }

    for (const event of ctx.executiveTimeline) {
      const title = String(event.title ?? "");
      if (title.toLowerCase().includes(q)) {
        const cid = clientId(event.client);
        results.push({
          id: `timeline-${event.id}`,
          type: "timeline",
          title,
          subtitle: String(event.category ?? ""),
          href: cid ? `/admin/operations/timeline/${cid}` : "/admin/operations/timeline",
          clientId: cid,
          clientName: clientName(event.client, ctx),
        });
      }
    }

    for (const infra of ctx.infrastructure) {
      const domain = String(infra.primaryDomain ?? "");
      if (domain.toLowerCase().includes(q)) {
        results.push({
          id: `infra-${infra.id}`,
          type: "infrastructure",
          title: domain || "Infrastructure",
          subtitle: clientName(infra.client, ctx),
          href: `/admin/operations/infrastructure/${clientId(infra.client)}`,
          clientId: clientId(infra.client),
          clientName: clientName(infra.client, ctx),
        });
      }
    }
  }

  const notes = await searchExecutiveNotes({ q: query, limit: 15 });
  for (const note of notes) {
    results.push({
      id: `note-${note.id}`,
      type: "note",
      title: note.title,
      subtitle: `${note.clientName} · ${note.noteType}`,
      href: note.href,
      clientId: note.clientId,
      clientName: note.clientName,
    });
  }

  const payload = await getPayload({ config });
  try {
    const assets = await payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "creative-assets" as any,
      where: { title: { contains: query } },
      limit: 8,
      depth: 1,
      overrideAccess: true,
    });
    for (const a of assets.docs as Record<string, unknown>[]) {
      results.push({
        id: `asset-${a.id}`,
        type: "asset",
        title: String(a.title ?? "Asset"),
        subtitle: clientName(a.client),
        href: `/admin/collections/creative-assets/${a.id}`,
        clientId: clientId(a.client),
        clientName: clientName(a.client),
      });
    }
  } catch {
    // collection may be empty
  }

  return results.slice(0, limit);
}
