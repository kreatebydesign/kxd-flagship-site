import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import { NextResponse } from "next/server";
import { staffActorFromUser } from "./actor";
import { actorUsesAssignedClientScope, listActiveAssignedClientIds } from "./client-assignments";
import { isRestrictedStaff } from "./permissions";
import {
  STAFF_BULK_CLIENT_REQUEST_DENIED,
  validateBulkClientRequestAccess,
} from "./bulk-client-request-validation";

export { STAFF_BULK_CLIENT_REQUEST_DENIED, validateBulkClientRequestAccess };

function relClientId(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (value && typeof value === "object" && "id" in value) {
    const id = Number((value as { id: unknown }).id);
    return Number.isFinite(id) ? id : null;
  }
  return null;
}

/**
 * Restricted staff with assigned-client scope must pass for every id.
 * Coordinators and operators pass through (null).
 */
export async function denyUnlessStaffBulkClientRequests(
  user: object,
  requestIds: number[],
): Promise<NextResponse | null> {
  const actor = staffActorFromUser(user);
  if (!actor || !isRestrictedStaff(actor)) return null;
  if (!actorUsesAssignedClientScope(actor)) return null;

  const unique = [...new Set(requestIds.filter((id) => Number.isFinite(id) && id > 0))];
  if (unique.length === 0) return null;

  const allowedClientIds = await listActiveAssignedClientIds(actor.userId);
  const payload = await getPayload({ config });
  const result = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "client-requests" as any,
    where: { id: { in: unique } },
    limit: unique.length,
    depth: 0,
    overrideAccess: true,
  });

  const resolved = new Map<number, number | null>();
  for (const doc of result.docs as Array<{ id: unknown; client?: unknown }>) {
    const id = Number(doc.id);
    if (Number.isFinite(id)) {
      resolved.set(id, relClientId(doc.client));
    }
  }

  const ok = validateBulkClientRequestAccess({
    usesAssignmentScope: true,
    allowedClientIds,
    requestedIds: unique,
    resolvedClients: resolved,
  });

  if (!ok) {
    return NextResponse.json(
      { ok: false, success: false, error: STAFF_BULK_CLIENT_REQUEST_DENIED },
      { status: 403 },
    );
  }
  return null;
}
