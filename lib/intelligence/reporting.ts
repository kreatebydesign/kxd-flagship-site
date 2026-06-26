import "server-only";

import type { IntelligenceContext, IntelligenceInsight } from "@/lib/intelligence/types";

export function buildReportingInsights(ctx: IntelligenceContext): IntelligenceInsight[] {
  const insights: IntelligenceInsight[] = [];
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const activeClients = ctx.clients.filter((c) => c.status === "active");
  const thisMonthPublished = ctx.monthlyReports.filter(
    (r) =>
      r.status === "published" &&
      Number(r.reportingMonth) === month &&
      Number(r.reportingYear) === year,
  );

  const dueCount = activeClients.length - new Set(
    thisMonthPublished.map((r) =>
      typeof r.client === "object" && r.client !== null ? (r.client as { id: number }).id : r.client,
    ),
  ).size;

  if (dueCount > 0) {
    insights.push({
      id: "reports-due",
      message: `${dueCount} client${dueCount === 1 ? "" : "s"} still need a monthly report for this period.`,
      category: "operations",
      urgency: dueCount >= 3 ? "high" : "medium",
      relatedModules: ["Reporting", "Growth"],
      metric: dueCount,
      metricLabel: "reports due",
    });
  }

  const readyUnpublished = ctx.monthlyReports.filter((r) => r.status === "ready");
  if (readyUnpublished.length > 0) {
    insights.push({
      id: "reports-ready",
      message: `${readyUnpublished.length} report${readyUnpublished.length === 1 ? "" : "s"} ready for review and publication.`,
      category: "operations",
      urgency: "medium",
      relatedModules: ["Reporting"],
      metric: readyUnpublished.length,
      metricLabel: "ready",
    });
  }

  const viewed = ctx.monthlyReports.filter(
    (r) => r.status === "published" && Number(r.viewCount ?? 0) > 0,
  );
  if (viewed.length > 0) {
    insights.push({
      id: "reports-engagement",
      message: `${viewed.length} published report${viewed.length === 1 ? "" : "s"} viewed in Client HQ.`,
      category: "relationship",
      urgency: "low",
      relatedModules: ["Reporting", "Portal"],
      metric: viewed.length,
      metricLabel: "viewed",
    });
  }

  return insights;
}
