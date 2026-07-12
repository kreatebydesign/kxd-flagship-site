import { NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import { validateProposedSlotAvailability } from "@/lib/scheduling/availability/service";
import { isGoogleCalendarError } from "@/lib/google/calendar";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/calendar/availability/validate
 * Validate a proposed slot against free/busy + working hours (read-only).
 */
export async function POST(req: Request) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  const body = (await req.json().catch(() => ({}))) as {
    proposedStart?: string;
    proposedEnd?: string;
    calendarId?: string;
    buffers?: {
      preEventMinutes?: number;
      postEventMinutes?: number;
      minimumTransitionMinutes?: number;
      focusProtectionMinutes?: number;
    };
  };

  if (!body.proposedStart || !body.proposedEnd) {
    return NextResponse.json(
      { ok: false, error: "proposedStart and proposedEnd are required." },
      { status: 400 },
    );
  }

  try {
    const result = await validateProposedSlotAvailability({
      proposedStart: body.proposedStart,
      proposedEnd: body.proposedEnd,
      calendarId: body.calendarId,
      buffers: body.buffers,
    });

    return NextResponse.json({
      ok: true,
      available: result.available,
      calendarAvailabilityAssessed: result.calendarAvailabilityAssessed,
      reasonCodes: result.reasonCodes,
      explanations: result.explanations,
      timeZone: result.timeZone,
      overlappingBusyCount: result.overlappingBusy.length,
      writeEnabled: false,
      phase: "25D",
    });
  } catch (err) {
    if (isGoogleCalendarError(err)) {
      return NextResponse.json(
        { ok: false, error: err.message, code: err.code },
        { status: 400 },
      );
    }
    const message =
      err instanceof Error ? err.message : "Validation failed.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
