import "server-only";

import {
  ACTIVE_PROJECT_STATUSES,
  OPEN_REQUEST_STATUSES,
  clientId,
  daysSince,
  fmtMoney,
} from "@/lib/intelligence/context";
import {
  EXECUTIVE_STATUS_LABEL,
  EXECUTIVE_TIER_LABEL,
  fmtExecutiveMoney,
  mergeClientWithExecutiveProfile,
} from "@/lib/executive-client-profile";
import { infraStatusLabel } from "@/lib/infrastructure/data";
import { monthLabel } from "@/lib/reporting/templates";
import type { IntelligenceRecommendation } from "@/lib/intelligence/types";
import {
  buildExecutiveBrief,
  estimateImpact,
  formatLastContact,
  formatYearsTogether,
} from "./summary";
import type {
  AutomationSection,
  CommandHero,
  CommandListItem,
  CommandRecommendation,
  CommandSections,
  CommandWidgetInput,
  CreativeSection,
  ProjectsSection,
  RelationshipSection,
  ReportingSection,
  RevenueSection,
  SalesSection,
  WebsiteSection,
} from "./types";

function docTitle(doc: Record<string, unknown>, fallback = "Item"): string {
  return String(
    doc.title ??
      doc.name ??
      doc.projectName ??
      doc.campaignName ??
      doc.requestTitle ??
      fallback,
  );
}

function toListItem(
  doc: Record<string, unknown>,
  opts: { href?: string; meta?: string; status?: string } = {},
): CommandListItem {
  return {
    id: String(doc.id),
    title: docTitle(doc),
    detail: doc.summary ? String(doc.summary) : doc.description ? String(doc.description) : undefined,
    meta: opts.meta,
    href: opts.href,
    status: opts.status ?? (doc.status ? String(doc.status) : undefined),
  };
}

function filterForClient(docs: Record<string, unknown>[], cid: number): Record<string, unknown>[] {
  return docs.filter((d) => clientId(d.client) === cid);
}

export function buildCommandHero(input: CommandWidgetInput): CommandHero {
  const { row, health, timeline, profile, onboardings, projects, clientId: cid, clientName } = input;

  const activeOnboarding = onboardings.find((o) =>
    ["in-progress", "waiting-on-client", "waiting-on-kxd"].includes(String(o.status)),
  );
  const activeProject = projects.find((p) => ACTIVE_PROJECT_STATUSES.has(String(p.status)));

  const currentPhase = activeOnboarding
    ? String(activeOnboarding.currentStage ?? activeOnboarding.stage ?? "Onboarding")
    : activeProject
      ? String(activeProject.phase ?? activeProject.status ?? "Active delivery")
      : row?.clientStatus === "active"
        ? "Steady state"
        : "—";

  const nextMilestone =
    row?.nextAction ??
    (timeline?.upcomingRelated[0]?.title ? String(timeline.upcomingRelated[0].title) : null) ??
    "—";

  const monthly = row?.monthlyRevenue ?? null;
  const lifetime =
    row?.estimatedAnnualValue != null
      ? row.estimatedAnnualValue
      : monthly != null
        ? monthly * 12
        : null;

  return {
    clientId: cid,
    clientName,
    logoUrl: profile?.logoUrl ? String(profile.logoUrl) : null,
    relationshipStatus: row?.relationshipStatus
      ? EXECUTIVE_STATUS_LABEL[row.relationshipStatus]
      : String(input.insights?.relationship.status ?? "—"),
    healthScore: health.overallScore,
    monthlyInvestment: fmtExecutiveMoney(monthly),
    lifetimeRevenue: fmtExecutiveMoney(lifetime),
    accountManager: profile?.primaryDecisionMaker
      ? String(profile.primaryDecisionMaker)
      : "KXD Team",
    currentPhase,
    nextMilestone,
    tier: row?.tier ? EXECUTIVE_TIER_LABEL[row.tier] : null,
  };
}

function buildRelationshipSection(input: CommandWidgetInput): RelationshipSection {
  const { timeline, profile, insights } = input;
  const meetings = timeline
    ? timeline.monthGroups
        .flatMap((g) => g.events)
        .filter((e) => String(e.eventType) === "meeting" || String(e.category) === "meeting")
    : [];

  const highlights: CommandListItem[] = (timeline?.milestones ?? []).slice(0, 5).map((e) => ({
    id: String(e.id),
    title: String(e.title),
    detail: e.summary ? String(e.summary) : undefined,
    meta: e.occurredAt ? String(e.occurredAt).slice(0, 10) : undefined,
    href: `/admin/operations/timeline/${input.clientId}`,
  }));

  const lastContact = timeline?.summary?.lastEventAt ?? null;
  const nextFollowUp = input.row?.nextActionDueDate
    ? String(input.row.nextActionDueDate)
    : input.row?.nextAction ?? "—";

  return {
    yearsTogether: formatYearsTogether(timeline?.summary?.relationshipStart),
    meetingCount: meetings.length,
    lastContact: formatLastContact(lastContact),
    nextFollowUp,
    timelineHighlights: highlights,
    executiveNotes: profile?.strategicNotes
      ? String(profile.strategicNotes)
      : profile?.executiveSummary
        ? String(profile.executiveSummary)
        : insights?.relationship.highlights.join(" · ") ?? null,
  };
}

function buildRevenueSection(input: CommandWidgetInput): RevenueSection {
  const { row, proposals, insights } = input;
  const mrr = row?.monthlyRevenue ?? null;
  const lifetime = row?.estimatedAnnualValue ?? (mrr != null ? mrr * 12 : null);

  const openProposals = proposals.filter((p) =>
    ["draft", "sent", "viewed", "approved"].includes(String(p.status)),
  );
  const pipelineValue = openProposals.reduce((sum, p) => {
    const v = Number(p.monthlyAmount ?? p.totalAmount ?? 0);
    return sum + (Number.isFinite(v) ? v : 0);
  }, 0);

  const growthItems: CommandListItem[] = [];
  if (row?.potentialMonthlyRevenue) {
    growthItems.push({
      id: "expansion",
      title: "Expansion potential",
      detail: fmtExecutiveMoney(row.potentialMonthlyRevenue) + "/mo",
    });
  }
  if (row?.upsellSummary) {
    growthItems.push({
      id: "upsell",
      title: "Upsell opportunity",
      detail: String(row.upsellSummary),
    });
  }
  for (const h of insights?.growth.highlights ?? []) {
    growthItems.push({ id: `growth-${growthItems.length}`, title: h });
  }

  return {
    mrr: fmtExecutiveMoney(mrr),
    lifetimeRevenue: fmtExecutiveMoney(lifetime),
    outstandingInvoices: "—",
    proposalPipeline: pipelineValue > 0 ? fmtMoney(pipelineValue) : "—",
    averageMonthlyValue: fmtExecutiveMoney(mrr),
    growthOpportunities: growthItems.slice(0, 5),
  };
}

function buildProjectsSection(input: CommandWidgetInput): ProjectsSection {
  const { projects, deliverables, requests } = input;

  const active = projects
    .filter((p) => ACTIVE_PROJECT_STATUSES.has(String(p.status)))
    .map((p) =>
      toListItem(p, {
        href: `/admin/collections/client-projects/${p.id}`,
        status: String(p.status),
      }),
    );

  const blocked = projects
    .filter((p) =>
      ["waiting-on-client", "blocked", "on-hold"].includes(String(p.status)),
    )
    .map((p) =>
      toListItem(p, { href: `/admin/collections/client-projects/${p.id}` }),
    );

  const upcoming = projects
    .filter((p) => String(p.status) === "planning")
    .map((p) =>
      toListItem(p, { href: `/admin/collections/client-projects/${p.id}` }),
    );

  const recentlyCompleted = projects
    .filter((p) => ["launched", "archived", "complete", "completed"].includes(String(p.status)))
    .slice(0, 6)
    .map((p) =>
      toListItem(p, { href: `/admin/collections/client-projects/${p.id}` }),
    );

  const deliverableItems = deliverables.slice(0, 8).map((d) =>
    toListItem(d, {
      href: `/admin/collections/client-deliverables/${d.id}`,
      meta: d.dueDate ? `Due ${String(d.dueDate).slice(0, 10)}` : undefined,
    }),
  );

  const requestItems = requests
    .filter((r) => OPEN_REQUEST_STATUSES.has(String(r.status)))
    .slice(0, 8)
    .map((r) =>
      toListItem(r, {
        href: `/admin/operations/requests/${r.id}`,
        meta: r.createdAt ? `${daysSince(r.createdAt as string) ?? "—"}d open` : undefined,
      }),
    );

  return {
    active,
    blocked,
    upcoming,
    recentlyCompleted,
    deliverables: deliverableItems,
    requests: requestItems,
  };
}

function buildWebsiteSection(input: CommandWidgetInput): WebsiteSection {
  const { infrastructure, audits, health, insights } = input;
  const record = infrastructure?.record ?? null;

  const signals: CommandListItem[] = (infrastructure?.healthSignals ?? []).map((s) => ({
    id: s.id,
    title: s.label,
    detail: s.value,
    status: s.status,
  }));

  const auditItems = audits.slice(0, 4).map((a) =>
    toListItem(a, {
      href: a.id ? `/admin/operations/audits?id=${a.id}` : "/admin/operations/audits",
      meta: a.overallScore != null ? `Score ${a.overallScore}` : undefined,
    }),
  );

  const deployments: CommandListItem[] = [];
  if (record?.lastDeploymentAt) {
    deployments.push({
      id: "last-deploy",
      title: "Last deployment",
      meta: String(record.lastDeploymentAt).slice(0, 10),
    });
  }

  return {
    healthScore: health.overallScore,
    healthStatus: insights?.health.status ?? "—",
    infrastructureScore: infrastructure?.score ?? null,
    infrastructureStatus: record ? infraStatusLabel(String(record.status ?? "unknown")) : "No record",
    primaryDomain: record?.primaryDomain ? String(record.primaryDomain) : null,
    hosting: record?.hostingProvider ? String(record.hostingProvider) : null,
    sslStatus: record?.sslStatus ? String(record.sslStatus) : null,
    analytics: record?.analyticsProvider
      ? String(record.analyticsProvider)
      : record?.ga4PropertyId
        ? "GA4 configured"
        : "Not configured",
    searchConsole: record?.searchConsoleStatus
      ? String(record.searchConsoleStatus)
      : "Not configured",
    recentDeployments: deployments,
    audits: auditItems,
    signals,
  };
}

function buildCreativeSection(input: CommandWidgetInput): CreativeSection {
  const mapCreative = (
    docs: Record<string, unknown>[],
    type: string,
    hrefBase: string,
  ): CommandListItem[] =>
    docs.slice(0, 5).map((d) =>
      toListItem(d, {
        href: `${hrefBase}/${d.id}`,
        meta: type,
        status: String(d.status ?? ""),
      }),
    );

  return {
    campaigns: mapCreative(input.campaigns, "Campaign", "/admin/collections/creative-campaigns"),
    videos: mapCreative(input.videos, "Video", "/admin/collections/promo-video-requests"),
    flyers: mapCreative(input.flyers, "Flyer", "/admin/collections/flyer-requests"),
    social: mapCreative(input.socialPosts, "Social", "/admin/collections/social-post-requests"),
    assets: input.creativeAssets.slice(0, 5).map((a) =>
      toListItem(a, { href: `/admin/collections/creative-assets/${a.id}` }),
    ),
    brandKits: input.brandKits.slice(0, 5).map((k) =>
      toListItem(k, { href: `/admin/collections/brand-kits/${k.id}` }),
    ),
  };
}

function buildReportingSection(input: CommandWidgetInput): ReportingSection {
  const sorted = [...input.reports].sort((a, b) => {
    const ay = Number(a.reportingYear) * 100 + Number(a.reportingMonth);
    const by = Number(b.reportingYear) * 100 + Number(b.reportingMonth);
    return by - ay;
  });

  const published = sorted.filter((r) => r.status === "published");
  const totalViews = published.reduce((sum, r) => sum + Number(r.viewCount ?? 0), 0);
  const latest = published[0] ?? sorted[0];

  const latestReport = latest
    ? {
        id: String(latest.id),
        title: String(latest.title ?? "Executive Report"),
        meta: monthLabel(Number(latest.reportingMonth), Number(latest.reportingYear)),
        href: `/admin/operations/reports/${latest.id}`,
        status: String(latest.status),
      }
    : null;

  const historicalReports = published.slice(0, 8).map((r) => ({
    id: String(r.id),
    title: String(r.title ?? "Report"),
    meta: monthLabel(Number(r.reportingMonth), Number(r.reportingYear)),
    href: `/admin/operations/reports/${r.id}`,
    detail: r.viewCount ? `${r.viewCount} view(s)` : undefined,
  }));

  let engagementLabel = "No published reports";
  if (published.length > 0) {
    engagementLabel =
      totalViews > 0
        ? `${totalViews} total view(s) across ${published.length} report(s)`
        : `${published.length} published — not yet viewed in portal`;
  }

  return {
    latestReport,
    historicalReports,
    totalViews,
    engagementLabel,
  };
}

function buildSalesSection(input: CommandWidgetInput): SalesSection {
  const { proposals } = input;
  const won = proposals.filter((p) => p.status === "approved" || p.status === "converted");
  const sent = proposals.filter((p) =>
    ["sent", "viewed", "approved", "converted", "declined"].includes(String(p.status)),
  );
  const rate =
    sent.length > 0 ? `${Math.round((won.length / sent.length) * 100)}%` : "—";

  const openPipeline = proposals.filter((p) =>
    ["draft", "sent", "viewed"].includes(String(p.status)),
  );
  const pipelineValue = openPipeline.reduce(
    (sum, p) => sum + Number(p.monthlyAmount ?? p.totalAmount ?? 0),
    0,
  );

  const toProposal = (p: Record<string, unknown>): CommandListItem =>
    toListItem(p, {
      href: `/admin/sales/proposals/${p.id}`,
      meta: p.monthlyAmount
        ? fmtMoney(Number(p.monthlyAmount)) + "/mo"
        : p.totalAmount
          ? fmtMoney(Number(p.totalAmount))
          : undefined,
      status: String(p.status),
    });

  const opportunities = openPipeline.slice(0, 5).map(toProposal);

  return {
    proposalHistory: proposals.slice(0, 6).map(toProposal),
    conversionRate: rate,
    opportunities,
    pipelineValue: pipelineValue > 0 ? fmtMoney(pipelineValue) : "—",
    pastProposals: proposals
      .filter((p) => ["converted", "declined", "expired"].includes(String(p.status)))
      .slice(0, 6)
      .map(toProposal),
  };
}

function buildAutomationSection(input: CommandWidgetInput): AutomationSection {
  const { automation } = input;

  const mapEvent = (e: Record<string, unknown>): CommandListItem => ({
    id: String(e.id),
    title: `${String(e.module ?? "System")} · ${String(e.eventName ?? "event")}`,
    detail: e.errorMessage ? String(e.errorMessage) : undefined,
    meta: e.createdAt ? String(e.createdAt).slice(0, 16).replace("T", " ") : undefined,
    status: String(e.status ?? ""),
  });

  const timelineEvents = automation.events
    .filter((e) => String(e.eventName).includes("timeline"))
    .slice(0, 5)
    .map(mapEvent);

  return {
    recentEvents: automation.events.slice(0, 8).map(mapEvent),
    notifications: automation.notifications.slice(0, 5).map((n) => ({
      id: String(n.id),
      title: String(n.title ?? n.message ?? "Notification"),
      meta: n.createdAt ? String(n.createdAt).slice(0, 10) : undefined,
      status: String(n.status ?? "queued"),
    })),
    healthRecalculations: automation.healthRecalculations,
    timelineEvents,
    failures: automation.failures.slice(0, 5).map(mapEvent),
  };
}

export function buildCommandSections(input: CommandWidgetInput): CommandSections {
  return {
    relationship: buildRelationshipSection(input),
    revenue: buildRevenueSection(input),
    projects: buildProjectsSection(input),
    website: buildWebsiteSection(input),
    creative: buildCreativeSection(input),
    reporting: buildReportingSection(input),
    sales: buildSalesSection(input),
    automation: buildAutomationSection(input),
  };
}

export function buildCommandRecommendations(
  recommendations: IntelligenceRecommendation[],
): CommandRecommendation[] {
  return recommendations.slice(0, 5).map((rec) => ({
    ...rec,
    estimatedImpact: estimateImpact(rec),
  }));
}

export function buildWidgetInputFromContext(
  cid: number,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: import("@/lib/intelligence/types").IntelligenceContext,
  extras: {
    brandKits: Record<string, unknown>[];
    creativeAssets: Record<string, unknown>[];
    automation: CommandWidgetInput["automation"];
    workspace: import("@/lib/executive-client-workspace/fetch-client-workspace").ClientWorkspaceData | null;
    infrastructure: import("@/lib/infrastructure/types").ClientInfrastructureDetail | null;
    timeline: import("@/lib/executive-timeline/types").ExecutiveTimelineClientData | null;
    insights: import("@/lib/intelligence/types").ClientInsights | null;
    health: import("@/lib/client-health/health-engine").ClientHealthResult;
  },
): CommandWidgetInput {
  const client = ctx.clientsById.get(cid);
  const clientName = String(client?.name ?? "Client");
  const row = extras.workspace
    ? extras.workspace.row
    : client
      ? mergeClientWithExecutiveProfile(client, null)
      : null;

  return {
    clientId: cid,
    clientName,
    row,
    insights: extras.insights,
    health: extras.health,
    timeline: extras.timeline,
    infrastructure: extras.infrastructure,
    brandKits: extras.brandKits,
    creativeAssets: extras.creativeAssets,
    automation: extras.automation,
    projects: filterForClient(ctx.projects, cid),
    deliverables: filterForClient(ctx.deliverables, cid),
    requests: filterForClient(ctx.requests, cid),
    proposals: filterForClient(ctx.proposals, cid),
    reports: filterForClient(ctx.monthlyReports, cid),
    audits: ctx.audits.filter(
      (a) =>
        clientId(a.client) === cid ||
        String(a.company ?? "").toLowerCase() === clientName.toLowerCase(),
    ),
    campaigns: filterForClient(ctx.campaigns, cid),
    flyers: filterForClient(ctx.flyers, cid),
    videos: filterForClient(ctx.videos, cid),
    socialPosts: filterForClient(ctx.socialPosts, cid),
    onboardings: filterForClient(ctx.onboardings, cid),
    profile: extras.workspace?.profile ?? null,
  };
}

export { buildExecutiveBrief };
