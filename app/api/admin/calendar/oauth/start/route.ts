import { NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import {
  buildGoogleCalendarAuthorizationUrl,
  isGoogleCalendarError,
} from "@/lib/google/calendar";
import { actorHasCapability } from "@/lib/scheduling/permissions";
import { schedulingActorFromUser } from "@/lib/scheduling/actor";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/calendar/oauth/start
 * Returns the Google OAuth authorization URL (read-only scope).
 * Query redirect=1 to HTTP-redirect instead of JSON.
 */
export async function GET(req: Request) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  const actor = schedulingActorFromUser(auth);
  if (!actorHasCapability(actor, "scheduling.manage-connection")) {
    return NextResponse.json(
      { ok: false, error: "Missing scheduling.manage-connection capability." },
      { status: 403 },
    );
  }

  try {
    const url = new URL(req.url);
    const authorizationUrl = buildGoogleCalendarAuthorizationUrl({
      state: `kxd-cal-${Date.now()}`,
      prompt: "consent",
    });

    if (url.searchParams.get("redirect") === "1") {
      return NextResponse.redirect(authorizationUrl);
    }

    return NextResponse.json({
      ok: true,
      authorizationUrl,
      scope: "https://www.googleapis.com/auth/calendar.readonly",
      note: "Complete consent, then set GOOGLE_CALENDAR_REFRESH_TOKEN from the callback response.",
    });
  } catch (err) {
    if (isGoogleCalendarError(err)) {
      return NextResponse.json(
        { ok: false, error: err.message, code: err.code },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { ok: false, error: "Could not start OAuth." },
      { status: 500 },
    );
  }
}
