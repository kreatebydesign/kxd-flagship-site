import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import { getOnboardingWorkflowStatus } from "@/lib/client-onboarding";
import {
  calculateInfrastructureScore,
  calculateMonthlyStackCost,
} from "@/lib/infrastructure/data";
import type { InfraDoc } from "@/lib/infrastructure/types";
import type {
  FounderBriefingData,
  FounderClientRiskSignal,
  FounderDoc,
  FounderInfrastructureAlert,
  FounderMeetingItem,
  FounderMorningBrief,
  FounderOpportunitySignal,
  FounderPriority,
  FounderProjectMomentum,
  FounderRecommendedFocus,
  FounderRevenueIntelligence,
  PriorityType,
  PriorityUrgency,
} from "./types";

const MS_PER_DAY = 86_400_000;
const OPEN_REQUEST_STATUSES = new Set(["new", "triaged", "in-progress", "waiting-on-client"]);
const ACTIVE_PROJECT_STATUSES = new Set(["planning", "active", "waiting-on-client", "review"]);
const STALE_PROJECT_DAYS = 21;
const STALE_TIMELINE_DAYS = 45;
const HEALTH_SCORE_THRESHOLD = 60;

const URGENCY_RANK: Record<PriorityUrgency, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

function maxUrgency(current: PriorityUrgency, next: PriorityUrgency): PriorityUrgency {
  return URGENCY_RANK[next] < URGENCY_RANK[current] ? next : current;
}

interface FounderContext {
  clients: FounderDoc[];
  retainers: FounderDoc[];
  projects: FounderDoc[];
  deliverables: FounderDoc[];
  requests: FounderDoc[];
  onboardings: FounderDoc[];
  audits: FounderDoc[];
  infrastructure: FounderDoc[];
  infraEvents: FounderDoc[];
  infraCosts: FounderDoc[];
  timeline: FounderDoc[];
  portalUsers: FounderDoc[];
  executiveProfiles: FounderDoc[];
  campaigns: FounderDoc[];
  flyers: FounderDoc[];
  videos: FounderDoc[];
  socialPosts: FounderDoc[];
  clientsById: Map<number, FounderDoc>;
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return null;
}

function clientId(raw: unknown): number | null {
  if (!raw) return null;
  if (typeof raw === "number") return raw;
  if (typeof raw === "object" && raw !== null && "id" in raw) return Number((raw as FounderDoc).id);
  return null;
}

function clientName(raw: unknown, ctx?: FounderContext): string {
  const id = clientId(raw);
  if (id != null && ctx?.clientsById.has(id)) return String(ctx.clientsById.get(id)?.name ?? "Client");
  if (typeof raw === "object" && raw !== null && "name" in raw) return String((raw as FounderDoc).name);
  return "Client";
}

function daysUntil(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const ts = new Date(iso).getTime();
  if (Number.isNaN(ts)) return null;
  return Math.ceil((ts - Date.now()) / MS_PER_DAY);
}

function daysSince(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const ts = new Date(iso).getTime();
  if (Number.isNaN(ts)) return null;
  return Math.floor((Date.now() - ts) / MS_PER_DAY);
}

function fmtMoney(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

async function findAll(collection: string, where?: FounderDoc, limit = 500): Promise<FounderDoc[]> {
  const payload = await getPayload({ config });
  try {
    const result = await payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: collection as any,
      where,
      limit,
      depth: 1,
      sort: "-updatedAt",
      overrideAccess: true,
    });
    return result.docs as FounderDoc[];
  } catch {
    return [];
  }
}

async function loadFounderContext(): Promise<FounderContext> {
  const [
    clients,
    retainers,
    projects,
    deliverables,
    requests,
    onboardings,
    audits,
    infrastructure,
    infraEvents,
    infraCosts,
    timeline,
    portalUsers,
    executiveProfiles,
    campaigns,
    flyers,
    videos,
    socialPosts,
  ] = await Promise.all([
    findAll("clients"),
    findAll("retainers"),
    findAll("client-projects"),
    findAll("monthly-deliverables"),
    findAll("client-requests"),
    findAll("client-onboarding"),
    findAll("website-audits"),
    findAll("client-infrastructure"),
    findAll("infrastructure-events"),
    findAll("infrastructure-costs", { active: { equals: true } }),
    findAll("client-timeline-events"),
    findAll("portal-users"),
    findAll("executive-client-profiles"),
    findAll("creative-campaigns"),
    findAll("flyer-requests"),
    findAll("promo-video-requests"),
    findAll("social-post-requests"),
  ]);

  const clientsById = new Map(clients.map((c) => [c.id as number, c]));

  return {
    clients,
    retainers,
    projects,
    deliverables,
    requests,
    onboardings,
    audits,
    infrastructure,
    infraEvents,
    infraCosts,
    timeline,
    portalUsers,
    executiveProfiles,
    campaigns,
    flyers,
    videos,
    socialPosts,
    clientsById,
  };
}

function activeRetainers(ctx: FounderContext): FounderDoc[] {
  return ctx.retainers.filter((r) =>
    ["active", "current", "upcoming", "pending"].includes(String(r.billingStatus)),
  );
}

function retainerClientIds(ctx: FounderContext): Set<number> {
  return new Set(
    activeRetainers(ctx).map((r) => clientId(r.client)).filter((id): id is number => id != null),
  );
}

function infraForClient(ctx: FounderContext, cid: number): FounderDoc | undefined {
  return ctx.infrastructure.find((r) => clientId(r.client) === cid);
}

function executiveForClient(ctx: FounderContext, cid: number): FounderDoc | undefined {
  return ctx.executiveProfiles.find((p) => clientId(p.client) === cid);
}

function portalUsersForClient(ctx: FounderContext, cid: number): FounderDoc[] {
  return ctx.portalUsers.filter((u) => clientId(u.client) === cid);
}

function addPriority(
  list: FounderPriority[],
  item: Omit<FounderPriority, "id"> & { id?: string },
): void {
  list.push({ ...item, id: item.id ?? `${item.type}-${item.clientId ?? item.title}` });
}

export async function getTodayPriorities(ctx?: FounderContext): Promise<FounderPriority[]> {
  const context = ctx ?? (await loadFounderContext());
  const now = new Date();
  const priorities: FounderPriority[] = [];

  for (const event of context.infraEvents) {
    if (event.status !== "open") continue;
    if (event.severity !== "critical") continue;
    const cid = clientId(event.client);
    addPriority(priorities, {
      id: `infra-event-${event.id}`,
      type: "critical-infrastructure",
      title: String(event.title),
      client: clientName(event.client, context),
      clientId: cid,
      whyItMatters: "Open critical infrastructure issue threatens client delivery or uptime.",
      recommendedAction: "Review infrastructure record and resolve or assign owner.",
      urgency: "critical",
      sourceModule: "Infrastructure",
      href: cid ? `/admin/operations/infrastructure/${cid}` : "/admin/operations/infrastructure",
    });
  }

  for (const req of context.requests) {
    if (!OPEN_REQUEST_STATUSES.has(String(req.status))) continue;
    const age = daysSince(req.createdAt as string);
    const dueDays = daysUntil(req.dueDate as string);
    const isOverdue = dueDays != null && dueDays < 0;
    const isStale = age != null && age > 7;
    if (!isOverdue && !isStale) continue;
    const cid = clientId(req.client);
    addPriority(priorities, {
      id: `request-${req.id}`,
      type: "overdue-request",
      title: String(req.requestTitle ?? "Client request"),
      client: clientName(req.client, context),
      clientId: cid,
      whyItMatters: isOverdue
        ? `Request is ${Math.abs(dueDays ?? 0)} days overdue.`
        : `Request has been open ${age} days without resolution.`,
      recommendedAction: "Triage, respond, or close the request today.",
      urgency: isOverdue ? "critical" : "high",
      sourceModule: "Requests",
      href: `/admin/collections/client-requests/${req.id}`,
    });
  }

  for (const project of context.projects) {
    if (!ACTIVE_PROJECT_STATUSES.has(String(project.status))) continue;
    const stale = daysSince(project.updatedAt as string);
    const launchDays = daysUntil(project.targetLaunchDate as string);
    const atRisk = (stale != null && stale > STALE_PROJECT_DAYS) || (launchDays != null && launchDays < 0);
    if (!atRisk) continue;
    const cid = clientId(project.client);
    addPriority(priorities, {
      id: `project-${project.id}`,
      type: "project-at-risk",
      title: String(project.projectName ?? "Project"),
      client: clientName(project.client, context),
      clientId: cid,
      whyItMatters:
        launchDays != null && launchDays < 0
          ? `Target launch passed ${Math.abs(launchDays)} days ago.`
          : `No project activity in ${stale} days.`,
      recommendedAction: "Check blockers, update status, or reset timeline with client.",
      urgency: launchDays != null && launchDays < 0 ? "critical" : "high",
      sourceModule: "Projects",
      href: `/admin/collections/client-projects/${project.id}`,
    });
  }

  for (const record of context.infrastructure) {
    const renewalDays = daysUntil(record.nextRenewalDate as string);
    if (renewalDays == null || renewalDays > 30) continue;
    const cid = clientId(record.client);
    addPriority(priorities, {
      id: `renewal-${record.id}`,
      type: "upcoming-renewal",
      title: record.primaryDomain ? String(record.primaryDomain) : "Infrastructure renewal",
      client: clientName(record.client, context),
      clientId: cid,
      whyItMatters: `Renewal due in ${renewalDays} day${renewalDays === 1 ? "" : "s"}.`,
      recommendedAction: "Confirm renewal, billing, and client communication.",
      urgency: renewalDays <= 7 ? "critical" : "high",
      sourceModule: "Infrastructure",
      href: cid ? `/admin/operations/infrastructure/${cid}` : undefined,
    });
  }

  for (const client of context.clients.filter((c) => c.status === "active")) {
    const cid = client.id as number;
    if (retainerClientIds(context).has(cid)) continue;
    addPriority(priorities, {
      id: `no-retainer-${cid}`,
      type: "missing-retainer",
      title: "No active retainer on file",
      client: String(client.name),
      clientId: cid,
      whyItMatters: "Active client without retainer data — revenue and scope may be untracked.",
      recommendedAction: "Create retainer record or confirm engagement model.",
      urgency: "high",
      sourceModule: "Revenue",
      href: `/admin/collections/clients/${cid}`,
    });
  }

  for (const client of context.clients.filter((c) =>
    ["needs-attention", "at-risk"].includes(String(c.relationshipStatus)),
  )) {
    const cid = client.id as number;
    addPriority(priorities, {
      id: `health-${cid}`,
      type: "client-health",
      title: `Relationship ${String(client.relationshipStatus).replace(/-/g, " ")}`,
      client: String(client.name),
      clientId: cid,
      whyItMatters: "Client relationship health flag requires executive attention.",
      recommendedAction: "Review account, schedule check-in, or update health status.",
      urgency: client.relationshipStatus === "at-risk" ? "critical" : "high",
      sourceModule: "Clients",
      href: `/admin/operations/clients/${cid}`,
    });
  }

  for (const onboarding of context.onboardings) {
    const status = getOnboardingWorkflowStatus(onboarding);
    if (!["draft", "sent", "in-progress", "waiting-on-kxd"].includes(status)) continue;
    const readiness = asNumber(
      context.clientsById.get(clientId(onboarding.client) ?? -1)?.osOnboardingReadinessScore,
    );
    const cid = clientId(onboarding.client);
    addPriority(priorities, {
      id: `onboarding-${onboarding.id}`,
      type: "onboarding-incomplete",
      title: "Onboarding incomplete",
      client: clientName(onboarding.client, context),
      clientId: cid,
      whyItMatters:
        readiness != null && readiness < 50
          ? `Readiness score ${readiness}% — critical intake gaps.`
          : `Onboarding status: ${status}.`,
      recommendedAction: "Complete intake review or request missing assets from client.",
      urgency: readiness != null && readiness < 50 ? "high" : "medium",
      sourceModule: "Onboarding",
      href: "/admin/operations/onboarding",
    });
  }

  const recentAudits = context.audits.filter((a) =>
    ["new-lead", "contacted", "qualified"].includes(String(a.status)),
  );
  for (const audit of recentAudits.slice(0, 5)) {
    const score = asNumber(audit.overallScore);
    addPriority(priorities, {
      id: `audit-${audit.id}`,
      type: "audit-follow-up",
      title: `${audit.company ?? audit.website ?? "Audit"} follow-up`,
      client: String(audit.company ?? audit.name ?? "Lead"),
      clientId: null,
      whyItMatters:
        score != null && score < 60
          ? `Audit score ${score}/100 — strong improvement conversation.`
          : "Qualified audit lead awaiting follow-up.",
      recommendedAction: "Contact lead and propose next step or audit review call.",
      urgency: score != null && score < 60 ? "high" : "medium",
      sourceModule: "Audits",
      href: `/admin/collections/website-audits/${audit.id}`,
    });
  }

  for (const meeting of context.timeline.filter((e) => String(e.eventType) === "meeting")) {
    const d = daysUntil(meeting.eventDate as string);
    if (d == null || d < 0 || d > 3) continue;
    const cid = clientId(meeting.client);
    addPriority(priorities, {
      id: `meeting-${meeting.id}`,
      type: "meeting-prep",
      title: String(meeting.title ?? "Meeting"),
      client: clientName(meeting.client, context),
      clientId: cid,
      whyItMatters: `Meeting in ${d} day${d === 1 ? "" : "s"}.`,
      recommendedAction: "Review account status, open requests, and project momentum before call.",
      urgency: d <= 1 ? "high" : "medium",
      sourceModule: "Meetings",
      href: cid ? `/admin/operations/clients/${cid}` : undefined,
    });
  }

  priorities.sort((a, b) => URGENCY_RANK[a.urgency] - URGENCY_RANK[b.urgency]);
  return priorities;
}

export async function getRevenueIntelligence(ctx?: FounderContext): Promise<FounderRevenueIntelligence> {
  const context = ctx ?? (await loadFounderContext());
  const active = context.clients.filter((c) => c.status === "active");
  const retainers = activeRetainers(context);
  const retainerIds = retainerClientIds(context);

  const mrrFromClients = active.reduce((s, c) => s + (asNumber(c.monthlyRetainerAmount) ?? 0), 0);
  const mrrFromRetainers = retainers.reduce((s, r) => s + (asNumber(r.monthlyAmount) ?? 0), 0);
  const activeMrr = mrrFromClients > 0 ? mrrFromClients : mrrFromRetainers;

  const upcomingRetainers = retainers.filter((r) => {
    const d = daysUntil(r.nextInvoiceDate as string);
    return d != null && d >= 0 && d <= 30;
  });
  const upcomingMrr = upcomingRetainers.reduce((s, r) => s + (asNumber(r.monthlyAmount) ?? 0), 0);

  const monthlyStack = calculateMonthlyStackCost(context.infraCosts as InfraDoc[]);
  const marginOpportunity = activeMrr > 0 ? Math.round(activeMrr - monthlyStack) : null;

  const clientsWithoutRetainers = active.filter((c) => !retainerIds.has(c.id as number));

  const zeroStackCostClients = context.infrastructure
    .filter((r) => {
      const cid = clientId(r.client);
      if (cid == null) return false;
      const costs = context.infraCosts.filter((c) => clientId(c.client) === cid);
      return calculateMonthlyStackCost(costs as InfraDoc[]) === 0;
    })
    .map((r) => context.clientsById.get(clientId(r.client) ?? -1))
    .filter(Boolean) as FounderDoc[];

  const missingRetainerOpportunities = clientsWithoutRetainers.map((c) => ({
    clientId: c.id as number,
    name: String(c.name),
    reason: "Active client without retainer agreement on file",
  }));

  const topOpportunityClients: FounderRevenueIntelligence["topOpportunityClients"] = [];

  for (const client of active) {
    const cid = client.id as number;
    if (retainerIds.has(cid)) continue;
    const mrr = asNumber(client.monthlyRetainerAmount) ?? 2500;
    topOpportunityClients.push({
      clientId: cid,
      name: String(client.name),
      reason: "No active retainer — convert to recurring engagement",
      value: mrr,
    });
  }

  for (const profile of context.executiveProfiles) {
    const potential = asNumber(profile.potentialMonthlyRevenue);
    if (!potential || potential <= 0) continue;
    const cid = clientId(profile.client);
    if (cid == null) continue;
    topOpportunityClients.push({
      clientId: cid,
      name: clientName(profile.client, context),
      reason: "Executive profile flags expansion revenue",
      value: potential,
    });
  }

  topOpportunityClients.sort((a, b) => b.value - a.value);

  const potentialExpansionRevenue = topOpportunityClients
    .slice(0, 5)
    .reduce((s, o) => s + o.value, 0);

  return {
    activeMrr: Math.round(activeMrr),
    upcomingMrr: Math.round(upcomingMrr),
    infrastructureMarginOpportunity: marginOpportunity,
    potentialExpansionRevenue: Math.round(potentialExpansionRevenue),
    clientsWithoutRetainers,
    zeroStackCostClients,
    topOpportunityClients: topOpportunityClients.slice(0, 6),
    missingRetainerOpportunities: missingRetainerOpportunities.slice(0, 8),
  };
}

export async function getClientRiskSignals(ctx?: FounderContext): Promise<FounderClientRiskSignal[]> {
  const context = ctx ?? (await loadFounderContext());
  const risks: FounderClientRiskSignal[] = [];
  const now = Date.now();

  for (const client of context.clients.filter((c) => c.status === "active")) {
    const cid = client.id as number;
    const signals: string[] = [];
    let urgency: PriorityUrgency = "low";

    const infra = infraForClient(context, cid);
    if (infra?.status === "critical") {
      signals.push("Critical infrastructure status");
      urgency = maxUrgency(urgency, "critical");
    } else if (infra?.status === "attention") {
      signals.push("Infrastructure needs attention");
      urgency = maxUrgency(urgency, "high");
    }

    const overdueDeliverables = context.deliverables.filter(
      (d) =>
        clientId(d.client) === cid &&
        d.status !== "complete" &&
        d.dueDate &&
        new Date(d.dueDate as string).getTime() < now,
    );
    if (overdueDeliverables.length > 0) {
      signals.push(`${overdueDeliverables.length} overdue deliverable(s)`);
      urgency = maxUrgency(urgency, "high");
    }

    const staleProjects = context.projects.filter(
      (p) =>
        clientId(p.client) === cid &&
        ACTIVE_PROJECT_STATUSES.has(String(p.status)) &&
        (daysSince(p.updatedAt as string) ?? 0) > STALE_PROJECT_DAYS,
    );
    if (staleProjects.length > 0) {
      signals.push("Stalled project activity");
      urgency = maxUrgency(urgency, "medium");
    }

    const openRequests = context.requests.filter(
      (r) => clientId(r.client) === cid && OPEN_REQUEST_STATUSES.has(String(r.status)),
    );
    if (openRequests.length >= 3) {
      signals.push(`${openRequests.length} open requests`);
      urgency = maxUrgency(urgency, "medium");
    }

    const readiness = asNumber(client.osOnboardingReadinessScore);
    if (readiness != null && readiness < HEALTH_SCORE_THRESHOLD) {
      signals.push(`Onboarding readiness ${readiness}%`);
      urgency = maxUrgency(urgency, "high");
    }

    if (infra) {
      if (!infra.primaryDomain) signals.push("Missing domain data");
      if (!infra.hostingProvider) signals.push("Missing hosting data");
      if (!infra.ga4PropertyId && !infra.analyticsProvider) signals.push("Analytics not configured");
    } else {
      signals.push("No infrastructure record");
      urgency = maxUrgency(urgency, "medium");
    }

    const clientTimeline = context.timeline.filter((e) => clientId(e.client) === cid);
    const latestEvent = clientTimeline[0];
    const staleTimeline = !latestEvent || (daysSince(latestEvent.eventDate as string) ?? 999) > STALE_TIMELINE_DAYS;
    if (staleTimeline) signals.push("No recent timeline activity");

    const exec = executiveForClient(context, cid);
    const healthScore = asNumber(exec?.clientHealthScore) ?? asNumber(client.osOnboardingReadinessScore);
    if (healthScore != null && healthScore < HEALTH_SCORE_THRESHOLD) {
      signals.push(`Health score ${healthScore}`);
      urgency = maxUrgency(urgency, "high");
    }

    if (signals.length === 0) continue;

    risks.push({
      clientId: cid,
      clientName: String(client.name),
      signals,
      urgency,
      href: `/admin/operations/clients/${cid}`,
    });
  }

  risks.sort((a, b) => URGENCY_RANK[a.urgency] - URGENCY_RANK[b.urgency]);
  return risks;
}

export async function getProjectMomentum(ctx?: FounderContext): Promise<FounderProjectMomentum> {
  const context = ctx ?? (await loadFounderContext());
  const now = Date.now();
  const in14Days = now + 14 * MS_PER_DAY;

  const activeProjects = context.projects.filter((p) =>
    ACTIVE_PROJECT_STATUSES.has(String(p.status)),
  );

  const recentlyCompleted = context.projects
    .filter((p) => ["launched", "archived"].includes(String(p.status)))
    .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))
    .slice(0, 6);

  const stalledProjects = activeProjects.filter(
    (p) => (daysSince(p.updatedAt as string) ?? 0) > STALE_PROJECT_DAYS,
  );

  const deliverablesDueSoon = context.deliverables
    .filter((d) => {
      if (d.status === "complete") return false;
      if (!d.dueDate) return false;
      const due = new Date(d.dueDate as string).getTime();
      return due >= now && due <= in14Days;
    })
    .sort((a, b) => String(a.dueDate).localeCompare(String(b.dueDate)));

  const requestsWaiting = context.requests
    .filter((r) => OPEN_REQUEST_STATUSES.has(String(r.status)))
    .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));

  const creativeInMotion: FounderProjectMomentum["creativeInMotion"] = [];

  const openCreative = (items: FounderDoc[], type: string, hrefBase: string) => {
    for (const item of items) {
      if (["complete", "completed", "cancelled", "archived"].includes(String(item.status))) continue;
      creativeInMotion.push({
        id: `${type}-${item.id}`,
        title: String(item.title ?? item.campaignName ?? item.requestTitle ?? type),
        type,
        client: clientName(item.client, context),
        href: `${hrefBase}/${item.id}`,
      });
    }
  };

  openCreative(context.campaigns, "Campaign", "/admin/collections/creative-campaigns");
  openCreative(context.flyers, "Flyer", "/admin/collections/flyer-requests");
  openCreative(context.videos, "Video", "/admin/collections/promo-video-requests");
  openCreative(context.socialPosts, "Social", "/admin/collections/social-post-requests");

  return {
    activeProjects: activeProjects.slice(0, 12),
    recentlyCompleted,
    stalledProjects,
    deliverablesDueSoon,
    requestsWaiting: requestsWaiting.slice(0, 10),
    creativeInMotion: creativeInMotion.slice(0, 10),
  };
}

export async function getInfrastructureAlerts(ctx?: FounderContext): Promise<FounderInfrastructureAlert[]> {
  const context = ctx ?? (await loadFounderContext());
  const alerts: FounderInfrastructureAlert[] = [];

  for (const event of context.infraEvents) {
    if (event.status !== "open") continue;
    if (!["critical", "warning"].includes(String(event.severity))) continue;
    const cid = clientId(event.client);
    alerts.push({
      id: `event-${event.id}`,
      title: String(event.title),
      client: clientName(event.client, context),
      clientId: cid,
      detail: String(event.description ?? event.eventType ?? "Infrastructure event"),
      urgency: event.severity === "critical" ? "critical" : "high",
      href: cid ? `/admin/operations/infrastructure/${cid}` : "/admin/operations/infrastructure",
    });
  }

  for (const record of context.infrastructure) {
    const cid = clientId(record.client);
    const renewalDays = daysUntil(record.nextRenewalDate as string);
    if (renewalDays != null && renewalDays >= 0 && renewalDays <= 60) {
      alerts.push({
        id: `renewal-alert-${record.id}`,
        title: "Upcoming renewal",
        client: clientName(record.client, context),
        clientId: cid,
        detail: `${record.primaryDomain ?? "Domain"} renews in ${renewalDays} days`,
        urgency: renewalDays <= 7 ? "critical" : renewalDays <= 30 ? "high" : "medium",
        href: cid ? `/admin/operations/infrastructure/${cid}` : undefined,
      });
    }

    if (record.status === "unknown" || record.status === "attention" || record.status === "critical") {
      const score = calculateInfrastructureScore(record as InfraDoc);
      alerts.push({
        id: `status-${record.id}`,
        title: `Infrastructure ${String(record.status)}`,
        client: clientName(record.client, context),
        clientId: cid,
        detail: score != null ? `Score ${score}/100` : "Status requires review",
        urgency:
          record.status === "critical"
            ? "critical"
            : record.status === "attention"
              ? "high"
              : "medium",
        href: cid ? `/admin/operations/infrastructure/${cid}` : undefined,
      });
    }

    const missing: string[] = [];
    if (!record.primaryDomain) missing.push("domain");
    if (!record.hostingProvider) missing.push("hosting");
    if (!record.sslStatus || record.sslStatus === "unknown" || record.sslStatus === "missing")
      missing.push("SSL");
    if (!record.ga4PropertyId && record.searchConsoleStatus !== "connected") missing.push("analytics");
    if (!record.emailProvider) missing.push("email");

    if (missing.length >= 2) {
      alerts.push({
        id: `missing-${record.id}`,
        title: "Incomplete infrastructure data",
        client: clientName(record.client, context),
        clientId: cid,
        detail: `Missing: ${missing.join(", ")}`,
        urgency: "medium",
        href: cid ? `/admin/operations/infrastructure/${cid}` : undefined,
      });
    }
  }

  const monthlyExposure = calculateMonthlyStackCost(context.infraCosts as InfraDoc[]);
  if (monthlyExposure > 0) {
    alerts.push({
      id: "stack-cost-exposure",
      title: "Monthly stack cost exposure",
      client: "Portfolio",
      clientId: null,
      detail: `${fmtMoney(monthlyExposure)}/mo across active infrastructure costs`,
      urgency: "low",
      href: "/admin/operations/infrastructure",
    });
  }

  alerts.sort((a, b) => URGENCY_RANK[a.urgency] - URGENCY_RANK[b.urgency]);
  return alerts;
}

export async function getUpcomingMeetings(ctx?: FounderContext): Promise<FounderMeetingItem[]> {
  const context = ctx ?? (await loadFounderContext());

  return context.timeline
    .filter((e) => String(e.eventType) === "meeting")
    .map((e) => {
      const d = daysUntil(e.eventDate as string);
      return {
        id: e.id as number,
        title: String(e.title ?? "Meeting"),
        client: clientName(e.client, context),
        clientId: clientId(e.client),
        eventDate: String(e.eventDate),
        daysUntil: d ?? 999,
        href: clientId(e.client) ? `/admin/operations/clients/${clientId(e.client)}` : undefined,
      };
    })
    .filter((m) => m.daysUntil >= 0 && m.daysUntil <= 30)
    .sort((a, b) => a.daysUntil - b.daysUntil)
    .slice(0, 10);
}

export async function getOpportunitySignals(ctx?: FounderContext): Promise<FounderOpportunitySignal[]> {
  const context = ctx ?? (await loadFounderContext());
  const opportunities: FounderOpportunitySignal[] = [];
  const retainerIds = retainerClientIds(context);

  for (const audit of context.audits.filter((a) =>
    ["new-lead", "contacted", "qualified"].includes(String(a.status)),
  )) {
    opportunities.push({
      id: `audit-opp-${audit.id}`,
      title: "Website audit follow-up",
      client: String(audit.company ?? audit.name ?? "Lead"),
      clientId: null,
      category: "Audits",
      detail: `Score ${audit.overallScore ?? "—"}/100 · ${audit.website ?? ""}`,
      estimatedValue: 5000,
      href: `/admin/collections/website-audits/${audit.id}`,
    });
  }

  for (const client of context.clients.filter((c) => c.status === "active")) {
    const cid = client.id as number;
    const infra = infraForClient(context, cid);
    const name = String(client.name);

    if (!retainerIds.has(cid)) {
      opportunities.push({
        id: `retainer-opp-${cid}`,
        title: "Monthly care plan opportunity",
        client: name,
        clientId: cid,
        category: "Revenue",
        detail: "Active client without retainer — propose recurring care plan",
        estimatedValue: asNumber(client.monthlyRetainerAmount) ?? 2500,
        href: `/admin/collections/clients/${cid}`,
      });
    }

    if (infra) {
      if (infra.searchConsoleStatus !== "connected") {
        opportunities.push({
          id: `gsc-opp-${cid}`,
          title: "Search Console setup",
          client: name,
          clientId: cid,
          category: "Infrastructure",
          detail: "Search Console not connected — SEO visibility opportunity",
          estimatedValue: null,
          href: `/admin/operations/infrastructure/${cid}`,
        });
      }
      if (!infra.ga4PropertyId && !infra.analyticsProvider) {
        opportunities.push({
          id: `analytics-opp-${cid}`,
          title: "Analytics setup",
          client: name,
          clientId: cid,
          category: "Infrastructure",
          detail: "GA4 not configured — measurement and reporting gap",
          estimatedValue: null,
          href: `/admin/operations/infrastructure/${cid}`,
        });
      }
      if (!infra.primaryDomain || !infra.hostingProvider) {
        opportunities.push({
          id: `infra-data-opp-${cid}`,
          title: "Infrastructure audit",
          client: name,
          clientId: cid,
          category: "Infrastructure",
          detail: "Incomplete infrastructure registry — document and optimize stack",
          estimatedValue: null,
          href: `/admin/operations/infrastructure/${cid}`,
        });
      }
    }

    if (portalUsersForClient(context, cid).length === 0) {
      opportunities.push({
        id: `hq-opp-${cid}`,
        title: "Client HQ adoption",
        client: name,
        clientId: cid,
        category: "Client HQ",
        detail: "No portal users — invite client to headquarters",
        estimatedValue: null,
        href: `/admin/collections/portal-users`,
      });
    }

    const activeDeliverables = context.deliverables.filter(
      (d) => clientId(d.client) === cid && d.status !== "complete",
    );
    if (activeDeliverables.length === 0 && retainerIds.has(cid)) {
      opportunities.push({
        id: `deliverables-opp-${cid}`,
        title: "No active deliverables",
        client: name,
        clientId: cid,
        category: "Delivery",
        detail: "Retainer client with no active monthly deliverables",
        estimatedValue: null,
        href: `/admin/collections/monthly-deliverables`,
      });
    }

    opportunities.push({
      id: `academy-opp-${cid}`,
      title: "Resources / Academy",
      client: name,
      clientId: cid,
      category: "Growth",
      detail: "Training and resource library expansion opportunity",
      estimatedValue: null,
      href: "/admin/operations/playbooks",
    });
  }

  return opportunities.slice(0, 20);
}

export async function getRecommendedFocus(
  priorities: FounderPriority[],
  opportunities: FounderOpportunitySignal[],
): Promise<FounderRecommendedFocus[]> {
  const focus: FounderRecommendedFocus[] = [];

  for (const p of priorities.filter((x) => x.urgency === "critical").slice(0, 2)) {
    focus.push({
      action: p.recommendedAction,
      reason: `${p.client}: ${p.whyItMatters}`,
      href: p.href,
    });
  }

  for (const p of priorities.filter((x) => x.urgency === "high").slice(0, 2)) {
    if (focus.length >= 5) break;
    focus.push({
      action: p.recommendedAction,
      reason: `${p.client}: ${p.title}`,
      href: p.href,
    });
  }

  for (const o of opportunities.filter((x) => x.estimatedValue != null).slice(0, 2)) {
    if (focus.length >= 5) break;
    focus.push({
      action: `Pursue ${o.title.toLowerCase()}`,
      reason: `${o.client} · ${o.detail}`,
      href: o.href,
    });
  }

  if (focus.length < 3) {
    focus.push({
      action: "Review infrastructure renewal watchlist",
      reason: "Protect uptime and margin across client stacks",
      href: "/admin/operations/infrastructure",
    });
  }

  return focus.slice(0, 5);
}

function buildMorningBrief(
  priorities: FounderPriority[],
  clientRisks: FounderClientRiskSignal[],
  projectMomentum: FounderProjectMomentum,
  revenue: FounderRevenueIntelligence,
): FounderMorningBrief {
  const clientRiskCount = clientRisks.filter((r) =>
    ["critical", "high"].includes(r.urgency),
  ).length;
  const projectBlockerCount =
    projectMomentum.stalledProjects.length +
    priorities.filter((p) => p.type === "project-at-risk").length;
  const expansionOpportunityMonthly = revenue.potentialExpansionRevenue;
  const priorityCount = priorities.filter((p) =>
    ["critical", "high"].includes(p.urgency),
  ).length;

  const parts: string[] = [];
  if (priorityCount > 0) parts.push(`${priorityCount} priority item${priorityCount === 1 ? "" : "s"}`);
  if (clientRiskCount > 0) parts.push(`${clientRiskCount} client risk signal${clientRiskCount === 1 ? "" : "s"}`);
  if (projectBlockerCount > 0)
    parts.push(`${projectBlockerCount} project blocker${projectBlockerCount === 1 ? "" : "s"}`);
  if (expansionOpportunityMonthly > 0)
    parts.push(`${fmtMoney(expansionOpportunityMonthly)}/mo in expansion opportunities`);

  const summary =
    parts.length === 0
      ? "All clear this morning. No critical priorities detected across clients, delivery, or infrastructure."
      : `KXD has ${parts.join(", ")} today.`;

  return {
    summary,
    priorityCount,
    clientRiskCount,
    projectBlockerCount,
    expansionOpportunityMonthly,
  };
}

export async function getFounderBriefing(): Promise<FounderBriefingData> {
  const ctx = await loadFounderContext();
  const now = new Date();

  const dateDisplay = now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const timeDisplay = now.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  const [
    priorities,
    revenue,
    clientRisks,
    projectMomentum,
    infrastructureAlerts,
    upcomingMeetings,
    opportunities,
  ] = await Promise.all([
    getTodayPriorities(ctx),
    getRevenueIntelligence(ctx),
    getClientRiskSignals(ctx),
    getProjectMomentum(ctx),
    getInfrastructureAlerts(ctx),
    getUpcomingMeetings(ctx),
    getOpportunitySignals(ctx),
  ]);

  const morningBrief = buildMorningBrief(
    priorities,
    clientRisks,
    projectMomentum,
    revenue,
  );
  const recommendedFocus = await getRecommendedFocus(priorities, opportunities);

  return {
    dateDisplay,
    timeDisplay,
    morningBrief,
    priorities: priorities.slice(0, 20),
    revenue,
    clientRisks: clientRisks.slice(0, 12),
    projectMomentum,
    infrastructureAlerts: infrastructureAlerts.slice(0, 12),
    upcomingMeetings,
    opportunities,
    recommendedFocus,
  };
}
