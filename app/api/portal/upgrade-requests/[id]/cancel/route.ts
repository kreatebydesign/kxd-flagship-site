/**
 * POST /api/portal/upgrade-requests/[id]/cancel
 */
import { NextRequest, NextResponse } from "next/server";
import { getPortalSession } from "@/lib/portal/session";
import {
  cancelClientUpgradeRequest,
  UpgradeRequestError,
} from "@/lib/client-upgrade-requests";

export const dynamic = "force-dynamic";

function parseId(raw: string): number | null {
  if (!/^\d+$/.test(raw)) return null;
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function POST(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getPortalSession();
  if (!session) {
    return NextResponse.json(
      { ok: false, message: "Unauthorized." },
      { status: 401 },
    );
  }

  const { id: raw } = await context.params;
  const requestId = parseId(raw);
  if (requestId == null) {
    return NextResponse.json(
      { ok: false, message: "Invalid request." },
      { status: 400 },
    );
  }

  try {
    const request = await cancelClientUpgradeRequest(
      requestId,
      session.clientId,
    );
    return NextResponse.json({ ok: true, request });
  } catch (err) {
    if (err instanceof UpgradeRequestError) {
      return NextResponse.json(
        { ok: false, message: err.message, code: err.code },
        { status: err.status },
      );
    }
    console.error("[KXD Upgrade Requests] Portal cancel failed:", err);
    return NextResponse.json(
      { ok: false, message: "Unable to cancel request." },
      { status: 500 },
    );
  }
}
