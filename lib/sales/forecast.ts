import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import type { ForecastMetrics, SalesDoc } from "./types";

function monthKey(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

export async function getForecastDashboard(): Promise<ForecastMetrics> {
  const payload = await getPayload({ config });

  const result = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "sales-leads" as any,
    limit: 500,
    depth: 0,
    overrideAccess: true,
  });

  const leads = result.docs as SalesDoc[];
  const open = leads.filter((l) => !["won", "lost", "nurturing"].includes(String(l.status)));

  const pipelineValue = open.reduce((sum, l) => sum + Number(l.estimatedValue ?? 0), 0);
  const expectedMRR = open.reduce((sum, l) => sum + Number(l.estimatedMRR ?? 0), 0);

  const weightedPipelineValue = open.reduce((sum, l) => {
    const value = Number(l.estimatedValue ?? 0);
    const probability = Number(l.probability ?? 25) / 100;
    return sum + value * probability;
  }, 0);

  const averageDealSize =
    open.length > 0 ? pipelineValue / open.length : 0;

  const averageProbability =
    open.length > 0
      ? open.reduce((sum, l) => sum + Number(l.probability ?? 25), 0) / open.length
      : 0;

  const topOpportunities = open
    .map((l) => {
      const estimatedValue = Number(l.estimatedValue ?? 0);
      const probability = Number(l.probability ?? 25);
      return {
        id: l.id as number,
        companyName: String(l.companyName ?? "—"),
        status: String(l.status ?? "new"),
        estimatedValue,
        estimatedMRR: Number(l.estimatedMRR ?? 0),
        probability,
        weightedValue: estimatedValue * (probability / 100),
      };
    })
    .sort((a, b) => b.weightedValue - a.weightedValue)
    .slice(0, 8);

  const monthlyForecast: { month: string; value: number }[] = [];
  const now = new Date();
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const key = monthKey(d);
    const monthLeads = open.filter((l) => {
      if (!l.nextFollowUp) return i === 0;
      try {
        const followUp = new Date(String(l.nextFollowUp));
        return followUp.getMonth() === d.getMonth() && followUp.getFullYear() === d.getFullYear();
      } catch {
        return i === 0;
      }
    });
    const value = monthLeads.reduce((sum, l) => {
      const v = Number(l.estimatedValue ?? 0);
      const p = Number(l.probability ?? 25) / 100;
      return sum + v * p;
    }, 0);
    monthlyForecast.push({ month: key, value });
  }

  return {
    pipelineValue,
    expectedMRR,
    weightedPipelineValue,
    averageDealSize,
    averageProbability,
    openOpportunities: open.length,
    monthlyForecast,
    topOpportunities,
  };
}
