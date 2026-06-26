import type { IntelligenceContext } from "@/lib/intelligence/types";
import { fmtMoney } from "@/lib/intelligence/context";
import { CONNECTOR_PLACEHOLDERS, gatherClientMonthlyMetrics } from "./metrics";
import { buildReportRecommendations } from "./recommendations";
import {
  buildExecutiveSummaryText,
  buildNextMonthPriorities,
  buildWorkCompletedText,
} from "./summary";
import { getBuiltinTemplate } from "./templates";
import type { GeneratedReportPayload, ReportKpi } from "./types";

export function generateReportPayload(
  clientId: number,
  month: number,
  year: number,
  ctx: IntelligenceContext,
  templateSlug?: string,
): GeneratedReportPayload {
  const template = getBuiltinTemplate(templateSlug);
  const metrics = gatherClientMonthlyMetrics(clientId, month, year, ctx);
  const recommendations = buildReportRecommendations(metrics, ctx);

  const executiveSummary = buildExecutiveSummaryText(metrics, recommendations);
  const workCompleted = buildWorkCompletedText(metrics);
  const nextMonthPriorities = buildNextMonthPriorities(recommendations);

  const kpis: ReportKpi[] = [
    {
      label: "Deliverables completed",
      value: String(metrics.deliverablesCompleted.length),
      status: metrics.deliverablesCompleted.length > 0 ? "positive" : "neutral",
    },
    {
      label: "Active projects",
      value: String(metrics.activeProjects.length),
      status: "neutral",
    },
    {
      label: "Open requests",
      value: String(metrics.openRequests.length),
      status: metrics.openRequests.length > 3 ? "attention" : "neutral",
    },
    {
      label: "Health score",
      value: metrics.healthScore != null ? `${metrics.healthScore}/100` : "—",
      status:
        metrics.healthScore != null && metrics.healthScore >= 70
          ? "positive"
          : metrics.healthScore != null && metrics.healthScore < 60
            ? "attention"
            : "neutral",
    },
    {
      label: "Infrastructure",
      value: metrics.infrastructureScore != null ? `${metrics.infrastructureScore}/100` : metrics.infrastructureStatus,
      status: metrics.infrastructureStatus === "healthy" ? "positive" : "neutral",
    },
    {
      label: "Monthly retainer",
      value: metrics.retainerMrr != null ? fmtMoney(metrics.retainerMrr) : "—",
      status: "neutral",
    },
  ];

  const connectorStatus = CONNECTOR_PLACEHOLDERS.map((c) => ({
    id: c.id,
    label: c.label,
    status: "not-configured" as const,
    note: c.note,
  }));

  return {
    executiveSummary,
    workCompleted,
    deliverables: metrics.deliverablesCompleted,
    projects: metrics.activeProjects,
    meetings: metrics.meetings,
    websiteHealth: {
      score: metrics.websiteAuditScore,
      status: metrics.websiteAuditScore != null && metrics.websiteAuditScore >= 80 ? "strong" : "review",
      note: metrics.websiteAuditScore != null ? undefined : "No website audit completed this month.",
    },
    infrastructure: {
      status: metrics.infrastructureStatus,
      score: metrics.infrastructureScore,
      note:
        metrics.infrastructureStatus === "healthy"
          ? "All systems operational."
          : "Review infrastructure registry for attention items.",
    },
    growth: {
      opportunities: recommendations.growthOpportunities,
      completedWins: recommendations.completedWins,
      salesEvents: metrics.salesEvents,
    },
    recommendations,
    kpis,
    traffic: {
      id: "ga4",
      label: "Google Analytics 4",
      status: "not-configured",
      note: "Traffic data will appear when GA4 connector is configured.",
    },
    conversions: {
      id: "ga4",
      label: "Conversions",
      status: "not-configured",
      note: "Conversion tracking requires GA4 or Stripe connector.",
    },
    seo: {
      score: metrics.websiteAuditScore ?? undefined,
      source: metrics.websiteAuditScore != null ? "website-audit" : "not-available",
    },
    timeline: metrics.timeline,
    notes: "",
    nextMonthPriorities,
    connectorStatus,
  };
}
