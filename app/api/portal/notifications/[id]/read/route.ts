/**
 * POST /api/portal/notifications/[id]/read
 */
import { NextResponse } from "next/server";
import { markClientNotificationRead } from "@/lib/ces/modules/notifications";
import { getPortalSession } from "@/lib/portal/session";

export const dynamic = "force-dynamic";

export async function POST(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getPortalSession();
  if (!session) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }

  const { id } = await context.params;
  const activityId = decodeURIComponent(id);

  try {
    const result = await markClientNotificationRead({
      activityId,
      clientId: session.clientId,
      portalUserId: session.portalUserId,
    });

    if (!result.success) {
      return NextResponse.json(
        { ok: false, message: "Notification not found." },
        { status: 404 },
      );
    }

    return NextResponse.json({ ok: true, already: result.already ?? false });
  } catch (err) {
    console.error("[KXD Portal] Mark notification read failed:", err);
    return NextResponse.json(
      { ok: false, message: "Unable to update notification." },
      { status: 500 },
    );
  }
}
