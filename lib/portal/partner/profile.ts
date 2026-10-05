import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import type { PartnerProfileRecord } from "./types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

function relId(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && /^\d+$/.test(value)) return Number(value);
  if (value && typeof value === "object" && "id" in value) {
    const id = (value as { id: unknown }).id;
    if (typeof id === "number" && Number.isFinite(id)) return id;
    if (typeof id === "string" && /^\d+$/.test(id)) return Number(id);
  }
  return null;
}

export async function findActivePartnerProfileForUser(
  portalUserId: number,
): Promise<PartnerProfileRecord | null> {
  if (!portalUserId || !Number.isFinite(portalUserId)) return null;

  const payload = await getPayload({ config });
  const result = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "kxd-partner-profiles" as any,
    where: {
      and: [
        { portalUser: { equals: portalUserId } },
        { status: { equals: "active" } },
      ],
    },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });

  const doc = result.docs[0] as AnyDoc | undefined;
  if (!doc) return null;

  const id = Number(doc.id);
  const linkedUserId = relId(doc.portalUser);
  if (!Number.isFinite(id) || linkedUserId !== portalUserId) return null;

  return {
    id,
    portalUserId,
    displayName: String(doc.displayName ?? "").trim() || "Partner",
    status: doc.status === "inactive" ? "inactive" : "active",
  };
}
