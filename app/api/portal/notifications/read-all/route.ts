/**
 * POST /api/portal/notifications/read-all
 */
import { NextResponse } from "next/server";
import { markAllClientNotificationsRead } from "@/lib/ces/modules/notifications";
import { getPortalSession } from "@/lib/portal/session";

export const dynamic = "force-dynamic";

export async function POST() {
  const session = await getPortalSession();
  if (!session) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }

  try {
    const result = await markAllClientNotificationsRead({
      clientId: session.clientId,
      portalUserId: session.portalUserId,
    });

    return NextResponse.json({ ok: true, count: result.count });
  } catch (err) {
    console.error("[KXD Portal] Mark all notifications read failed:", err);
    return NextResponse.json(
      { ok: false, message: "Unable to update notifications." },
      { status: 500 },
    );
  }
}
