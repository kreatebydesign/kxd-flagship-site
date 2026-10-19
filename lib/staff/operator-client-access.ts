import "server-only";

import { notFound } from "next/navigation";
import { NextResponse } from "next/server";
import { getPayloadAdminUser } from "@/lib/admin/auth";
import { staffActorFromUser } from "./actor";
import { staffMayAccessClient, resolveStaffClientScope } from "./client-assignments";
import { isRestrictedStaff } from "./permissions";

/**
 * Session gate for server loaders. Returns true when the current user must not receive client data.
 */
export async function isCurrentSessionDeniedClientData(
  clientId: number,
): Promise<boolean> {
  if (!Number.isFinite(clientId) || clientId <= 0) return true;
  const user = await getPayloadAdminUser();
  if (!user) return true;
  const actor = staffActorFromUser(user);
  if (!actor) return true;
  if (!isRestrictedStaff(actor)) return false;
  const allowed = await staffMayAccessClient(actor, clientId);
  return !allowed;
}

/** Page-level defense — 404 avoids leaking client existence to unauthorized staff. */
export async function requireOperatorClientPageAccess(clientId: number): Promise<void> {
  if (await isCurrentSessionDeniedClientData(clientId)) {
    notFound();
  }
}

/**
 * API gate for client-scoped operator routes. Admins pass; restricted staff require assignment.
 */
export async function denyUnlessOperatorClientAccess(
  user: object,
  clientId: number,
): Promise<NextResponse | null> {
  if (!Number.isFinite(clientId) || clientId <= 0) {
    return NextResponse.json(
      { success: false, ok: false, error: "Valid clientId is required." },
      { status: 400 },
    );
  }
  const actor = staffActorFromUser(user);
  if (!actor || !isRestrictedStaff(actor)) return null;
  const allowed = await staffMayAccessClient(actor, clientId);
  if (!allowed) {
    return NextResponse.json(
      {
        success: false,
        ok: false,
        error: "Staff permission denied: client not in assigned scope.",
      },
      { status: 403 },
    );
  }
  return null;
}

/** Restricted staff must not list operator client hubs across the portfolio. */
/**
 * Authorize every client-action id in a bulk patch before any mutation.
 * Rejects the full batch on missing rows or any out-of-scope client.
 */
export async function denyUnlessOperatorBulkClientActions(
  user: object,
  actionIds: readonly number[],
): Promise<NextResponse | null> {
  if (!actionIds.length) {
    return NextResponse.json(
      { success: false, ok: false, error: "ids array is required." },
      { status: 400 },
    );
  }

  const { resolveClientIdsForClientActions } = await import(
    "@/lib/client-command/actions/data"
  );
  const { evaluateBulkClientActionAuthorization } = await import(
    "./bulk-client-action-access"
  );

  const resolved = await resolveClientIdsForClientActions(actionIds);
  if (!resolved.ok) {
    return NextResponse.json(
      {
        success: false,
        ok: false,
        error: "One or more actions were not found.",
        missingActionIds: resolved.missingActionIds,
      },
      { status: 404 },
    );
  }

  const actor = staffActorFromUser(user);
  if (!actor) {
    return NextResponse.json(
      { success: false, ok: false, error: "Unauthorized." },
      { status: 401 },
    );
  }

  if (!isRestrictedStaff(actor)) {
    return null;
  }

  const scope = await resolveStaffClientScope(actor);
  const authz = evaluateBulkClientActionAuthorization(
    actor,
    resolved.bindings,
    scope,
  );
  if (!authz.ok) {
    if (authz.reason === "missing-action") {
      return NextResponse.json(
        {
          success: false,
          ok: false,
          error: "One or more actions were not found.",
          actionId: authz.actionId,
        },
        { status: 404 },
      );
    }
    return NextResponse.json(
      {
        success: false,
        ok: false,
        error: "Staff permission denied: client not in assigned scope.",
        actionId: authz.actionId,
        clientId: authz.clientId,
      },
      { status: 403 },
    );
  }

  return null;
}

export async function filterClientIdsForCurrentSession(
  clientIds: number[],
): Promise<number[]> {
  const user = await getPayloadAdminUser();
  if (!user) return [];
  const actor = staffActorFromUser(user);
  if (!actor) return [];
  const scope = await resolveStaffClientScope(actor);
  if (scope === null) return clientIds;
  const allowed = new Set(scope);
  return clientIds.filter((id) => allowed.has(id));
}
