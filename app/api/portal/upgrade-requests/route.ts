/**
 * GET/POST /api/portal/upgrade-requests
 * Client identity from portal session only.
 */
import { NextRequest, NextResponse } from "next/server";
import { getPortalSession } from "@/lib/portal/session";
import { resolveClientEntitlements } from "@/lib/client-plans";
import {
  createClientUpgradeRequest,
  listClientUpgradeRequests,
  listUpgradeCapabilityCards,
  UpgradeRequestError,
} from "@/lib/client-upgrade-requests";

export const dynamic = "force-dynamic";

function unauthorized() {
  return NextResponse.json(
    { ok: false, message: "Unauthorized." },
    { status: 401 },
  );
}

export async function GET() {
  const session = await getPortalSession();
  if (!session) return unauthorized();

  try {
    const [requests, capabilities, entitlements] = await Promise.all([
      listClientUpgradeRequests(session.clientId),
      listUpgradeCapabilityCards(session.clientId),
      resolveClientEntitlements(session.clientId),
    ]);
    return NextResponse.json({
      ok: true,
      requests,
      capabilities,
      planPaused: entitlements.isPaused,
    });
  } catch (err) {
    console.error("[KXD Upgrade Requests] Portal list failed:", err);
    return NextResponse.json(
      { ok: false, message: "Unable to load upgrade requests." },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  const session = await getPortalSession();
  if (!session) return unauthorized();

  try {
    const body = (await req.json()) as {
      moduleKey?: string;
      clientMessage?: string;
      sourceSurface?: string;
      clientId?: unknown;
    };

    if (body.clientId != null && Number(body.clientId) !== session.clientId) {
      return NextResponse.json(
        { ok: false, message: "Client identity mismatch." },
        { status: 403 },
      );
    }

    const moduleKey =
      typeof body.moduleKey === "string" ? body.moduleKey.trim() : "";
    if (!moduleKey) {
      return NextResponse.json(
        { ok: false, message: "Capability is required." },
        { status: 400 },
      );
    }

    const origin =
      req.headers.get("origin") ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.SITE_URL ||
      null;

    const request = await createClientUpgradeRequest(
      {
        clientId: session.clientId,
        portalUserId: session.portalUserId,
        requesterEmail: session.email,
        requesterName: session.displayName,
        moduleKey,
        clientMessage:
          typeof body.clientMessage === "string" ? body.clientMessage : null,
        sourceSurface:
          typeof body.sourceSurface === "string"
            ? body.sourceSurface
            : "portal-home",
      },
      { requestOrigin: origin },
    );

    return NextResponse.json({ ok: true, request });
  } catch (err) {
    if (err instanceof UpgradeRequestError) {
      return NextResponse.json(
        { ok: false, message: err.message, code: err.code },
        { status: err.status },
      );
    }
    console.error("[KXD Upgrade Requests] Portal create failed:", err);
    return NextResponse.json(
      { ok: false, message: "Unable to submit upgrade request." },
      { status: 500 },
    );
  }
}
