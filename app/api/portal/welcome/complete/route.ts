/**
 * POST /api/portal/welcome/complete
 * Marks the first-login welcome experience as complete for this portal user.
 */
import { NextResponse } from "next/server";
import { completePortalWelcome } from "@/lib/portal/welcome";
import { getPortalSession } from "@/lib/portal/session";

export const dynamic = "force-dynamic";

export async function POST() {
  const session = await getPortalSession();
  if (!session) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }

  if (session.welcomeCompletedAt) {
    return NextResponse.json({
      ok: true,
      welcomeCompletedAt: session.welcomeCompletedAt,
    });
  }

  try {
    const welcomeCompletedAt = await completePortalWelcome(session.portalUserId);
    return NextResponse.json({ ok: true, welcomeCompletedAt });
  } catch (err) {
    console.error("[KXD Portal] Welcome complete failed:", err);
    return NextResponse.json(
      { ok: false, message: "We couldn't save your progress just now. Please try again." },
      { status: 500 },
    );
  }
}
