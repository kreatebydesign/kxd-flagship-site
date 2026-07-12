import { NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import {
  getGoogleCalendarConnectionStatus,
  isGoogleCalendarError,
} from "@/lib/google/calendar";

export const dynamic = "force-dynamic";

/** GET /api/admin/calendar/status — connection / config status (no secrets). */
export async function GET() {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  try {
    const status = getGoogleCalendarConnectionStatus();
    return NextResponse.json({
      ok: true,
      status: {
        ...status,
        writeEnabled: false,
        phase: "25C",
      },
    });
  } catch (err) {
    if (isGoogleCalendarError(err)) {
      return NextResponse.json(
        { ok: false, error: err.message, code: err.code },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { ok: false, error: "Could not read calendar status." },
      { status: 500 },
    );
  }
}
