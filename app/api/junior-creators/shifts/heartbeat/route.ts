/**
 * POST /api/junior-creators/shifts/heartbeat
 * Records KXD OS activity using the server clock. No client timestamps accepted.
 */
import { NextResponse } from "next/server";
import { getJuniorCreatorSession } from "@/lib/junior-creators/session";
import { heartbeatShift } from "@/lib/junior-creators/shifts";
import { JUNIOR_TIMER_SAFETY } from "@/lib/junior-creators/timer-safety";

export const dynamic = "force-dynamic";

export async function POST() {
  const session = await getJuniorCreatorSession();
  if (!session) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }

  try {
    const result = await heartbeatShift(session.juniorCreatorUserId);
    return NextResponse.json({
      ok: true,
      ...result,
      thresholds: {
        inactivityWarningMs: JUNIOR_TIMER_SAFETY.inactivityWarningMs,
        inactivityGraceMs: JUNIOR_TIMER_SAFETY.inactivityGraceMs,
        maxShiftMs: JUNIOR_TIMER_SAFETY.maxShiftMs,
      },
    });
  } catch (err) {
    console.error("[KXD Junior Creators] Heartbeat failed:", err);
    return NextResponse.json({ ok: false, message: "Failed to record activity." }, { status: 500 });
  }
}
