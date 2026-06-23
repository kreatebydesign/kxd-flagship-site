/**
 * POST /api/junior-creators/shifts/start
 */
import { NextResponse } from "next/server";
import { getJuniorCreatorSession } from "@/lib/junior-creators/session";
import { startShift } from "@/lib/junior-creators/shifts";

export const dynamic = "force-dynamic";

export async function POST() {
  const session = await getJuniorCreatorSession();
  if (!session) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }

  try {
    const shift = await startShift(session.juniorCreatorUserId, session.hourlyRateCents);
    return NextResponse.json({ ok: true, shift });
  } catch (err) {
    if (err instanceof Error && err.message === "ACTIVE_SHIFT_EXISTS") {
      return NextResponse.json(
        { ok: false, message: "You already have an active shift. End it before starting a new one." },
        { status: 409 },
      );
    }
    console.error("[KXD Junior Creators] Start shift failed:", err);
    return NextResponse.json({ ok: false, message: "Failed to start shift." }, { status: 500 });
  }
}
