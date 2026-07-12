import { NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import {
  isGoogleCalendarError,
  queryGoogleCalendarFreeBusy,
  resolveTargetCalendarId,
} from "@/lib/google/calendar";
import { getSchedulingCalendarContext } from "@/lib/scheduling/calendar-context";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/calendar/freebusy
 * Body: { timeMin, timeMax, calendarId?, includeContext? }
 */
export async function POST(req: Request) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  const body = (await req.json().catch(() => ({}))) as {
    timeMin?: string;
    timeMax?: string;
    calendarId?: string;
    includeContext?: boolean;
  };

  if (!body.timeMin || !body.timeMax) {
    return NextResponse.json(
      { ok: false, error: "timeMin and timeMax are required." },
      { status: 400 },
    );
  }

  try {
    const calendarId = await resolveTargetCalendarId(body.calendarId);
    const freeBusy = await queryGoogleCalendarFreeBusy({
      calendarIds: [calendarId],
      timeMin: body.timeMin,
      timeMax: body.timeMax,
    });

    const context = body.includeContext
      ? await getSchedulingCalendarContext({
          calendarId,
          timeMin: body.timeMin,
          timeMax: body.timeMax,
        })
      : null;

    return NextResponse.json({
      ok: true,
      freeBusy,
      context,
    });
  } catch (err) {
    if (isGoogleCalendarError(err)) {
      return NextResponse.json(
        { ok: false, error: err.message, code: err.code },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { ok: false, error: "Free/busy query failed." },
      { status: 500 },
    );
  }
}
