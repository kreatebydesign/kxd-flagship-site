/**
 * GET/PATCH /api/admin/clients/[clientId]/plan
 * Client plan assignment — session auth only; clientId from route only.
 * Body clientId/client fields are rejected when they conflict with the route.
 */
import { NextRequest, NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import {
  getClientPlanDefinition,
  listClientPlans,
  resolveClientEntitlements,
  updateClientPlanAssignment,
  ENTITLEMENT_MODULE_REGISTRY,
  isClientPlanKey,
  type UpdateClientPlanInput,
} from "@/lib/client-plans";
import {
  isClientPlanStatus,
  parseRouteClientId,
  planUpdateErrorMessage,
  rejectBodyClientIdMismatch,
} from "@/lib/client-plans/validate";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ clientId: string }> },
) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  const { clientId: raw } = await context.params;
  const clientId = parseRouteClientId(raw);
  if (clientId == null) {
    return NextResponse.json({ ok: false, message: "Invalid client." }, { status: 400 });
  }

  try {
    const entitlements = await resolveClientEntitlements(clientId);
    const plan = getClientPlanDefinition(entitlements.planKey);
    return NextResponse.json({
      ok: true,
      entitlements,
      plan,
      catalog: {
        plans: listClientPlans(),
        modules: ENTITLEMENT_MODULE_REGISTRY.filter((m) => !m.internalOnly),
      },
    });
  } catch (err) {
    console.error("[KXD Client Plans] Load failed:", err);
    return NextResponse.json(
      { ok: false, message: "Unable to load client plan." },
      { status: 500 },
    );
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ clientId: string }> },
) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  const { clientId: raw } = await context.params;
  const clientId = parseRouteClientId(raw);
  if (clientId == null) {
    return NextResponse.json({ ok: false, message: "Invalid client." }, { status: 400 });
  }

  try {
    const body = (await req.json()) as Partial<UpdateClientPlanInput> & {
      planKey?: string | null;
      clientId?: unknown;
      client?: unknown;
    };

    const identityError = rejectBodyClientIdMismatch(clientId, body);
    if (identityError) {
      return NextResponse.json({ ok: false, message: identityError }, { status: 400 });
    }

    const planKey =
      body.planKey === null
        ? null
        : typeof body.planKey === "string" && body.planKey.length === 0
          ? null
          : typeof body.planKey === "string" && isClientPlanKey(body.planKey)
            ? body.planKey
            : undefined;

    if (planKey === undefined && body.planKey !== undefined) {
      return NextResponse.json(
        { ok: false, message: "Unknown plan key." },
        { status: 400 },
      );
    }

    if (body.planStatus !== undefined && !isClientPlanStatus(body.planStatus)) {
      return NextResponse.json(
        { ok: false, message: "Invalid plan status." },
        { status: 400 },
      );
    }

    const current = await resolveClientEntitlements(clientId);
    const input: UpdateClientPlanInput = {
      planKey: planKey === undefined ? current.planKey : planKey,
      planStatus: body.planStatus ?? current.planStatus,
      planEffectiveAt: body.planEffectiveAt ?? current.planEffectiveAt,
      planNote:
        body.planNote === undefined ? current.planNote : body.planNote,
      addOnModules: body.addOnModules ?? current.addOnModules,
      removedModules: body.removedModules ?? current.removedModules,
    };

    const actor =
      typeof auth === "object" && auth && "email" in auth && typeof auth.email === "string"
        ? auth.email
        : "KXD Operator";

    const entitlements = await updateClientPlanAssignment(clientId, input, {
      actor,
    });

    return NextResponse.json({
      ok: true,
      entitlements,
      plan: getClientPlanDefinition(entitlements.planKey),
    });
  } catch (err) {
    console.error("[KXD Client Plans] Update failed:", err);
    return NextResponse.json(
      {
        ok: false,
        message: planUpdateErrorMessage(err),
      },
      { status: 400 },
    );
  }
}
