import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import { displayRevenueEventType } from "./lifecycle";
import { loadBillingProfile } from "./billing-profile";
import { buildClientFinancialMetrics } from "./snapshots";
import type { WorkspaceFinancialSnapshot } from "./types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

export async function loadClientFinancialSnapshot(
  clientId: number,
): Promise<WorkspaceFinancialSnapshot> {
  const payload = await getPayload({ config });

  const [metrics, billingProfile, eventsR, healthR] = await Promise.all([
    buildClientFinancialMetrics(payload, clientId),
    loadBillingProfile(clientId, payload),
    payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "revenue-events" as any,
      where: { client: { equals: clientId } },
      limit: 30,
      sort: "-occurredAt",
      depth: 0,
      overrideAccess: true,
    }),
    payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "client-financial-health" as any,
      where: { client: { equals: clientId } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    }),
  ]);

  const health = (healthR.docs[0] as AnyDoc) ?? null;

  const revenueEvents = (eventsR.docs as AnyDoc[]).map((doc) => ({
    id: doc.id as number,
    eventType: String(doc.eventType),
    displayType: displayRevenueEventType(String(doc.eventType)),
    title: String(doc.title),
    amount: doc.amount != null ? Number(doc.amount) : null,
    occurredAt: String(doc.occurredAt),
  }));

  return {
    ...metrics,
    billingProfile,
    healthScore: health?.healthScore != null ? Number(health.healthScore) : 70,
    riskLevel: health?.riskLevel ? String(health.riskLevel) : "low",
    revenueEvents,
  };
}
