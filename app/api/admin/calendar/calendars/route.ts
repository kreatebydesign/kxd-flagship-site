import { NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import {
  getPrimaryGoogleCalendar,
  isGoogleCalendarError,
  listGoogleCalendars,
  validateCalendarOwnership,
} from "@/lib/google/calendar";

export const dynamic = "force-dynamic";

/** GET /api/admin/calendar/calendars — list calendars for connected account. */
export async function GET(req: Request) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  const url = new URL(req.url);
  const validate = url.searchParams.get("validate") === "1";

  try {
    const calendars = await listGoogleCalendars();
    const primary = calendars.find((c) => c.primary) ?? (await getPrimaryGoogleCalendar());
    const ownership = validate
      ? await validateCalendarOwnership(primary.id)
      : null;

    return NextResponse.json({
      ok: true,
      calendars,
      primary,
      ownership,
    });
  } catch (err) {
    if (isGoogleCalendarError(err)) {
      const status =
        err.code === "not_configured" || err.code === "invalid_config"
          ? 400
          : err.code === "authentication_failure" ||
              err.code === "authorization_failure"
            ? 401
            : 400;
      return NextResponse.json(
        { ok: false, error: err.message, code: err.code },
        { status },
      );
    }
    return NextResponse.json(
      { ok: false, error: "Could not list calendars." },
      { status: 500 },
    );
  }
}
