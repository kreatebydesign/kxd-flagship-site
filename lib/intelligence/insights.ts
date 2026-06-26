import "server-only";

import { calculateMonthlyStackCost } from "@/lib/infrastructure/data";
import type { InfraDoc } from "@/lib/infrastructure/types";
import {
  STALE_AUDIT_DAYS,
  STALE_TIMELINE_DAYS,
  activeClients,
  activeRetainers,
  asNumber,
  clientId,
  daysSince,
  fmtMoney,
  latestActivityDate,
  loadIntelligenceContext,
  retainerClientIds,
} from "./context";
import type { IntelligenceContext, IntelligenceInsight } from "./types";
import { buildSalesInsights } from "@/lib/sales/intelligence";
import { buildReportingInsights } from "./reporting";

export function generateInsights(ctx: IntelligenceContext): IntelligenceInsight[] {
  const insights: IntelligenceInsight[] = [];

  const infraIssues = ctx.infrastructure.filter((r) =>
    ["attention", "critical", "unknown"].includes(String(r.status)),
  );
  if (infraIssues.length > 0) {
    insights.push({
      id: "infra-issues",
      message: `${infraIssues.length} client${infraIssues.length === 1 ? "" : "s"} have infrastructure issues.`,
      category: "infrastructure",
      urgency: infraIssues.some((r) => r.status === "critical") ? "critical" : "high",
      relatedModules: ["Infrastructure"],
      metric: infraIssues.length,
      metricLabel: "clients",
    });
  }

  const retainerIds = retainerClientIds(ctx);
  let mrrOpportunity = 0;
  for (const client of activeClients(ctx)) {
    if (!retainerIds.has(client.id as number)) {
      mrrOpportunity += asNumber(client.monthlyRetainerAmount) ?? 2500;
    }
  }
  for (const profile of ctx.executiveProfiles) {
    const potential = asNumber(profile.potentialMonthlyRevenue);
    if (potential && potential > 0) mrrOpportunity += potential;
  }
  if (mrrOpportunity > 0) {
    insights.push({
      id: "mrr-opportunity",
      message: `MRR opportunity estimated at ${fmtMoney(mrrOpportunity)}/month.`,
      category: "revenue",
      urgency: "medium",
      relatedModules: ["Growth", "Accounts"],
      metric: Math.round(mrrOpportunity),
      metricLabel: "USD/mo",
    });
  }

  let inactiveCount = 0;
  for (const client of activeClients(ctx)) {
    const last = latestActivityDate(ctx, client.id as number);
    if ((daysSince(last) ?? 0) > STALE_TIMELINE_DAYS) inactiveCount++;
  }
  if (inactiveCount > 0) {
    insights.push({
      id: "inactive-relationships",
      message: `${inactiveCount} relationship${inactiveCount === 1 ? "" : "s"} have become inactive.`,
      category: "relationship",
      urgency: inactiveCount >= 3 ? "high" : "medium",
      relatedModules: ["Timeline", "Clients"],
      metric: inactiveCount,
      metricLabel: "clients",
    });
  }

  const staleAudits = ctx.audits.filter((a) => {
    if (!["new-lead", "contacted", "qualified"].includes(String(a.status))) return false;
    const age = daysSince(a.completedAt as string ?? a.createdAt as string);
    return age != null && age > 14;
  });
  if (staleAudits.length > 0) {
    insights.push({
      id: "audit-followup-delay",
      message: "Website audits are generating leads but follow-up is delayed.",
      category: "growth",
      urgency: "high",
      relatedModules: ["Website Auditor", "Growth"],
      metric: staleAudits.length,
      metricLabel: "leads",
    });
  }

  const openCriticalEvents = ctx.infraEvents.filter(
    (e) => e.status === "open" && e.severity === "critical",
  );
  if (openCriticalEvents.length > 0) {
    insights.push({
      id: "critical-infra-events",
      message: `${openCriticalEvents.length} open critical infrastructure event${openCriticalEvents.length === 1 ? "" : "s"}.`,
      category: "infrastructure",
      urgency: "critical",
      relatedModules: ["Infrastructure", "Automation"],
      metric: openCriticalEvents.length,
      metricLabel: "events",
    });
  }

  const monthlyStack = calculateMonthlyStackCost(ctx.infraCosts as InfraDoc[]);
  const activeMrr = activeRetainers(ctx).reduce(
    (s, r) => s + (asNumber(r.monthlyAmount) ?? 0),
    0,
  );
  if (monthlyStack > 0 && activeMrr > 0) {
    const margin = activeMrr - monthlyStack;
    insights.push({
      id: "stack-margin",
      message: `Portfolio stack cost ${fmtMoney(monthlyStack)}/mo against ${fmtMoney(activeMrr)} MRR.`,
      category: "finance",
      urgency: margin < 0 ? "high" : "low",
      relatedModules: ["Infrastructure", "Accounts"],
      metric: Math.round(margin),
      metricLabel: "margin USD/mo",
    });
  }

  const oldAudits = ctx.audits.filter((a) => {
    const age = daysSince(a.completedAt as string ?? a.createdAt as string);
    return age != null && age > STALE_AUDIT_DAYS;
  });
  if (oldAudits.length > 0) {
    insights.push({
      id: "stale-audits",
      message: `${oldAudits.length} website audit${oldAudits.length === 1 ? "" : "s"} older than ${STALE_AUDIT_DAYS} days.`,
      category: "growth",
      urgency: "low",
      relatedModules: ["Website Auditor"],
      metric: oldAudits.length,
      metricLabel: "audits",
    });
  }

  const clientsWithoutRetainers = activeClients(ctx).filter(
    (c) => !retainerIds.has(c.id as number),
  );
  if (clientsWithoutRetainers.length > 0) {
    insights.push({
      id: "missing-retainers",
      message: `${clientsWithoutRetainers.length} active client${clientsWithoutRetainers.length === 1 ? "" : "s"} without retainer on file.`,
      category: "revenue",
      urgency: "high",
      relatedModules: ["Growth", "Accounts"],
      metric: clientsWithoutRetainers.length,
      metricLabel: "clients",
    });
  }

  insights.push(...buildSalesInsights(ctx));
  insights.push(...buildReportingInsights(ctx));

  insights.sort(
    (a, b) =>
      ({ critical: 0, high: 1, medium: 2, low: 3 }[a.urgency] ?? 99) -
      ({ critical: 0, high: 1, medium: 2, low: 3 }[b.urgency] ?? 99),
  );

  return insights;
}

export async function getInsights(ctx?: IntelligenceContext): Promise<IntelligenceInsight[]> {
  const context = ctx ?? (await loadIntelligenceContext());
  return generateInsights(context);
}
