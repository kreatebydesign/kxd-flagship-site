/**
 * GET/POST commercial service assignments for Client Experience composition.
 * Does not activate CES. Does not invite.
 */
import { NextRequest, NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import { isStudioPayloadOperator } from "../../../../../../../payload/access/index";
import { parseRouteClientId, rejectBodyClientIdMismatch } from "@/lib/client-plans/validate";
import { SERVICE_CAPABILITY_CATALOG } from "@/lib/service-capabilities/catalog";
import {
  activateClientService,
  endClientService,
  loadResolvedServiceScope,
} from "@/lib/service-capabilities/assignments";
import { isServiceCapabilityId } from "@/lib/service-capabilities/catalog";
import { parseAssignmentSource } from "@/lib/service-capabilities/resolve";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ clientId: string }> },
) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;
  if (!isStudioPayloadOperator(auth)) {
    return NextResponse.json(
      { ok: false, message: "Restricted staff cannot review commercial services." },
      { status: 403 },
    );
  }
  const clientId = parseRouteClientId((await context.params).clientId);
  if (clientId == null) {
    return NextResponse.json({ ok: false, message: "Invalid client." }, { status: 400 });
  }
  const scope = await loadResolvedServiceScope(clientId);
  return NextResponse.json({
    ok: true,
    catalog: SERVICE_CAPABILITY_CATALOG,
    scope,
    mutatesProfile: false,
    invites: false,
  });
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ clientId: string }> },
) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;
  if (!isStudioPayloadOperator(auth)) {
    return NextResponse.json(
      { ok: false, message: "Restricted staff cannot change commercial services." },
      { status: 403 },
    );
  }
  const clientId = parseRouteClientId((await context.params).clientId);
  if (clientId == null) {
    return NextResponse.json({ ok: false, message: "Invalid client." }, { status: 400 });
  }

  try {
    const body = (await req.json()) as {
      clientId?: unknown;
      action?: unknown;
      capabilityId?: unknown;
      assignmentId?: unknown;
      source?: unknown;
      note?: unknown;
      status?: unknown;
    };
    const identityError = rejectBodyClientIdMismatch(clientId, body);
    if (identityError) {
      return NextResponse.json({ ok: false, message: identityError }, { status: 400 });
    }

    const action = String(body.action ?? "");
    if (action === "activate") {
      if (!isServiceCapabilityId(body.capabilityId)) {
        return NextResponse.json({ ok: false, message: "Unknown service capability." }, { status: 400 });
      }
      await activateClientService({
        clientId,
        capabilityId: body.capabilityId,
        source: parseAssignmentSource(body.source) ?? undefined,
        note: typeof body.note === "string" ? body.note : null,
      });
    } else if (action === "end") {
      const assignmentId = Number(body.assignmentId);
      if (!Number.isFinite(assignmentId)) {
        return NextResponse.json({ ok: false, message: "Invalid assignment." }, { status: 400 });
      }
      await endClientService({
        clientId,
        assignmentId,
        status: body.status === "expired" ? "expired" : "ended",
      });
    } else {
      return NextResponse.json({ ok: false, message: "Unknown service action." }, { status: 400 });
    }

    const scope = await loadResolvedServiceScope(clientId);
    return NextResponse.json({
      ok: true,
      catalog: SERVICE_CAPABILITY_CATALOG,
      scope,
      mutatesProfile: false,
      invites: false,
    });
  } catch (err) {
    console.error("[KXD CES] Service assignment update failed:", err);
    return NextResponse.json(
      { ok: false, message: err instanceof Error ? err.message : "Unable to update services." },
      { status: 400 },
    );
  }
}
