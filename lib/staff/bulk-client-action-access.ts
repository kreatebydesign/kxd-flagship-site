/**
 * Pure bulk client-action authorization — safe for verify scripts (no server-only).
 */
import { actorUsesAssignedClientScope } from "./client-scope";
import { isRestrictedStaff } from "./permissions";
import type { StaffActor } from "./types";

export type BulkActionClientBinding = {
  actionId: number;
  clientId: number;
};

export type BulkActionAuthResult =
  | { ok: true }
  | {
      ok: false;
      reason: "missing-action" | "unauthorized-client";
      actionId: number;
      clientId?: number;
    };

/**
 * When `assignedClientIds` is null, assignment-scoped roles are not limited (should not happen for BDS).
 * Empty array means no assigned clients.
 */
export function evaluateBulkClientActionAuthorization(
  actor: StaffActor,
  bindings: BulkActionClientBinding[],
  assignedClientIds: number[] | null,
): BulkActionAuthResult {
  for (const { actionId, clientId } of bindings) {
    if (!Number.isFinite(clientId) || clientId <= 0) {
      return { ok: false, reason: "missing-action", actionId };
    }
    if (!isRestrictedStaff(actor)) continue;
    if (!actorUsesAssignedClientScope(actor)) continue;
    const scope = assignedClientIds ?? [];
    if (!scope.includes(clientId)) {
      return { ok: false, reason: "unauthorized-client", actionId, clientId };
    }
  }
  return { ok: true };
}
