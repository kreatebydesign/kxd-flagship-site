import type { IntelligenceContext } from "@/lib/intelligence/types";
import { buildGrowthOpportunities } from "@/lib/intelligence/opportunities";
import { buildPortfolioRecommendations } from "@/lib/intelligence/recommendations";
import { clientId, infraForClient } from "@/lib/intelligence/context";
import type { ClientMonthlyMetrics, ReportRecommendationSet } from "./types";

export function buildReportRecommendations(
  metrics: ClientMonthlyMetrics,
  ctx: IntelligenceContext,
): ReportRecommendationSet {
  const cid = metrics.clientId;
  const portfolioRecs = buildPortfolioRecommendations(ctx).filter((r) => r.clientId === cid);
  const opportunities = buildGrowthOpportunities(ctx).filter((o) => o.clientId === cid || o.clientId == null);
  const infra = infraForClient(ctx, cid);

  const topPriorities: string[] = [];
  const quickWins: string[] = [];
  const infrastructureImprovements: string[] = [];
  const seoRecommendations: string[] = [];
  const growthOpportunities: string[] = [];
  const riskItems: string[] = [];
  const completedWins: string[] = [];

  for (const rec of portfolioRecs.slice(0, 4)) {
    if (rec.urgency === "critical" || rec.urgency === "high") {
      topPriorities.push(rec.title);
    } else {
      quickWins.push(rec.title);
    }
  }

  if (infra) {
    if (infra.searchConsoleStatus !== "connected") {
      seoRecommendations.push("Connect Google Search Console for search visibility tracking.");
    }
    if (!infra.ga4PropertyId) {
      seoRecommendations.push("Configure GA4 property for traffic and conversion reporting.");
    }
    if (["attention", "critical", "unknown"].includes(String(infra.status))) {
      infrastructureImprovements.push(
        `Infrastructure status is ${String(infra.status).replace(/-/g, " ")} — review domains, hosting, and DNS.`,
      );
    } else {
      infrastructureImprovements.push("Infrastructure is operational — maintain renewal calendar.");
    }
  } else {
    infrastructureImprovements.push("Register client infrastructure to enable health monitoring.");
  }

  for (const opp of opportunities.slice(0, 3)) {
    if (opp.clientId === cid || opp.clientId == null) {
      growthOpportunities.push(opp.title);
    }
  }

  if (metrics.openRequests.length > 3) {
    riskItems.push(`${metrics.openRequests.length} open requests may slow delivery velocity.`);
  }
  if (metrics.healthScore != null && metrics.healthScore < 60) {
    riskItems.push(`Client health score ${metrics.healthScore} — relationship attention recommended.`);
  }

  if (metrics.deliverablesCompleted.length > 0) {
    completedWins.push(
      `Completed ${metrics.deliverablesCompleted.length} deliverable${metrics.deliverablesCompleted.length === 1 ? "" : "s"} this month.`,
    );
  }
  if (metrics.completedProjects.length > 0) {
    completedWins.push(
      `${metrics.completedProjects.length} project milestone${metrics.completedProjects.length === 1 ? "" : "s"} reached.`,
    );
  }
  if (metrics.websiteAuditScore != null && metrics.websiteAuditScore >= 80) {
    completedWins.push(`Website health score at ${metrics.websiteAuditScore}.`);
  }

  if (topPriorities.length === 0 && quickWins.length > 0) {
    topPriorities.push(quickWins.shift()!);
  }

  return {
    topPriorities,
    quickWins,
    infrastructureImprovements,
    seoRecommendations,
    growthOpportunities,
    riskItems,
    completedWins,
  };
}
