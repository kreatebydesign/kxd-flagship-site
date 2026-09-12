/**
 * Lightweight infrastructure signals for Client Operating State resolve.
 * Facts-only — no recommendations.
 */

import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import type { OperatingInfrastructureSignals } from "@/lib/ces/operating-state";

export async function loadOperatingInfrastructureSignals(
  clientId: number,
): Promise<OperatingInfrastructureSignals | null> {
  try {
    const payload = await getPayload({ config });
    const result = await payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "client-infrastructure" as any,
      where: { client: { equals: clientId } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    });
    const doc = result.docs[0] as Record<string, unknown> | undefined;
    if (!doc) return null;
    return {
      deploymentStatus:
        typeof doc.deploymentStatus === "string" ? doc.deploymentStatus : null,
      productionUrl:
        typeof doc.productionUrl === "string" ? doc.productionUrl : null,
      ga4PropertyId:
        typeof doc.ga4PropertyId === "string" ? doc.ga4PropertyId : null,
      searchConsoleSiteUrl:
        typeof doc.searchConsoleSiteUrl === "string"
          ? doc.searchConsoleSiteUrl
          : null,
      googleAdsCustomerId:
        typeof doc.googleAdsCustomerId === "string"
          ? doc.googleAdsCustomerId
          : null,
    };
  } catch {
    return null;
  }
}
