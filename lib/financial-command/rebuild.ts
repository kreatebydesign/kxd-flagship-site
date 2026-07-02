/**
 * Rebuild financial snapshots and client health records.
 * Payload-safe for API routes.
 */
import type { Payload } from "payload";
import { getPayload } from "payload";
import config from "@payload-config";
import { buildClientFinancialMetrics, buildExecutiveFinancialMetrics } from "./snapshots";
import { publishFinancialSnapshotCreated } from "./timeline-publish";
import { buildFinancialIntelligence } from "./intelligence";
import { loadBillingProfile } from "./billing-profile";
import type { FinancialCommandResponse } from "./types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

function periodLabel(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export async function rebuildFinancialSnapshots(
  payloadInstance?: Payload,
): Promise<FinancialCommandResponse> {
  const payload = payloadInstance ?? (await getPayload({ config }));
  const period = periodLabel();
  const executive = await buildExecutiveFinancialMetrics(payload);

  const execSnapshot = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "financial-snapshots" as any,
    where: {
      and: [
        { snapshotType: { equals: "executive" } },
        { periodLabel: { equals: period } },
      ],
    },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });

  let snapshotId: number | undefined;
  if (execSnapshot.docs[0]) {
    const updated = await payload.update({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "financial-snapshots" as any,
      id: (execSnapshot.docs[0] as AnyDoc).id,
      data: { metrics: executive, generatedAt: new Date().toISOString() },
      overrideAccess: true,
    });
    snapshotId = updated.id as number;
  } else {
    const created = await payload.create({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "financial-snapshots" as any,
      data: {
        snapshotType: "executive",
        periodLabel: period,
        generatedAt: new Date().toISOString(),
        metrics: executive,
      },
      overrideAccess: true,
    });
    snapshotId = created.id as number;
  }

  const clientsR = await payload.find({
    collection: "clients",
    where: { status: { equals: "active" } },
    limit: 500,
    depth: 0,
    overrideAccess: true,
  });

  for (const client of clientsR.docs as AnyDoc[]) {
    const clientId = client.id as number;
    const metrics = await buildClientFinancialMetrics(payload, clientId);

    await publishFinancialSnapshotCreated(
      {
        clientId,
        snapshotType: "client",
        periodLabel: period,
        metrics,
      },
      payload,
    );

    const billing = await loadBillingProfile(clientId, payload);
    const intel = buildFinancialIntelligence(clientId, metrics, billing, []);
    const healthScore = Math.max(
      0,
      Math.min(
        100,
        70 -
          (metrics.atRiskAmount > 0 ? 15 : 0) -
          (intel.signals.filter((s) => s.priority === "critical").length * 10) -
          (intel.signals.filter((s) => s.category === "billing").length * 8),
      ),
    );
    const riskLevel =
      healthScore < 40 ? "critical" : healthScore < 60 ? "high" : healthScore < 75 ? "medium" : "low";

    const existing = await payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "client-financial-health" as any,
      where: { client: { equals: clientId } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    });

    const healthData = {
      client: clientId,
      healthScore,
      riskLevel,
      mrr: metrics.mrr,
      lifetimeValue: metrics.lifetimeValue,
      contractedValue: metrics.contractedValue,
      pipelineValue: metrics.pipelineValue,
      projectValue: metrics.projectValue,
      atRiskAmount: metrics.atRiskAmount,
      billingSetupComplete: billing.setupComplete,
      renewalStatus: metrics.renewalStatus,
      flags: intel.signals.map((s) => s.id),
      recommendations: intel.signals,
      lastCalculatedAt: new Date().toISOString(),
    };

    if (existing.docs[0]) {
      await payload.update({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        collection: "client-financial-health" as any,
        id: (existing.docs[0] as AnyDoc).id,
        data: healthData,
        overrideAccess: true,
      });
    } else {
      await payload.create({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        collection: "client-financial-health" as any,
        data: healthData,
        overrideAccess: true,
      });
    }
  }

  return {
    executive,
    snapshotId,
    generatedAt: new Date().toISOString(),
  };
}
