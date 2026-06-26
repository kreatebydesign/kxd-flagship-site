import "server-only";

import {
  activeClients,
  asNumber,
  clientId,
  clientName,
  daysSince,
  infraForClient,
  loadIntelligenceContext,
  portalUsersForClient,
  retainerClientIds,
} from "./context";
import type { GrowthOpportunity, IntelligenceContext } from "./types";

export function buildGrowthOpportunities(ctx: IntelligenceContext): GrowthOpportunity[] {
  const opportunities: GrowthOpportunity[] = [];
  const retainerIds = retainerClientIds(ctx);

  for (const audit of ctx.audits.filter((a) =>
    ["new-lead", "contacted", "qualified"].includes(String(a.status)),
  )) {
    opportunities.push({
      id: `audit-opp-${audit.id}`,
      clientId: null,
      clientName: String(audit.company ?? audit.name ?? "Lead"),
      title: "Website audit follow-up",
      reason: `Score ${audit.overallScore ?? "—"}/100 · ${audit.website ?? ""}`,
      estimatedBusinessValue: 5000,
      urgency: asNumber(audit.overallScore) != null && (audit.overallScore as number) < 60 ? "high" : "medium",
      confidence: "medium",
      recommendedAction: "Contact lead and propose improvement scope.",
      relatedModules: ["Website Auditor", "Growth"],
      category: "Audits",
      href: `/admin/collections/website-audits/${audit.id}`,
    });
  }

  for (const client of activeClients(ctx)) {
    const cid = client.id as number;
    const name = String(client.name);
    const infra = infraForClient(ctx, cid);

    if (!retainerIds.has(cid)) {
      opportunities.push({
        id: `retainer-opp-${cid}`,
        clientId: cid,
        clientName: name,
        title: "Monthly care plan opportunity",
        reason: "Active client without retainer — propose recurring care plan",
        estimatedBusinessValue: asNumber(client.monthlyRetainerAmount) ?? 2500,
        urgency: "high",
        confidence: "high",
        recommendedAction: "Create retainer agreement and scope monthly deliverables.",
        relatedModules: ["Growth", "Accounts"],
        category: "Revenue",
        href: `/admin/collections/clients/${cid}`,
      });
    }

    if (infra) {
      if (infra.searchConsoleStatus !== "connected") {
        opportunities.push({
          id: `gsc-opp-${cid}`,
          clientId: cid,
          clientName: name,
          title: "Search Console setup",
          reason: "Search Console not connected — SEO visibility opportunity",
          estimatedBusinessValue: 1200,
          urgency: "medium",
          confidence: "high",
          recommendedAction: "Connect Search Console and document in infrastructure.",
          relatedModules: ["Infrastructure", "SEO"],
          category: "Infrastructure",
          href: `/admin/operations/infrastructure/${cid}`,
        });
      }
      if (!infra.ga4PropertyId && !infra.analyticsProvider) {
        opportunities.push({
          id: `analytics-opp-${cid}`,
          clientId: cid,
          clientName: name,
          title: "Analytics setup",
          reason: "GA4 not configured — measurement and reporting gap",
          estimatedBusinessValue: 1500,
          urgency: "medium",
          confidence: "high",
          recommendedAction: "Configure GA4 and reporting workflow.",
          relatedModules: ["Infrastructure", "Analytics"],
          category: "Infrastructure",
          href: `/admin/operations/infrastructure/${cid}`,
        });
      }
    }

    if (portalUsersForClient(ctx, cid).length === 0) {
      opportunities.push({
        id: `hq-opp-${cid}`,
        clientId: cid,
        clientName: name,
        title: "Client HQ adoption",
        reason: "No portal users — invite client to headquarters",
        estimatedBusinessValue: null,
        urgency: "low",
        confidence: "medium",
        recommendedAction: "Invite primary contact to Client HQ portal.",
        relatedModules: ["Portal"],
        category: "Client HQ",
        href: `/admin/collections/portal-users`,
      });
    }

    const profile = ctx.executiveProfiles.find((p) => clientId(p.client) === cid);
    const potential = asNumber(profile?.potentialMonthlyRevenue);
    if (potential && potential > 0) {
      opportunities.push({
        id: `expansion-opp-${cid}`,
        clientId: cid,
        clientName: name,
        title: "Expansion revenue flagged",
        reason: "Executive profile flags expansion revenue potential",
        estimatedBusinessValue: potential,
        urgency: "medium",
        confidence: "medium",
        recommendedAction: "Review expansion scope with client.",
        relatedModules: ["Growth", "Founder Intelligence"],
        category: "Growth",
        href: `/admin/operations/clients/${cid}`,
      });
    }
  }

  opportunities.sort((a, b) => (b.estimatedBusinessValue ?? 0) - (a.estimatedBusinessValue ?? 0));
  return opportunities;
}

export async function getGrowthOpportunities(
  ctx?: IntelligenceContext,
): Promise<GrowthOpportunity[]> {
  const context = ctx ?? (await loadIntelligenceContext());
  return buildGrowthOpportunities(context);
}
