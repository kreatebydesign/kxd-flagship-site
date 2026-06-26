import "server-only";

import type { IntelligenceContext, IntelligenceInsight, GrowthOpportunity } from "@/lib/intelligence/types";
import { asNumber, fmtMoney } from "@/lib/intelligence/context";

export function buildSalesInsights(ctx: IntelligenceContext): IntelligenceInsight[] {
  const insights: IntelligenceInsight[] = [];
  const openLeads = ctx.salesLeads.filter((l) => !["won", "lost"].includes(String(l.status)));
  const openProposals = ctx.proposals.filter((p) =>
    ["sent", "viewed", "draft"].includes(String(p.status)),
  );

  const pipelineValue = openLeads.reduce((sum, l) => sum + (asNumber(l.estimatedValue) ?? 0), 0);
  if (pipelineValue > 0) {
    insights.push({
      id: "sales-pipeline-value",
      message: `Sales pipeline value ${fmtMoney(pipelineValue)} across ${openLeads.length} open leads.`,
      category: "revenue",
      urgency: "medium",
      relatedModules: ["Growth", "Sales"],
      metric: Math.round(pipelineValue),
      metricLabel: "USD pipeline",
    });
  }

  const sent = ctx.proposals.filter((p) => p.status === "sent").length;
  const viewed = ctx.proposals.filter((p) => p.status === "viewed" || Number(p.totalViews ?? 0) > 0).length;
  if (sent > 0) {
    const viewRate = Math.round((viewed / Math.max(sent, 1)) * 100);
    insights.push({
      id: "sales-proposal-view-rate",
      message: `Proposal view rate ${viewRate}% (${viewed} of ${sent} sent proposals engaged).`,
      category: "growth",
      urgency: viewRate < 40 ? "high" : "low",
      relatedModules: ["Sales"],
      metric: viewRate,
      metricLabel: "% viewed",
    });
  }

  const approved = ctx.proposals.filter((p) => p.status === "approved").length;
  const decided = ctx.proposals.filter((p) => ["approved", "rejected"].includes(String(p.status))).length;
  if (decided > 0) {
    const approvalRate = Math.round((approved / decided) * 100);
    insights.push({
      id: "sales-approval-rate",
      message: `Proposal approval rate ${approvalRate}% (${approved} won of ${decided} decided).`,
      category: "revenue",
      urgency: approvalRate < 50 ? "medium" : "low",
      relatedModules: ["Sales"],
      metric: approvalRate,
      metricLabel: "% approved",
    });
  }

  if (openProposals.length > 0) {
    insights.push({
      id: "sales-open-proposals",
      message: `${openProposals.length} proposal${openProposals.length === 1 ? "" : "s"} awaiting client decision.`,
      category: "growth",
      urgency: "medium",
      relatedModules: ["Sales"],
      metric: openProposals.length,
      metricLabel: "proposals",
    });
  }

  return insights;
}

export function buildSalesOpportunities(ctx: IntelligenceContext): GrowthOpportunity[] {
  const opportunities: GrowthOpportunity[] = [];

  const ranked = ctx.salesLeads
    .filter((l) => !["won", "lost", "nurturing"].includes(String(l.status)))
    .map((l) => {
      const value = asNumber(l.estimatedValue) ?? 0;
      const probability = asNumber(l.probability) ?? 25;
      return { lead: l, weighted: value * (probability / 100) };
    })
    .sort((a, b) => b.weighted - a.weighted)
    .slice(0, 5);

  for (const { lead, weighted } of ranked) {
    opportunities.push({
      id: `sales-lead-${lead.id}`,
      clientId: null,
      clientName: String(lead.companyName ?? "Lead"),
      title: `Pipeline · ${String(lead.status ?? "new")}`,
      reason: `${fmtMoney(asNumber(lead.estimatedValue) ?? 0)} · ${asNumber(lead.probability) ?? 25}% close`,
      estimatedBusinessValue: Math.round(weighted),
      urgency: weighted > 15000 ? "high" : "medium",
      confidence: "medium",
      recommendedAction: "Advance proposal or schedule follow-up.",
      relatedModules: ["Sales", "Growth"],
      category: "Pipeline",
      href: "/admin/sales",
    });
  }

  return opportunities;
}

export function buildSalesRevenueMetrics(ctx: IntelligenceContext) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const wonThisMonth = ctx.proposals.filter((p) => {
    if (p.status !== "approved") return false;
    const approvedAt = p.approvedAt ? new Date(String(p.approvedAt)) : null;
    return approvedAt && approvedAt >= monthStart;
  });

  const revenueWonThisMonth = wonThisMonth.reduce(
    (sum, p) => sum + (asNumber(p.paidAmount) ?? asNumber(p.investment) ?? 0),
    0,
  );

  const pending = ctx.proposals.filter((p) =>
    ["sent", "viewed"].includes(String(p.status)),
  );
  const revenuePending = pending.reduce(
    (sum, p) => sum + (asNumber(p.investment) ?? 0),
    0,
  );

  const openLeads = ctx.salesLeads.filter((l) => !["won", "lost"].includes(String(l.status)));
  const pipelineValue = openLeads.reduce((sum, l) => sum + (asNumber(l.estimatedValue) ?? 0), 0);
  const expectedProposalMrr = openLeads.reduce(
    (sum, l) => sum + (asNumber(l.estimatedMRR) ?? 0),
    0,
  );

  const sent = ctx.proposals.filter((p) => p.status === "sent").length;
  const viewed = ctx.proposals.filter((p) => Number(p.totalViews ?? 0) > 0).length;
  const approved = ctx.proposals.filter((p) => p.status === "approved").length;
  const decided = ctx.proposals.filter((p) => ["approved", "rejected"].includes(String(p.status))).length;

  return {
    pipelineValue,
    expectedProposalMrr,
    revenueWonThisMonth,
    revenuePending,
    proposalViewRate: sent > 0 ? Math.round((viewed / sent) * 100) : 0,
    proposalApprovalRate: decided > 0 ? Math.round((approved / decided) * 100) : 0,
  };
}
