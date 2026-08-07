/**
 * POST /api/junior-creators/shifts/safety-stop
 * Client-triggered safety stop after inactivity grace (server still validates thresholds).
 */
import { NextResponse } from "next/server";
import { getJuniorCreatorSession } from "@/lib/junior-creators/session";
import { findActiveShift } from "@/lib/junior-creators/shifts";
import { autoStopShiftIfDue } from "@/lib/junior-creators/shift-auto-stop";

export const dynamic = "force-dynamic";

export async function POST() {
  const session = await getJuniorCreatorSession();
  if (!session) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }

  try {
    const active = await findActiveShift(session.juniorCreatorUserId);
    if (!active) {
      return NextResponse.json(
        { ok: false, code: "NO_ACTIVE_SHIFT", message: "No active shift." },
        { status: 404 },
      );
    }

    const result = await autoStopShiftIfDue({
      shiftId: active.id,
      source: "client:safety-stop",
      requireJuniorId: session.juniorCreatorUserId,
    });

    return NextResponse.json({ ok: true, result });
  } catch (err) {
    console.error("[KXD Junior Creators] Safety stop failed:", err);
    return NextResponse.json({ ok: false, message: "Failed to safety-stop shift." }, { status: 500 });
  }
}
