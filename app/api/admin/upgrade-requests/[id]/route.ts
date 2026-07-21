/**
 * GET/PATCH /api/admin/upgrade-requests/[id]
 */
import { NextRequest, NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import {
  getClientUpgradeRequest,
  isUpgradeRequestStatus,
  updateClientUpgradeRequestStatus,
  UpgradeRequestError,
} from "@/lib/client-upgrade-requests";
import { resolveClientEntitlements } from "@/lib/client-plans";

export const dynamic = "force-dynamic";

function parseId(raw: string): number | null {
  if (!/^\d+$/.test(raw)) return null;
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  const { id: raw } = await context.params;
  const requestId = parseId(raw);
  if (requestId == null) {
    return NextResponse.json(
      { ok: false, message: "Invalid request." },
      { status: 400 },
    );
  }

  try {
    const request = await getClientUpgradeRequest(requestId);
    const entitlements = await resolveClientEntitlements(request.clientId);
    return NextResponse.json({
      ok: true,
      request,
      entitlements: {
        planKey: entitlements.planKey,
        planStatus: entitlements.planStatus,
        isLegacy: entitlements.isLegacy,
        isPaused: entitlements.isPaused,
        effectiveModules: entitlements.effectiveModules,
      },
      accessGranted: entitlements.effectiveModules.includes(request.moduleKey),
      plansAccessUrl: `/admin/operations/client-command/${request.clientId}`,
    });
  } catch (err) {
    if (err instanceof UpgradeRequestError) {
      return NextResponse.json(
        { ok: false, message: err.message },
        { status: err.status },
      );
    }
    console.error("[KXD Upgrade Requests] Admin get failed:", err);
    return NextResponse.json(
      { ok: false, message: "Unable to load request." },
      { status: 500 },
    );
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  const { id: raw } = await context.params;
  const requestId = parseId(raw);
  if (requestId == null) {
    return NextResponse.json(
      { ok: false, message: "Invalid request." },
      { status: 400 },
    );
  }

  try {
    const body = (await req.json()) as {
      status?: string;
      operatorNote?: string | null;
      id?: unknown;
      clientId?: unknown;
    };

    if (body.id != null && Number(body.id) !== requestId) {
      return NextResponse.json(
        { ok: false, message: "Request identity mismatch." },
        { status: 400 },
      );
    }

    if (body.status != null && !isUpgradeRequestStatus(body.status)) {
      return NextResponse.json(
        { ok: false, message: "Invalid status." },
        { status: 400 },
      );
    }

    const existing = await getClientUpgradeRequest(requestId);
    if (body.clientId != null && Number(body.clientId) !== existing.clientId) {
      return NextResponse.json(
        { ok: false, message: "Client identity mismatch." },
        { status: 400 },
      );
    }

    const actor =
      typeof auth === "object" && auth && "email" in auth
        ? String((auth as { email?: string }).email ?? "KXD Operator")
        : "KXD Operator";

    const request = await updateClientUpgradeRequestStatus(requestId, {
      status: body.status ?? existing.status,
      operatorNote:
        body.operatorNote === undefined
          ? undefined
          : body.operatorNote,
      actor,
    });

    const entitlements = await resolveClientEntitlements(request.clientId);

    return NextResponse.json({
      ok: true,
      request,
      accessGranted: entitlements.effectiveModules.includes(request.moduleKey),
      message:
        request.status === "approved" &&
        !entitlements.effectiveModules.includes(request.moduleKey)
          ? "Request approved. Grant access intentionally in Plans & Access — approval does not enable the module."
          : undefined,
    });
  } catch (err) {
    if (err instanceof UpgradeRequestError) {
      return NextResponse.json(
        { ok: false, message: err.message, code: err.code },
        { status: err.status },
      );
    }
    console.error("[KXD Upgrade Requests] Admin update failed:", err);
    return NextResponse.json(
      { ok: false, message: "Unable to update request." },
      { status: 500 },
    );
  }
}
