import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import { buildBrain } from "@/lib/brain/engine";
import { getAutomationDashboard } from "@/lib/automation/engine";
import { searchExecutiveNotes } from "@/lib/executive-notes/search";
import { clientId, clientName } from "@/lib/intelligence/context";
import type { IntelligenceContext } from "@/lib/intelligence/types";
import { searchPlaybooks, searchPlaybookRuns } from "@/lib/playbooks/search";
import { searchClientSuccessPlans, searchSuccessCheckIns } from "@/lib/client-success/search";
import { searchClientTasks } from "@/lib/client-tasks/search";
import { searchGenesisSessions } from "@/lib/genesis/search";
import { searchLaunchQaSessions } from "@/lib/launch-qa/search";
import { searchLiveIntegrations } from "@/lib/live-integrations/search";
import { getEditionOperationsNavItems, isSearchProviderEnabled } from "@/lib/editions/navigation";
import type { CommandSearchResult, SearchEntityType } from "./types";
import { groupForType } from "./types";

export type SearchProvider = {
  id: string;
  /** Lower runs first in merge; does not affect ranking score */
  order: number;
  lazy?: boolean;
  search: (query: string, ctx: IntelligenceContext) => Promise<CommandSearchResult[]>;
};

function qMatch(query: string, ...fields: (string | null | undefined)[]): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return false;
  return fields.some((f) => String(f ?? "").toLowerCase().includes(q));
}

function docUpdated(doc: Record<string, unknown>): string | null {
  const u = doc.updatedAt ?? doc.createdAt;
  return u ? String(u) : null;
}

function makeResult(
  partial: Omit<CommandSearchResult, "group"> & { type: SearchEntityType },
): CommandSearchResult {
  return {
    ...partial,
    group: groupForType(partial.type),
    actionLabel: partial.actionLabel ?? "Open",
  };
}

export const navigationProvider: SearchProvider = {
  id: "navigation",
  order: 90,
  search: async (query) => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return getEditionOperationsNavItems().slice(0, 12).map((item) =>
        makeResult({
          id: `nav-${item.id}`,
          type: "nav",
          title: item.label,
          subtitle: "Navigate",
          href: item.href,
          icon: "→",
        }),
      );
    }
    return getEditionOperationsNavItems().filter(
      (item) =>
        item.label.toLowerCase().includes(q) || item.href.toLowerCase().includes(q),
    ).map((item) =>
      makeResult({
        id: `nav-${item.id}`,
        type: "nav",
        title: item.label,
        subtitle: "Navigate",
        href: item.href,
        icon: "→",
      }),
    );
  },
};

export const clientsProvider: SearchProvider = {
  id: "clients",
  order: 10,
  search: async (query, ctx) =>
    ctx.clients
      .filter((c) =>
        qMatch(query, String(c.name), String(c.slug), String(c.companyWebsite)),
      )
      .slice(0, 12)
      .map((c) =>
        makeResult({
          id: `client-${c.id}`,
          type: "client",
          title: String(c.name),
          subtitle: String(c.status ?? "Client"),
          href: `/admin/operations/client-command/${c.id}`,
          clientId: c.id as number,
          clientName: String(c.name),
          updatedAt: docUpdated(c),
          icon: "◉",
        }),
      ),
};

export const projectsProvider: SearchProvider = {
  id: "projects",
  order: 20,
  search: async (query, ctx) => {
    const results: CommandSearchResult[] = [];

    for (const p of ctx.projects) {
      const title = String(p.projectName ?? p.title ?? "Project");
      if (!qMatch(query, title, String(p.status))) continue;
      const cid = clientId(p.client);
      results.push(
        makeResult({
          id: `project-${p.id}`,
          type: "project",
          title,
          subtitle: clientName(p.client, ctx),
          href: `/admin/collections/client-projects/${p.id}`,
          clientId: cid,
          clientName: clientName(p.client, ctx),
          updatedAt: docUpdated(p),
          icon: "▣",
        }),
      );
    }

    for (const d of ctx.deliverables) {
      const title = String(d.title ?? "Deliverable");
      if (!qMatch(query, title, String(d.status))) continue;
      results.push(
        makeResult({
          id: `deliverable-${d.id}`,
          type: "deliverable",
          title,
          subtitle: clientName(d.client, ctx),
          href: `/admin/collections/monthly-deliverables/${d.id}`,
          clientId: clientId(d.client),
          clientName: clientName(d.client, ctx),
          updatedAt: docUpdated(d),
          icon: "▣",
        }),
      );
    }

    for (const r of ctx.requests) {
      const title = String(r.title ?? r.requestTitle ?? "Request");
      if (!qMatch(query, title, String(r.status))) continue;
      results.push(
        makeResult({
          id: `request-${r.id}`,
          type: "request",
          title,
          subtitle: `${clientName(r.client, ctx)} · ${String(r.status ?? "")}`,
          href: `/admin/collections/client-requests/${r.id}`,
          clientId: clientId(r.client),
          clientName: clientName(r.client, ctx),
          updatedAt: docUpdated(r),
          icon: "▣",
        }),
      );
    }

    return results.slice(0, 18);
  },
};

export const salesProvider: SearchProvider = {
  id: "sales",
  order: 30,
  search: async (query, ctx) => {
    const results: CommandSearchResult[] = [];

    for (const lead of ctx.salesLeads) {
      const title = String(lead.companyName ?? lead.contactName ?? "Lead");
      if (!qMatch(query, title, String(lead.email), String(lead.status))) continue;
      results.push(
        makeResult({
          id: `lead-${lead.id}`,
          type: "sales-lead",
          title,
          subtitle: String(lead.status ?? "Lead"),
          href: `/admin/sales/leads`,
          updatedAt: docUpdated(lead),
          icon: "◇",
        }),
      );
    }

    for (const p of ctx.proposals) {
      const title = String(p.title ?? p.proposalNumber ?? "Proposal");
      if (!qMatch(query, title, String(p.proposalNumber), String(p.status))) continue;
      results.push(
        makeResult({
          id: `proposal-${p.id}`,
          type: "proposal",
          title,
          subtitle: `${String(p.status ?? "")}${p.proposalNumber ? ` · #${p.proposalNumber}` : ""}`,
          href: `/admin/sales/proposals/${p.id}`,
          clientId: clientId(p.client),
          clientName: clientName(p.client, ctx),
          updatedAt: docUpdated(p),
          icon: "◇",
        }),
      );
    }

    for (const r of ctx.retainers) {
      const label = String(r.planName ?? r.title ?? "Retainer");
      if (!qMatch(query, label, String(r.billingStatus))) continue;
      results.push(
        makeResult({
          id: `retainer-${r.id}`,
          type: "retainer",
          title: label,
          subtitle: `${clientName(r.client, ctx)} · ${String(r.billingStatus ?? "")}`,
          href: `/admin/operations/accounts`,
          clientId: clientId(r.client),
          clientName: clientName(r.client, ctx),
          updatedAt: docUpdated(r),
          icon: "◇",
        }),
      );
    }

    return results.slice(0, 15);
  },
};

export const reportsProvider: SearchProvider = {
  id: "reports",
  order: 40,
  search: async (query, ctx) =>
    ctx.monthlyReports
      .filter((r) => qMatch(query, String(r.title), String(r.status), String(r.reportMonth)))
      .slice(0, 10)
      .map((r) =>
        makeResult({
          id: `report-${r.id}`,
          type: "report",
          title: String(r.title ?? "Monthly Report"),
          subtitle: `${clientName(r.client, ctx)} · ${String(r.status ?? "")}`,
          href: `/admin/operations/reports/${r.id}`,
          clientId: clientId(r.client),
          clientName: clientName(r.client, ctx),
          updatedAt: docUpdated(r),
          icon: "▤",
        }),
      ),
};

export const infrastructureProvider: SearchProvider = {
  id: "infrastructure",
  order: 50,
  search: async (query, ctx) => {
    const results: CommandSearchResult[] = [];

    for (const infra of ctx.infrastructure) {
      const domain = String(infra.primaryDomain ?? "");
      if (!qMatch(query, domain, String(infra.hostingProvider))) continue;
      const cid = clientId(infra.client);
      results.push(
        makeResult({
          id: `infra-${infra.id}`,
          type: "infrastructure",
          title: domain || "Infrastructure",
          subtitle: clientName(infra.client, ctx),
          href: `/admin/operations/infrastructure/${cid}`,
          clientId: cid,
          clientName: clientName(infra.client, ctx),
          updatedAt: docUpdated(infra),
          icon: "⬡",
        }),
      );
    }

    for (const audit of ctx.audits) {
      const url = String(audit.websiteUrl ?? audit.url ?? "Audit");
      if (!qMatch(query, url, String(audit.status))) continue;
      results.push(
        makeResult({
          id: `audit-${audit.id}`,
          type: "audit",
          title: url,
          subtitle: String(audit.status ?? "Audit"),
          href: `/admin/operations/audits`,
          clientId: clientId(audit.client),
          clientName: clientName(audit.client, ctx),
          updatedAt: docUpdated(audit),
          icon: "⬡",
        }),
      );
    }

    return results.slice(0, 12);
  },
};

export const creativeProvider: SearchProvider = {
  id: "creative",
  order: 60,
  search: async (query, ctx) => {
    const results: CommandSearchResult[] = [];

    for (const c of ctx.campaigns) {
      const title = String(c.campaignTitle ?? c.title ?? "Campaign");
      if (!qMatch(query, title, String(c.status))) continue;
      results.push(
        makeResult({
          id: `campaign-${c.id}`,
          type: "campaign",
          title,
          subtitle: `${clientName(c.client, ctx)} · ${String(c.status ?? "")}`,
          href: `/admin/collections/creative-campaigns/${c.id}`,
          clientId: clientId(c.client),
          clientName: clientName(c.client, ctx),
          updatedAt: docUpdated(c),
          icon: "✦",
        }),
      );
    }

    for (const f of ctx.flyers) {
      const title = String(f.flyerTitle ?? f.title ?? "Flyer");
      if (!qMatch(query, title)) continue;
      results.push(
        makeResult({
          id: `flyer-${f.id}`,
          type: "creative-asset",
          title,
          subtitle: `${clientName(f.client, ctx)} · Flyer`,
          href: `/admin/collections/flyer-requests/${f.id}`,
          clientId: clientId(f.client),
          clientName: clientName(f.client, ctx),
          updatedAt: docUpdated(f),
          icon: "✦",
        }),
      );
    }

    for (const v of ctx.videos) {
      const title = String(v.videoTitle ?? v.title ?? "Video");
      if (!qMatch(query, title)) continue;
      results.push(
        makeResult({
          id: `video-${v.id}`,
          type: "creative-asset",
          title,
          subtitle: `${clientName(v.client, ctx)} · Video`,
          href: `/admin/collections/promo-video-requests/${v.id}`,
          clientId: clientId(v.client),
          clientName: clientName(v.client, ctx),
          updatedAt: docUpdated(v),
          icon: "✦",
        }),
      );
    }

    for (const s of ctx.socialPosts) {
      const title = String(s.postTitle ?? s.title ?? "Social Post");
      if (!qMatch(query, title)) continue;
      results.push(
        makeResult({
          id: `social-${s.id}`,
          type: "creative-asset",
          title,
          subtitle: `${clientName(s.client, ctx)} · Social`,
          href: `/admin/collections/social-post-requests/${s.id}`,
          clientId: clientId(s.client),
          clientName: clientName(s.client, ctx),
          updatedAt: docUpdated(s),
          icon: "✦",
        }),
      );
    }

    return results.slice(0, 15);
  },
};

export const strategyProvider: SearchProvider = {
  id: "strategy",
  order: 70,
  search: async (query, ctx) => {
    const results: CommandSearchResult[] = [];

    for (const e of ctx.executiveTimeline) {
      const title = String(e.title ?? "");
      if (!qMatch(query, title, String(e.category))) continue;
      const cid = clientId(e.client);
      results.push(
        makeResult({
          id: `timeline-${e.id}`,
          type: "timeline",
          title,
          subtitle: String(e.category ?? "Timeline"),
          href: cid ? `/admin/operations/timeline/${cid}` : "/admin/operations/timeline",
          clientId: cid,
          clientName: clientName(e.client, ctx),
          updatedAt: docUpdated(e),
          icon: "◈",
        }),
      );
    }

    for (const e of ctx.timeline) {
      const title = String(e.title ?? e.eventTitle ?? "");
      const kind = String(e.eventType ?? e.category ?? "");
      if (!qMatch(query, title, kind)) continue;
      const isMeeting = kind.toLowerCase().includes("meeting");
      const cid = clientId(e.client);
      results.push(
        makeResult({
          id: `event-${e.id}`,
          type: isMeeting ? "meeting" : "timeline",
          title: title || "Event",
          subtitle: `${clientName(e.client, ctx)} · ${kind}`,
          href: cid ? `/admin/operations/timeline/${cid}` : "/admin/operations/timeline",
          clientId: cid,
          clientName: clientName(e.client, ctx),
          updatedAt: docUpdated(e),
          icon: "◈",
        }),
      );
    }

    const notes = await searchExecutiveNotes({ q: query, limit: 12 });
    for (const note of notes) {
      results.push(
        makeResult({
          id: `note-${note.id}`,
          type: "note",
          title: note.title,
          subtitle: `${note.clientName} · ${note.noteType}`,
          href: note.href,
          clientId: note.clientId,
          clientName: note.clientName,
          icon: "◈",
        }),
      );
    }

    return results.slice(0, 18);
  },
};

export const portalUsersProvider: SearchProvider = {
  id: "portal-users",
  order: 75,
  search: async (query, ctx) =>
    ctx.portalUsers
      .filter((u) =>
        qMatch(query, String(u.name), String(u.email), String(u.role)),
      )
      .slice(0, 8)
      .map((u) =>
        makeResult({
          id: `portal-${u.id}`,
          type: "portal-user",
          title: String(u.name ?? u.email ?? "Portal User"),
          subtitle: `${clientName(u.client, ctx)} · ${String(u.role ?? "")}`,
          href: `/admin/collections/portal-users/${u.id}`,
          clientId: clientId(u.client),
          clientName: clientName(u.client, ctx),
          updatedAt: docUpdated(u),
          icon: "◉",
        }),
      ),
};

export const automationProvider: SearchProvider = {
  id: "automation",
  order: 80,
  lazy: true,
  search: async (query) => {
    if (query.trim().length < 2) return [];
    const dash = await getAutomationDashboard();
    return dash.recentEvents
      .filter((e) =>
        qMatch(query, String(e.eventName), String(e.module), String(e.status)),
      )
      .slice(0, 8)
      .map((e) =>
        makeResult({
          id: `auto-${e.id}`,
          type: "automation-event",
          title: String(e.eventName ?? "Automation Event"),
          subtitle: `${String(e.module ?? "")} · ${String(e.status ?? "")}`,
          href: "/admin/operations/automation",
          clientId: clientId(e.client),
          updatedAt: e.createdAt ? String(e.createdAt) : null,
          icon: "⚙",
        }),
      );
  },
};

export const brainProvider: SearchProvider = {
  id: "brain",
  order: 85,
  lazy: true,
  search: async (query) => {
    if (query.trim().length < 2) return [];
    const snapshot = await buildBrain();
    const q = query.trim().toLowerCase();
    const results: CommandSearchResult[] = [];

    for (const s of snapshot.signals) {
      if (!qMatch(query, s.title, s.reason)) continue;
      results.push(
        makeResult({
          id: `signal-${s.id}`,
          type: "brain-signal",
          title: s.title,
          subtitle: s.reason.slice(0, 80),
          href: s.href ?? "/admin/operations/brain",
          clientId: s.clientId,
          clientName: s.clientName,
          icon: "◐",
          actionLabel: "Review",
        }),
      );
    }

    for (const r of snapshot.recommendations) {
      if (!qMatch(query, r.title, r.reason)) continue;
      results.push(
        makeResult({
          id: `rec-${r.id}`,
          type: "brain-recommendation",
          title: r.title,
          subtitle: r.reason.slice(0, 80),
          href: r.href ?? "/admin/operations/brain",
          clientId: r.clientId,
          clientName: r.clientName,
          icon: "◐",
          actionLabel: "Act",
        }),
      );
    }

    return results.slice(0, 10);
  },
};

export const brandKitsProvider: SearchProvider = {
  id: "brand-kits",
  order: 65,
  lazy: true,
  search: async (query) => {
    if (query.trim().length < 2) return [];
    const payload = await getPayload({ config });
    try {
      const kits = await payload.find({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        collection: "brand-kits" as any,
        where: { kitName: { contains: query } },
        limit: 8,
        depth: 1,
        overrideAccess: true,
      });
      return (kits.docs as Record<string, unknown>[]).map((k) =>
        makeResult({
          id: `kit-${k.id}`,
          type: "brand-kit",
          title: String(k.kitName ?? k.title ?? "Brand Kit"),
          subtitle: clientName(k.client),
          href: `/admin/collections/brand-kits/${k.id}`,
          clientId: clientId(k.client),
          clientName: clientName(k.client),
          updatedAt: docUpdated(k),
          icon: "✦",
        }),
      );
    } catch {
      return [];
    }
  },
};

export const creativeAssetsProvider: SearchProvider = {
  id: "creative-assets",
  order: 66,
  lazy: true,
  search: async (query) => {
    if (query.trim().length < 2) return [];
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
      return (assets.docs as Record<string, unknown>[]).map((a) =>
        makeResult({
          id: `asset-${a.id}`,
          type: "creative-asset",
          title: String(a.title ?? "Asset"),
          subtitle: clientName(a.client),
          href: `/admin/collections/creative-assets/${a.id}`,
          clientId: clientId(a.client),
          clientName: clientName(a.client),
          updatedAt: docUpdated(a),
          icon: "✦",
        }),
      );
    } catch {
      return [];
    }
  },
};

export const playbooksProvider: SearchProvider = {
  id: "playbooks",
  order: 64,
  lazy: true,
  search: async (query) => {
    const [playbooks, runs] = await Promise.all([
      searchPlaybooks(query),
      searchPlaybookRuns(query),
    ]);
    return [...playbooks, ...runs];
  },
};

export const clientSuccessProvider: SearchProvider = {
  id: "client-success",
  order: 62,
  lazy: true,
  search: async (query) => {
    const [plans, checkIns] = await Promise.all([
      searchClientSuccessPlans(query),
      searchSuccessCheckIns(query),
    ]);
    return [...plans, ...checkIns];
  },
};

export const clientTasksProvider: SearchProvider = {
  id: "client-tasks",
  order: 63,
  lazy: true,
  search: async (query) => searchClientTasks(query),
};

export const genesisProvider: SearchProvider = {
  id: "genesis",
  order: 61,
  lazy: true,
  search: async (query) => {
    const sessions = await searchGenesisSessions(query);
    return sessions.map((s) =>
      makeResult({
        id: `genesis-${s.id}`,
        type: "genesis-session",
        title: s.sessionLabel,
        subtitle: `${s.templateId.replace(/-/g, " ")} · ${s.progressPercent}% · ${s.status}`,
        clientName: s.clientName,
        href: s.href,
        updatedAt: s.updatedAt,
        icon: "◇",
        actionLabel: "Open",
      }),
    );
  },
};

export const launchQaProvider: SearchProvider = {
  id: "launch-qa",
  order: 59,
  lazy: true,
  search: async (query) => {
    const sessions = await searchLaunchQaSessions(query);
    return sessions.map((s) =>
      makeResult({
        id: `launch-qa-${s.id}`,
        type: "launch-qa-check",
        title: `Launch QA — ${s.clientName}`,
        subtitle: `${s.readinessScore}% · ${s.status}${s.websiteUrl ? ` · ${s.websiteUrl}` : ""}`,
        clientId: s.clientId,
        clientName: s.clientName,
        href: s.href,
        updatedAt: s.updatedAt,
        icon: "✓",
        actionLabel: "Open",
      }),
    );
  },
};

export const integrationsProvider: SearchProvider = {
  id: "integrations",
  order: 57,
  lazy: true,
  search: async (query) => searchLiveIntegrations(query),
};

/** All registered providers — extend by adding to this array */
export const SEARCH_PROVIDERS: SearchProvider[] = [
  navigationProvider,
  clientsProvider,
  projectsProvider,
  salesProvider,
  reportsProvider,
  infrastructureProvider,
  creativeProvider,
  brandKitsProvider,
  creativeAssetsProvider,
  strategyProvider,
  playbooksProvider,
  clientSuccessProvider,
  genesisProvider,
  launchQaProvider,
  integrationsProvider,
  clientTasksProvider,
  portalUsersProvider,
  automationProvider,
  brainProvider,
];

export async function runSearchProviders(
  query: string,
  ctx: IntelligenceContext,
): Promise<CommandSearchResult[]> {
  const q = query.trim();
  const active = SEARCH_PROVIDERS.filter(
    (p) => (!p.lazy || q.length >= 2) && isSearchProviderEnabled(p.id),
  );

  const batches = await Promise.all(active.map((p) => p.search(q, ctx)));
  return batches.flat();
}
