/**
 * POST /api/junior-creators/shifts/confirm-activity
 * “Yes, keep timer running” — forces a fresh server lastActivityAt.
 */
import { NextResponse } from "next/server";
import { getJuniorCreatorSession } from "@/lib/junior-creators/session";
import { confirmStillWorking } from "@/lib/junior-creators/shifts";

export const dynamic = "force-dynamic";

export async function POST() {
  const session = await getJuniorCreatorSession();
  if (!session) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }

  try {
    const result = await confirmStillWorking(session.juniorCreatorUserId);
    return NextResponse.json({ ok: true, shift: result });
  } catch (err) {
    if (err instanceof Error && err.message === "NO_ACTIVE_SHIFT") {
      return NextResponse.json(
        { ok: false, code: "NO_ACTIVE_SHIFT", message: "No active shift." },
        { status: 404 },
      );
    }
    console.error("[KXD Junior Creators] Confirm activity failed:", err);
    return NextResponse.json({ ok: false, message: "Failed to confirm activity." }, { status: 500 });
  }
}
