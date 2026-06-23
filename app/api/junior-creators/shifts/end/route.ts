/**
 * POST /api/junior-creators/shifts/end
 */
import { NextResponse } from "next/server";
import { getJuniorCreatorSession } from "@/lib/junior-creators/session";
import { endShift } from "@/lib/junior-creators/shifts";

export const dynamic = "force-dynamic";

export async function POST() {
  const session = await getJuniorCreatorSession();
  if (!session) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }

  try {
    const result = await endShift(session.juniorCreatorUserId);
    return NextResponse.json({ ok: true, shift: result });
  } catch (err) {
    if (err instanceof Error && err.message === "NO_ACTIVE_SHIFT") {
      return NextResponse.json(
        { ok: false, message: "No active shift to end." },
        { status: 404 },
      );
    }
    console.error("[KXD Junior Creators] End shift failed:", err);
    return NextResponse.json({ ok: false, message: "Failed to end shift." }, { status: 500 });
  }
}
