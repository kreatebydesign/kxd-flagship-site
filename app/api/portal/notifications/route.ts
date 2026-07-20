/**
 * GET /api/portal/notifications
 * Client-visible notifications from the Activity Engine.
 *
 * Client scope always comes from the portal session — never from query params.
 * ?summary=1 — unread badge only (lightweight payload)
 */
import { NextRequest, NextResponse } from "next/server";
import {
  CLIENT_NOTIFICATION_FEED_LIMIT,
  getClientNotificationCenter,
  getClientNotificationSummary,
} from "@/lib/ces/modules/notifications";
import { getPortalSession } from "@/lib/portal/session";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getPortalSession();
  if (!session) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }

  try {
    // Ignore any clientId supplied by the browser.
    const summaryOnly =
      req.nextUrl.searchParams.get("summary") === "1" ||
      req.nextUrl.searchParams.get("summary") === "true";

    if (summaryOnly) {
      const summary = await getClientNotificationSummary({
        clientId: session.clientId,
        portalUserId: session.portalUserId,
      });
      return NextResponse.json({ ok: true, summary });
    }

    const limitRaw = req.nextUrl.searchParams.get("limit");
    const parsed = limitRaw ? Number(limitRaw) : CLIENT_NOTIFICATION_FEED_LIMIT;
    const limit = Number.isFinite(parsed)
      ? Math.min(Math.max(1, parsed), CLIENT_NOTIFICATION_FEED_LIMIT)
      : CLIENT_NOTIFICATION_FEED_LIMIT;

    const data = await getClientNotificationCenter({
      clientId: session.clientId,
      portalUserId: session.portalUserId,
      limit,
    });

    return NextResponse.json({ ok: true, data });
  } catch (err) {
    console.error("[KXD Portal] Notifications load failed:", err);
    return NextResponse.json(
      { ok: false, message: "Unable to load notifications." },
      { status: 500 },
    );
  }
}
