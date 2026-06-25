import type { CollectionBeforeChangeHook } from "payload";
import { calculateEstimatedAnnualValue } from "../../lib/executive-client-profile.ts";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

function resolveClientId(raw: unknown): number | null {
  if (!raw) return null;
  if (typeof raw === "number") return raw;
  if (typeof raw === "object" && raw !== null && "id" in raw) {
    return (raw as AnyDoc).id as number;
  }
  return null;
}

export const applyExecutiveAnnualValue: CollectionBeforeChangeHook = async ({
  data,
  req,
  operation,
}) => {
  const doc = data as AnyDoc;
  const monthly = doc.currentMonthlyRevenue as number | null | undefined;
  const manualAnnual = doc.estimatedAnnualValue as number | null | undefined;

  const calculated = calculateEstimatedAnnualValue(monthly, manualAnnual);
  if (calculated != null && (manualAnnual == null || manualAnnual === 0)) {
    doc.estimatedAnnualValue = calculated;
  }

  const clientId = resolveClientId(doc.client);
  if (clientId) {
    try {
      const client = await req.payload.findByID({
        collection: "clients",
        id: clientId,
        depth: 0,
      });
      if (client?.name) {
        doc.profileTitle = client.name as string;
      }
    } catch {
      // profile title sync is best-effort
    }
  }

  if (operation === "create" && !doc.profileTitle && clientId) {
    doc.profileTitle = `Client ${clientId}`;
  }

  return doc;
};
