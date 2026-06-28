import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import { getExecutiveTimeline } from "@/lib/executive-timeline/data";
import { getClientInfrastructure } from "@/lib/infrastructure/data";
import { fetchClientWorkspace } from "@/lib/executive-client-workspace/fetch-client-workspace";
import { daysSince } from "@/lib/intelligence/context";
import { loadClientCommandCenter } from "./engine";
import { buildWorkspaceQuickActions } from "./workspace-actions";
import type {
  ClientWorkspaceBundle,
  WorkspaceAnalyticsSnapshot,
  WorkspaceFileRow,
  WorkspaceInvoiceRow,
  WorkspaceTimelineEvent,
} from "./workspace-types";
import type { CommandDoc } from "./types";

const TIMELINE_ICONS: Record<string, string> = {
  relationship: "◎",
  project: "▣",
  creative: "◆",
  infrastructure: "⚙",
  website: "◇",
  sales: "◈",
  meeting: "◉",
  finance: "◐",
  launch: "▲",
  general: "·",
};

function timelineIcon(category: string, eventType?: string): string {
  if (eventType?.includes("meeting")) return "◉";
  if (eventType?.includes("invoice") || eventType?.includes("payment")) return "◐";
  if (eventType?.includes("launch") || eventType?.includes("deploy")) return "▲";
  return TIMELINE_ICONS[category] ?? "·";
}

function mapExecutiveTimeline(events: Awaited<ReturnType<typeof getExecutiveTimeline>>): WorkspaceTimelineEvent[] {
  return events.map((e) => ({
    id: `exec-${e.id}`,
    occurredAt: String(e.occurredAt ?? e.createdAt ?? ""),
    icon: timelineIcon(String(e.category ?? "general"), String(e.eventType ?? "")),
    title: String(e.title ?? "Event"),
    details: String(e.summary ?? e.description ?? ""),
    author: e.createdBy ? String(e.createdBy) : e.sourceModule ? String(e.sourceModule) : null,
    category: String(e.category ?? "general"),
    sourceModule: e.sourceModule ? String(e.sourceModule) : null,
    href: e.id ? `/admin/collections/executive-timeline-events/${e.id}` : null,
    pinned: Boolean(e.pinned),
  }));
}

function mapClientTimelineEvents(docs: CommandDoc[]): WorkspaceTimelineEvent[] {
  return docs.map((e) => ({
    id: `client-${e.id}`,
    occurredAt: String(e.eventDate ?? e.createdAt ?? ""),
    icon: timelineIcon(String(e.eventType ?? "general")),
    title: String(e.title ?? "Event"),
    details: String(e.summary ?? ""),
    author: e.source ? String(e.source) : e.createdBy ? String(e.createdBy) : null,
    category: String(e.eventType ?? "general"),
    sourceModule: "client-timeline",
    href: e.id ? `/admin/collections/client-timeline-events/${e.id}` : null,
    pinned: false,
  }));
}

function buildInvoices(proposals: CommandDoc[], retainers: CommandDoc[]): WorkspaceInvoiceRow[] {
  const rows: WorkspaceInvoiceRow[] = [];

  for (const p of proposals) {
    const status = String(p.status ?? "draft");
    const paymentStatus = String(p.paymentStatus ?? "");
    rows.push({
      id: p.id as number,
      title: String(p.title ?? `Proposal ${p.id}`),
      amount:
        p.investment != null
          ? Number(p.investment)
          : p.recurringAmount != null
            ? Number(p.recurringAmount)
            : null,
      status: paymentStatus || status,
      date: (p.paymentDate as string) || (p.updatedAt as string) || null,
      href: `/admin/sales/proposals/${p.id}`,
      source: "proposal",
    });
  }

  for (const r of retainers) {
    if (r.billingStatus === "overdue" || r.nextInvoiceDate) {
      rows.push({
        id: r.id as number,
        title: String(r.retainerName ?? "Retainer"),
        amount: r.monthlyAmount != null ? Number(r.monthlyAmount) : null,
        status: String(r.billingStatus ?? "scheduled"),
        date: (r.nextInvoiceDate as string) || null,
        href: `/admin/collections/retainers/${r.id}`,
        source: "retainer",
      });
    }
  }

  return rows.sort((a, b) => {
    const da = a.date ? new Date(a.date).getTime() : 0;
    const db = b.date ? new Date(b.date).getTime() : 0;
    return db - da;
  });
}

function buildFiles(
  creativeAssets: CommandDoc[],
  brandKits: CommandDoc[],
): WorkspaceFileRow[] {
  const assetRows: WorkspaceFileRow[] = creativeAssets.map((a) => ({
    id: a.id as number,
    title: String(a.assetTitle ?? "Asset"),
    type: String(a.assetType ?? "file"),
    status: a.status ? String(a.status) : null,
    url: a.externalUrl ? String(a.externalUrl) : null,
    href: `/admin/collections/creative-assets/${a.id}`,
    updatedAt: a.updatedAt ? String(a.updatedAt) : null,
  }));

  const kitRows: WorkspaceFileRow[] = brandKits.map((k) => ({
    id: k.id as number,
    title: String(k.brandName ?? k.name ?? "Brand Kit"),
    type: "brand-kit",
    status: k.status ? String(k.status) : null,
    url: null,
    href: `/admin/collections/brand-kits/${k.id}`,
    updatedAt: k.updatedAt ? String(k.updatedAt) : null,
  }));

  return [...assetRows, ...kitRows].sort((a, b) => {
    const da = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
    const db = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
    return db - da;
  });
}

async function fetchDocs(
  collection: string,
  clientId: number,
  sort = "-updatedAt",
  limit = 50,
): Promise<CommandDoc[]> {
  const payload = await getPayload({ config });
  try {
    const result = await payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: collection as any,
      where: { client: { equals: clientId } },
      limit,
      depth: 0,
      sort,
      overrideAccess: true,
    });
    return result.docs as CommandDoc[];
  } catch {
    return [];
  }
}

export async function loadClientWorkspaceBundle(
  clientId: number,
): Promise<ClientWorkspaceBundle | null> {
  const commandCenter = await loadClientCommandCenter(clientId);
  if (!commandCenter) return null;

  const workspace = await fetchClientWorkspace(clientId);
  if (!workspace) return null;

  const [
    executiveTimeline,
    clientTimelineR,
    requests,
    projects,
    retainers,
    proposals,
    notes,
    meetings,
    portalUsers,
    tasks,
    infrastructure,
  ] = await Promise.all([
    getExecutiveTimeline(clientId),
    fetchDocs("client-timeline-events", clientId, "-eventDate", 100),
    fetchDocs("client-requests", clientId, "-createdAt", 80),
    fetchDocs("client-projects", clientId, "-updatedAt", 50),
    fetchDocs("retainers", clientId, "-updatedAt", 20),
    fetchDocs("proposals", clientId, "-updatedAt", 40),
    fetchDocs("executive-notes", clientId, "-updatedAt", 40),
    fetchDocs("success-check-ins", clientId, "-meetingDate", 30),
    fetchDocs("portal-users", clientId, "-updatedAt", 20),
    fetchDocs("client-tasks", clientId, "-updatedAt", 40),
    getClientInfrastructure(clientId),
  ]);

  const timelineEvents = [
    ...mapExecutiveTimeline(executiveTimeline),
    ...mapClientTimelineEvents(clientTimelineR),
  ].sort(
    (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
  );

  const invoices = buildInvoices(proposals, retainers);
  const creativeAssets = await fetchDocs("creative-assets", clientId);
  const brandKits = await fetchDocs("brand-kits", clientId);
  const filesMerged = buildFiles(creativeAssets, brandKits);

  const infraRecord = infrastructure?.record;
  const domains = infraRecord
    ? {
        primaryDomain: infraRecord.primaryDomain ? String(infraRecord.primaryDomain) : null,
        registrar: infraRecord.domainRegistrar ? String(infraRecord.domainRegistrar) : null,
        expiration: infraRecord.domainExpirationDate
          ? String(infraRecord.domainExpirationDate)
          : null,
        sslStatus: infraRecord.sslStatus ? String(infraRecord.sslStatus) : null,
        hosting: infraRecord.hostingProvider ? String(infraRecord.hostingProvider) : null,
        dnsProvider: infraRecord.dnsProvider ? String(infraRecord.dnsProvider) : null,
        infrastructureScore: infrastructure?.score ?? null,
        infrastructureStatus: infraRecord.status ? String(infraRecord.status) : null,
        href: `/admin/operations/infrastructure/${clientId}`,
      }
    : null;

  const client = workspace.client;
  const profile = workspace.profile;
  const row = workspace.row;

  const lifetimeRevenue = row.estimatedAnnualValue ?? workspace.annualValue ?? null;

  const lastContact =
    commandCenter.sections.relationship.lastContact !== "—"
      ? commandCenter.sections.relationship.lastContact
      : null;

  const analytics: WorkspaceAnalyticsSnapshot = {
    revenueOverTime: retainers
      .filter((r) => r.monthlyAmount != null)
      .map((r) => ({
        label: String(r.retainerName ?? "Retainer"),
        value: Number(r.monthlyAmount),
      })),
    projectsCompleted: projects.filter((p) => p.status === "launched").length,
    activeProjects: projects.filter((p) =>
      ["planning", "active", "review", "waiting-on-client"].includes(String(p.status)),
    ).length,
    openRequests: requests.filter((r) =>
      ["new", "triaged", "in-progress", "waiting-on-client"].includes(String(r.status)),
    ).length,
    openTasks: tasks.filter((t) => !["done", "cancelled"].includes(String(t.status))).length,
    websiteAuditScore: commandCenter.sections.website.healthScore,
    averageTurnaroundDays: null,
    meetingCount: meetings.length,
    daysSinceLastContact: lastContact ? daysSince(lastContact) : null,
  };

  const primaryEmail = client.primaryContactEmail
    ? String(client.primaryContactEmail)
    : null;

  return {
    ...commandCenter,
    client,
    profile,
    timelineEvents,
    requestDocs: requests,
    projectDocs: projects,
    retainerDocs: retainers,
    invoices,
    files: filesMerged,
    domains,
    meetingDocs: meetings,
    noteDocs: notes,
    portalUsers,
    taskDocs: tasks,
    workspaceQuickActions: buildWorkspaceQuickActions(clientId, primaryEmail),
    analytics,
    header: {
      companyName: String(client.name ?? row.name),
      logoUrl: commandCenter.hero.logoUrl,
      primaryContact:
        (client.primaryContactName as string) ||
        (profile?.primaryDecisionMaker as string) ||
        null,
      primaryEmail,
      status: String(client.status ?? "active"),
      website: (client.companyWebsite as string) || null,
      industry: (profile?.industry as string) || null,
      monthlyRevenue: row.monthlyRevenue,
      lifetimeRevenue,
      clientSince: profile?.clientSince
        ? String(profile.clientSince)
        : client.createdAt
          ? String(client.createdAt)
          : null,
      healthScore: commandCenter.health.overallScore,
      relationshipStatus: String(
        client.relationshipStatus ?? row.relationshipStatus ?? "healthy",
      ),
      row,
    },
  };
}
