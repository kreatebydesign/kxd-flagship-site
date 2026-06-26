import "server-only";

import {
  ACTIVE_PROJECT_STATUSES,
  activeClients,
  clientId,
  clientName,
  daysSince,
  daysUntil,
  fmtMoney,
  latestActivityDate,
  retainerClientIds,
} from "@/lib/intelligence/context";
import type { FounderInsightsBundle, IntelligenceContext } from "@/lib/intelligence/types";
import type { ReportingDashboardData } from "@/lib/reporting/types";
import type { BrainPrediction } from "./types";

const STALE_DAYS_CHURN = 60;

export function buildBrainPredictions(input: {
  ctx: IntelligenceContext;
  founder: FounderInsightsBundle;
  reporting: ReportingDashboardData | null;
}): BrainPrediction[] {
  const { ctx, founder, reporting } = input;
  const predictions: BrainPrediction[] = [];
  const retainerIds = retainerClientIds(ctx);

  for (const client of activeClients(ctx)) {
    const cid = client.id as number;
    const name = String(client.name);
    const inactive = daysSince(latestActivityDate(ctx, cid)) ?? 0;
    const profile = ctx.executiveProfiles.find((p) => clientId(p.client) === cid);
    const expansion = Number(profile?.potentialMonthlyRevenue ?? 0);

    if (inactive > STALE_DAYS_CHURN || client.relationshipStatus === "at-risk") {
      predictions.push({
        id: `churn-${cid}`,
        label: `${name} — churn risk`,
        estimate: inactive > 90 ? "Elevated" : "Moderate",
        confidence: inactive > 90 ? "high" : "medium",
        basis: `${inactive} days since activity · status ${String(client.relationshipStatus ?? "unknown")}`,
        clientId: cid,
        clientName: name,
      });
    }

    if (expansion > 0 && inactive < 21) {
      predictions.push({
        id: `expand-${cid}`,
        label: `${name} — likely to expand`,
        estimate: fmtMoney(expansion) + "/mo",
        confidence: "medium",
        basis: "Active relationship with documented expansion potential.",
        clientId: cid,
        clientName: name,
      });
    }
  }

  const quarterlyRevenue = founder.revenue.activeMrr * 3 + founder.revenue.upcomingMrr;
  predictions.push({
    id: "quarterly-revenue",
    label: "Likely quarterly revenue",
    estimate: fmtMoney(quarterlyRevenue),
    confidence: "medium",
    basis: "Active MRR × 3 plus upcoming retainers.",
  });

  const mrrGrowth = founder.revenue.potentialExpansionRevenue;
  predictions.push({
    id: "mrr-growth",
    label: "Likely MRR growth opportunity",
    estimate: fmtMoney(mrrGrowth) + "/mo",
    confidence: mrrGrowth > 5000 ? "high" : "medium",
    basis: "Portfolio expansion signals and missing retainers.",
  });

  if (reporting) {
    predictions.push({
      id: "reporting-workload",
      label: "Reporting workload",
      estimate: `${reporting.reportsDue} reports due`,
      confidence: "high",
      basis: "Active clients without current-period report.",
    });
  }

  const renewals = ctx.infrastructure.filter((r) => {
    const d = daysUntil(r.nextRenewalDate as string);
    return d != null && d >= 0 && d <= 60;
  });
  if (renewals.length > 0) {
    predictions.push({
      id: "infra-renewals",
      label: "Infrastructure renewals",
      estimate: `${renewals.length} within 60 days`,
      confidence: "high",
      basis: "Infrastructure records with upcoming renewal dates.",
    });
  }

  const sentProposals = ctx.proposals.filter((p) =>
    ["sent", "viewed", "approved"].includes(String(p.status)),
  );
  const won = ctx.proposals.filter((p) => p.status === "converted" || p.status === "approved");
  const rate = sentProposals.length > 0 ? Math.round((won.length / sentProposals.length) * 100) : 0;
  predictions.push({
    id: "proposal-close",
    label: "Proposal close probability",
    estimate: `${rate}% historical`,
    confidence: sentProposals.length >= 5 ? "medium" : "low",
    basis: `${won.length} won of ${sentProposals.length} in pipeline sample.`,
  });

  const activeProjects = ctx.projects.filter((p) =>
    ACTIVE_PROJECT_STATUSES.has(String(p.status)),
  );
  const dueSoon = activeProjects.filter((p) => p.targetLaunchDate || p.dueDate);
  if (dueSoon.length > 0) {
    predictions.push({
      id: "project-windows",
      label: "Project completion windows",
      estimate: `${dueSoon.length} with target dates`,
      confidence: "medium",
      basis: "Active projects with launch or due dates on file.",
    });
  }

  return predictions.slice(0, 12);
}
