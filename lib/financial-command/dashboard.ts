import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import { buildExecutiveFinancialMetrics } from "./snapshots";
import type { ExecutiveFinancialAlert, ExecutiveFinancialWidget } from "./types";

export async function loadExecutiveFinancialWidget(): Promise<ExecutiveFinancialWidget> {
  const payload = await getPayload({ config });
  const metrics = await buildExecutiveFinancialMetrics(payload);
  const alerts: ExecutiveFinancialAlert[] = [];

  if (metrics.missingBillingSetup > 0) {
    alerts.push({
      id: "fin-missing-billing",
      label: "Missing billing setup",
      detail: `${metrics.missingBillingSetup} active client(s) without billing profiles.`,
      amount: null,
      priority: "high",
      href: "/admin/operations/executive",
    });
  }

  if (metrics.atRiskRevenue > 0) {
    alerts.push({
      id: "fin-at-risk",
      label: "Revenue at risk",
      detail: "Unsigned contracts, overdue retainers, or stalled collections.",
      amount: metrics.atRiskRevenue,
      priority: "critical",
      href: "/admin/operations/executive",
    });
  }

  if (metrics.upcomingRenewals > 0) {
    alerts.push({
      id: "fin-renewals",
      label: "Upcoming renewals",
      detail: `${metrics.upcomingRenewals} retainer renewal(s) in the next 60 days.`,
      amount: null,
      priority: "medium",
      href: "/admin/operations/executive",
    });
  }

  if (metrics.pipelineValue > metrics.mrr * 6) {
    alerts.push({
      id: "fin-pipeline-heavy",
      label: "Pipeline opportunity",
      detail: "Pipeline value exceeds 6× MRR — prioritize conversion.",
      amount: metrics.pipelineValue,
      priority: "medium",
      href: "/admin/sales/proposals",
    });
  }

  return {
    mrr: metrics.mrr,
    pipelineValue: metrics.pipelineValue,
    contractedRevenue: metrics.contractedRevenue,
    projectedAnnualValue: metrics.projectedAnnualValue,
    activeRetainers: metrics.activeRetainers,
    atRiskRevenue: metrics.atRiskRevenue,
    missingBillingSetup: metrics.missingBillingSetup,
    upcomingRenewals: metrics.upcomingRenewals,
    alerts: alerts.slice(0, 8),
    topClientsByRevenue: metrics.revenueByClient.slice(0, 8).map((row) => ({
      clientId: row.clientId,
      clientName: row.clientName,
      mrr: row.mrr,
      lifetimeValue: row.total,
      href: `/admin/operations/client-command/${row.clientId}?tab=financial`,
    })),
    generatedAt: new Date().toISOString(),
  };
}
