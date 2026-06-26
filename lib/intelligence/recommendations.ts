import "server-only";

import { getOnboardingWorkflowStatus } from "@/lib/client-onboarding";
import { calculateClientHealth } from "@/lib/client-health/health-engine";
import {
  ACTIVE_PROJECT_STATUSES,
  STALE_AUDIT_DAYS,
  STALE_PROJECT_DAYS,
  STALE_TIMELINE_DAYS,
  activeClients,
  asNumber,
  clientId,
  clientName,
  daysSince,
  daysUntil,
  infraForClient,
  latestActivityDate,
  loadIntelligenceContext,
  maxUrgency,
  openCreativeCount,
  portalUsersForClient,
  retainerClientIds,
} from "./context";
import type {
  IntelligenceContext,
  IntelligenceRecommendation,
  IntelligenceUrgency,
} from "./types";

const URGENCY_RANK: Record<IntelligenceUrgency, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

function push(
  list: IntelligenceRecommendation[],
  item: Omit<IntelligenceRecommendation, "id"> & { id?: string },
): void {
  list.push({ ...item, id: item.id ?? `rec-${item.category}-${item.clientId ?? item.title}` });
}

export function buildClientRecommendations(
  cid: number,
  ctx: IntelligenceContext,
): IntelligenceRecommendation[] {
  const client = ctx.clientsById.get(cid);
  if (!client) return [];

  const recs: IntelligenceRecommendation[] = [];
  const name = String(client.name);
  const retainerIds = retainerClientIds(ctx);
  const infra = infraForClient(ctx, cid);

  if (!retainerIds.has(cid) && client.status === "active") {
    push(recs, {
      id: `no-retainer-${cid}`,
      clientId: cid,
      clientName: name,
      title: "No active retainer",
      reason: "Active client without retainer agreement on file.",
      estimatedBusinessValue: asNumber(client.monthlyRetainerAmount) ?? 2500,
      urgency: "high",
      confidence: "high",
      recommendedAction: "Create retainer record or confirm engagement model.",
      relatedModules: ["Growth", "Accounts"],
      category: "revenue",
      href: `/admin/collections/clients/${cid}`,
    });
  }

  if (infra) {
    if (!infra.ga4PropertyId && !infra.analyticsProvider) {
      push(recs, {
        id: `ga4-${cid}`,
        clientId: cid,
        clientName: name,
        title: "Website missing GA4",
        reason: "Analytics not configured — measurement and reporting gap.",
        estimatedBusinessValue: 1500,
        urgency: "medium",
        confidence: "high",
        recommendedAction: "Configure GA4 property and connect to infrastructure record.",
        relatedModules: ["Infrastructure", "Analytics"],
        category: "infrastructure",
        href: `/admin/operations/infrastructure/${cid}`,
      });
    }

    if (infra.searchConsoleStatus !== "connected") {
      push(recs, {
        id: `gsc-${cid}`,
        clientId: cid,
        clientName: name,
        title: "Search Console missing",
        reason: "Search Console not connected — SEO visibility opportunity.",
        estimatedBusinessValue: 1200,
        urgency: "medium",
        confidence: "high",
        recommendedAction: "Connect Search Console and verify domain property.",
        relatedModules: ["Infrastructure", "SEO"],
        category: "infrastructure",
        href: `/admin/operations/infrastructure/${cid}`,
      });
    }

    const renewalDays = daysUntil(infra.nextRenewalDate as string);
    if (renewalDays != null && renewalDays >= 0 && renewalDays <= 60) {
      push(recs, {
        id: `renewal-${cid}`,
        clientId: cid,
        clientName: name,
        title: "Domain renewal soon",
        reason: `Renewal due in ${renewalDays} day${renewalDays === 1 ? "" : "s"}.`,
        estimatedBusinessValue: asNumber(infra.annualRenewalCost) ?? null,
        urgency: renewalDays <= 7 ? "critical" : renewalDays <= 30 ? "high" : "medium",
        confidence: "high",
        recommendedAction: "Confirm renewal, billing, and client communication.",
        relatedModules: ["Infrastructure"],
        category: "infrastructure",
        href: `/admin/operations/infrastructure/${cid}`,
      });
    }

    if (!infra.primaryDomain || !infra.hostingProvider) {
      push(recs, {
        id: `infra-incomplete-${cid}`,
        clientId: cid,
        clientName: name,
        title: "Infrastructure incomplete",
        reason: "Missing domain or hosting data in infrastructure registry.",
        estimatedBusinessValue: null,
        urgency: "medium",
        confidence: "high",
        recommendedAction: "Complete infrastructure record and document stack.",
        relatedModules: ["Infrastructure"],
        category: "infrastructure",
        href: `/admin/operations/infrastructure/${cid}`,
      });
    }
  } else if (client.status === "active") {
    push(recs, {
      id: `no-infra-${cid}`,
      clientId: cid,
      clientName: name,
      title: "No infrastructure record",
      reason: "Client has no infrastructure registry entry.",
      estimatedBusinessValue: null,
      urgency: "medium",
      confidence: "high",
      recommendedAction: "Run infrastructure backfill or create record manually.",
      relatedModules: ["Infrastructure"],
      category: "infrastructure",
      href: `/admin/operations/infrastructure/${cid}`,
    });
  }

  const now = Date.now();
  const overdueDeliverables = ctx.deliverables.filter(
    (d) =>
      clientId(d.client) === cid &&
      d.status !== "complete" &&
      d.dueDate &&
      new Date(d.dueDate as string).getTime() < now,
  );
  if (overdueDeliverables.length > 0) {
    push(recs, {
      id: `deliverables-overdue-${cid}`,
      clientId: cid,
      clientName: name,
      title: "Deliverables slowing down",
      reason: `${overdueDeliverables.length} overdue deliverable(s).`,
      estimatedBusinessValue: null,
      urgency: "high",
      confidence: "high",
      recommendedAction: "Review delivery queue and reset monthly commitments.",
      relatedModules: ["Deliverables", "Projects"],
      category: "delivery",
      href: `/admin/collections/monthly-deliverables`,
    });
  }

  const lastActivity = latestActivityDate(ctx, cid);
  const inactiveDays = daysSince(lastActivity);
  if (inactiveDays != null && inactiveDays > STALE_TIMELINE_DAYS) {
    push(recs, {
      id: `inactive-${cid}`,
      clientId: cid,
      clientName: name,
      title: "Client inactive",
      reason: `No timeline activity in ${inactiveDays} days.`,
      estimatedBusinessValue: null,
      urgency: inactiveDays > 90 ? "high" : "medium",
      confidence: "medium",
      recommendedAction: "Schedule check-in or log relationship milestone.",
      relatedModules: ["Timeline", "Clients"],
      category: "relationship",
      href: `/admin/operations/timeline/${cid}`,
    });
  }

  const recentMeetings = ctx.timeline.filter(
    (e) =>
      clientId(e.client) === cid &&
      String(e.eventType) === "meeting" &&
      (daysSince(e.eventDate as string) ?? 999) < 60,
  );
  if (recentMeetings.length === 0 && retainerIds.has(cid)) {
    push(recs, {
      id: `no-meetings-${cid}`,
      clientId: cid,
      clientName: name,
      title: "No recent meetings",
      reason: "Retainer client with no meeting logged in the last 60 days.",
      estimatedBusinessValue: null,
      urgency: "medium",
      confidence: "medium",
      recommendedAction: "Schedule executive check-in or quarterly review.",
      relatedModules: ["Timeline", "Clients"],
      category: "relationship",
      href: `/admin/operations/clients/${cid}`,
    });
  }

  const creativeCount = openCreativeCount(ctx, cid);
  if (retainerIds.has(cid) && creativeCount === 0) {
    push(recs, {
      id: `creative-low-${cid}`,
      clientId: cid,
      clientName: name,
      title: "Creative engagement low",
      reason: "No open creative requests in motion.",
      estimatedBusinessValue: 800,
      urgency: "low",
      confidence: "medium",
      recommendedAction: "Propose campaign, social, or content deliverable.",
      relatedModules: ["Creative"],
      category: "creative",
      href: `/admin/operations/creative`,
    });
  }

  if (retainerIds.has(cid)) {
    const activeDeliverables = ctx.deliverables.filter(
      (d) => clientId(d.client) === cid && d.status !== "complete",
    );
    if (activeDeliverables.length === 0) {
      push(recs, {
        id: `no-deliverables-${cid}`,
        clientId: cid,
        clientName: name,
        title: "Missing monthly reports",
        reason: "Retainer client with no active monthly deliverables.",
        estimatedBusinessValue: null,
        urgency: "medium",
        confidence: "high",
        recommendedAction: "Create monthly deliverable plan for current period.",
        relatedModules: ["Deliverables"],
        category: "delivery",
        href: `/admin/collections/monthly-deliverables`,
      });
    }
  }

  const health = calculateClientHealth(cid, ctx.healthCtx);
  if (health.overallScore < 60) {
    push(recs, {
      id: `health-${cid}`,
      clientId: cid,
      clientName: name,
      title: "Relationship health declining",
      reason: `Health score ${health.overallScore}/100${health.factors.length ? ` — weak: ${health.factors.join(", ")}` : ""}.`,
      estimatedBusinessValue: null,
      urgency: health.overallScore < 45 ? "critical" : "high",
      confidence: "high",
      recommendedAction: "Review account, schedule check-in, or update health status.",
      relatedModules: ["Clients", "Founder Intelligence"],
      category: "health",
      href: `/admin/operations/clients/${cid}`,
    });
  }

  return recs;
}

export function buildPortfolioRecommendations(ctx: IntelligenceContext): IntelligenceRecommendation[] {
  const recs: IntelligenceRecommendation[] = [];

  for (const event of ctx.infraEvents) {
    if (event.status !== "open" || event.severity !== "critical") continue;
    const cid = clientId(event.client);
    push(recs, {
      id: `infra-event-${event.id}`,
      clientId: cid,
      clientName: clientName(event.client, ctx),
      title: String(event.title),
      reason: "Open critical infrastructure issue threatens delivery or uptime.",
      estimatedBusinessValue: null,
      urgency: "critical",
      confidence: "high",
      recommendedAction: "Review infrastructure record and resolve or assign owner.",
      relatedModules: ["Infrastructure"],
      category: "infrastructure",
      href: cid ? `/admin/operations/infrastructure/${cid}` : "/admin/operations/infrastructure",
    });
  }

  for (const audit of ctx.audits.filter((a) =>
    ["new-lead", "contacted", "qualified"].includes(String(a.status)),
  )) {
    const age = daysSince(audit.completedAt as string ?? audit.createdAt as string);
    if (age != null && age > STALE_AUDIT_DAYS) continue;
    const score = asNumber(audit.overallScore);
    push(recs, {
      id: `audit-followup-${audit.id}`,
      clientId: null,
      clientName: String(audit.company ?? audit.name ?? "Lead"),
      title: "Website audit follow-up",
      reason:
        score != null && score < 60
          ? `Audit score ${score}/100 — strong improvement conversation.`
          : "Qualified audit lead awaiting follow-up.",
      estimatedBusinessValue: 5000,
      urgency: score != null && score < 60 ? "high" : "medium",
      confidence: "medium",
      recommendedAction: "Contact lead and propose next step or audit review call.",
      relatedModules: ["Website Auditor", "Growth"],
      category: "growth",
      href: `/admin/collections/website-audits/${audit.id}`,
    });
  }

  for (const onboarding of ctx.onboardings) {
    const status = getOnboardingWorkflowStatus(onboarding);
    if (!["draft", "sent", "in-progress", "waiting-on-kxd"].includes(status)) continue;
    const cid = clientId(onboarding.client);
    if (cid == null) continue;
    const readiness = asNumber(ctx.clientsById.get(cid)?.osOnboardingReadinessScore);
    push(recs, {
      id: `onboarding-${onboarding.id}`,
      clientId: cid,
      clientName: clientName(onboarding.client, ctx),
      title: "Onboarding incomplete",
      reason:
        readiness != null && readiness < 50
          ? `Readiness score ${readiness}% — critical intake gaps.`
          : `Onboarding status: ${status}.`,
      estimatedBusinessValue: null,
      urgency: readiness != null && readiness < 50 ? "high" : "medium",
      confidence: "high",
      recommendedAction: "Complete intake review or request missing assets from client.",
      relatedModules: ["Onboarding", "Portal"],
      category: "onboarding",
      href: "/admin/operations/onboarding",
    });
  }

  for (const client of activeClients(ctx)) {
    recs.push(...buildClientRecommendations(client.id as number, ctx));
  }

  recs.sort(
    (a, b) =>
      (URGENCY_RANK[a.urgency] ?? 99) - (URGENCY_RANK[b.urgency] ?? 99),
  );

  return recs;
}

export async function getRecommendations(
  clientId?: number,
  ctx?: IntelligenceContext,
): Promise<IntelligenceRecommendation[]> {
  const context = ctx ?? (await loadIntelligenceContext());
  if (clientId != null) return buildClientRecommendations(clientId, context);
  return buildPortfolioRecommendations(context);
}
