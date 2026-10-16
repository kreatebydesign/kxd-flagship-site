import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import type { StaffActor } from "./types";
import { isRestrictedStaff } from "./permissions";
import { actorUsesAssignedClientScope } from "./client-scope";

export { actorUsesAssignedClientScope } from "./client-scope";

export const STAFF_CLIENT_ASSIGNMENTS_COLLECTION =
  "staff-client-assignments" as const;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

function relId(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (value && typeof value === "object" && "id" in value) {
    const id = Number((value as AnyDoc).id);
    return Number.isFinite(id) ? id : null;
  }
  return null;
}

export async function listActiveAssignedClientIds(
  staffUserId: number,
): Promise<number[]> {
  const payload = await getPayload({ config });
  const result = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: STAFF_CLIENT_ASSIGNMENTS_COLLECTION as any,
    where: {
      and: [
        { staffUser: { equals: staffUserId } },
        { active: { equals: true } },
      ],
    },
    limit: 500,
    depth: 0,
    overrideAccess: true,
  });

  const ids: number[] = [];
  for (const doc of result.docs as AnyDoc[]) {
    const clientId = relId(doc.client);
    if (clientId != null && clientId > 0) ids.push(clientId);
  }
  return [...new Set(ids)];
}

/**
 * Resolve allowed client ids for the actor, or null when no client filter applies
 * (studio operators and legacy coordinator portfolio access).
 */
export async function resolveStaffClientScope(
  actor: StaffActor,
): Promise<number[] | null> {
  if (!actorUsesAssignedClientScope(actor)) return null;
  return await listActiveAssignedClientIds(actor.userId);
}

export async function staffMayAccessClient(
  actor: StaffActor,
  clientId: number | null | undefined,
): Promise<boolean> {
  if (!isRestrictedStaff(actor)) return true;
  if (clientId == null || !Number.isFinite(clientId) || clientId <= 0) {
    // Internal / non-client work — allowed when assigned to the work item (checked elsewhere).
    return true;
  }
  const scope = await resolveStaffClientScope(actor);
  if (scope === null) return true;
  return scope.includes(clientId);
}

export async function assertStaffClientAccess(
  actor: StaffActor,
  clientId: number | null | undefined,
): Promise<void> {
  const allowed = await staffMayAccessClient(actor, clientId);
  if (!allowed) {
    throw new Error("Staff permission denied: client not in assigned scope.");
  }
}

/** Payload `where` fragment — client id must be in list. */
export function clientIdInWhere(clientIds: number[]): AnyDoc {
  if (clientIds.length === 0) {
    return { id: { equals: -1 } };
  }
  if (clientIds.length === 1) {
    return { id: { equals: clientIds[0] } };
  }
  return { id: { in: clientIds } };
}

export function clientRequestsClientWhere(clientIds: number[]): AnyDoc {
  if (clientIds.length === 0) {
    return { client: { equals: -1 } };
  }
  if (clientIds.length === 1) {
    return { client: { equals: clientIds[0] } };
  }
  return { client: { in: clientIds } };
}
