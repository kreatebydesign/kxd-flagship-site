import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import { buildExecutiveFinancialMetrics } from "@/lib/financial-command/snapshots";
import type { PlatformCommercialEvidence } from "./types";

export async function loadPlatformCommercialEvidence(): Promise<PlatformCommercialEvidence> {
  const payload = await getPayload({ config });
  const metrics = await buildExecutiveFinancialMetrics(payload);
  const payingClients = metrics.revenueByClient.filter((row) => row.mrr > 0).length;

  return {
    studioPortfolioMrrUsd: metrics.mrr,
    studioActiveRetainerServices: metrics.activeRetainers,
    studioPayingClientRows: payingClients,
    loadedAt: new Date().toISOString(),
  };
}
