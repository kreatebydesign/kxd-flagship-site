import "server-only";

import type { IntelligenceContext, IntelligenceInsight } from "./types";

export function buildExecutiveNotesInsights(ctx: IntelligenceContext): IntelligenceInsight[] {
  const insights: IntelligenceInsight[] = [];
  const now = Date.now();
  const notes = ctx.executiveNotes.filter((n) => n.status === "active");

  const overdue = notes.filter((n) => {
    if (!n.reminderDate) return false;
    return new Date(String(n.reminderDate)).getTime() < now;
  });

  if (overdue.length > 0) {
    insights.push({
      id: "notes-overdue",
      message: `${overdue.length} executive note reminder${overdue.length === 1 ? "" : "s"} overdue.`,
      category: "relationship",
      urgency: overdue.length >= 3 ? "high" : "medium",
      relatedModules: ["Strategy Vault", "Timeline"],
      metric: overdue.length,
      metricLabel: "overdue",
    });
  }

  const dueSoon = notes.filter((n) => {
    if (!n.reminderDate) return false;
    const d = new Date(String(n.reminderDate)).getTime();
    const in7 = now + 7 * 86_400_000;
    return d >= now && d <= in7;
  });

  if (dueSoon.length > 0) {
    insights.push({
      id: "notes-due-soon",
      message: `${dueSoon.length} strategy reminder${dueSoon.length === 1 ? "" : "s"} due within 7 days.`,
      category: "operations",
      urgency: "medium",
      relatedModules: ["Strategy Vault"],
      metric: dueSoon.length,
      metricLabel: "due soon",
    });
  }

  const highPriority = notes.filter((n) =>
    ["high", "critical"].includes(String(n.priority)),
  );
  if (highPriority.length > 0) {
    insights.push({
      id: "notes-high-priority",
      message: `${highPriority.length} high-priority executive note${highPriority.length === 1 ? "" : "s"} in the vault.`,
      category: "strategy",
      urgency: highPriority.some((n) => n.priority === "critical") ? "high" : "medium",
      relatedModules: ["Strategy Vault", "Founder Intelligence"],
      metric: highPriority.length,
      metricLabel: "priority notes",
    });
  }

  const opportunities = notes.filter((n) =>
    ["opportunity", "sales"].includes(String(n.noteType)),
  );
  if (opportunities.length > 0) {
    insights.push({
      id: "notes-opportunities",
      message: `${opportunities.length} open opportunity note${opportunities.length === 1 ? "" : "s"} captured in the strategy vault.`,
      category: "revenue",
      urgency: "low",
      relatedModules: ["Strategy Vault", "Sales"],
      metric: opportunities.length,
      metricLabel: "opportunities",
    });
  }

  return insights;
}
