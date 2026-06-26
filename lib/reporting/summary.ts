import type { ClientMonthlyMetrics, ReportRecommendationSet } from "./types";

export function buildExecutiveSummaryText(
  metrics: ClientMonthlyMetrics,
  recommendations: ReportRecommendationSet,
): string {
  const parts: string[] = [];

  const deliverableCount = metrics.deliverablesCompleted.length;
  const projectCount = metrics.activeProjects.length;
  if (deliverableCount > 0 || projectCount > 0) {
    parts.push(
      `This month KXD completed ${deliverableCount} deliverable${deliverableCount === 1 ? "" : "s"} across ${projectCount} active initiative${projectCount === 1 ? "" : "s"}.`,
    );
  } else {
    parts.push(
      `This month KXD maintained ${projectCount} active initiative${projectCount === 1 ? "" : "s"} with focused delivery and strategic planning.`,
    );
  }

  if (metrics.websiteAuditScore != null) {
    const prev = metrics.previousHealthScore ?? metrics.websiteAuditScore;
    if (metrics.websiteAuditScore > prev) {
      parts.push(`Website health improved to ${metrics.websiteAuditScore}.`);
    } else if (metrics.websiteAuditScore >= 80) {
      parts.push(`Website health remains strong at ${metrics.websiteAuditScore}.`);
    } else {
      parts.push(`Website health score is ${metrics.websiteAuditScore} — optimization opportunities remain.`);
    }
  }

  if (metrics.infrastructureStatus === "healthy") {
    parts.push("Infrastructure is fully operational.");
  } else if (metrics.infrastructureStatus !== "unknown") {
    parts.push(`Infrastructure status: ${metrics.infrastructureStatus.replace(/-/g, " ")}.`);
  }

  const growthCount = recommendations.growthOpportunities.length;
  if (growthCount > 0) {
    parts.push(
      `${growthCount} growth opportunit${growthCount === 1 ? "y" : "ies"} identified for the month ahead.`,
    );
  }

  if (metrics.healthScore != null) {
    parts.push(`Overall client health score: ${metrics.healthScore}/100.`);
  }

  return parts.join(" ");
}

export function buildWorkCompletedText(metrics: ClientMonthlyMetrics): string {
  const lines: string[] = [];

  for (const d of metrics.deliverablesCompleted.slice(0, 12)) {
    lines.push(`· ${String(d.title ?? d.name ?? "Deliverable")} — completed`);
  }
  for (const p of metrics.completedProjects.slice(0, 6)) {
    lines.push(`· ${String(p.projectName ?? p.name ?? "Project")} — milestone reached`);
  }
  for (const c of metrics.creativeItems.slice(0, 6)) {
    lines.push(`· Creative: ${String(c.title ?? c.campaignName ?? c.name ?? "Campaign")}`);
  }
  for (const r of metrics.completedRequests.slice(0, 6)) {
    lines.push(`· Request completed: ${String(r.title ?? r.subject ?? "Request")}`);
  }

  if (lines.length === 0) {
    return "Delivery focused on planning, infrastructure, and relationship continuity this month.";
  }

  return lines.join("\n");
}

export function buildNextMonthPriorities(
  recommendations: ReportRecommendationSet,
): string[] {
  const items = [
    ...recommendations.topPriorities.slice(0, 3),
    ...recommendations.quickWins.slice(0, 2),
  ];
  if (items.length === 0) {
    return ["Continue monthly care cadence", "Review growth opportunities with client"];
  }
  return items;
}
