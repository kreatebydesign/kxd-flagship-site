/**
 * POST /api/portal/feedback
 * Founding-client early-access feedback. Client identity from portal session only.
 */
import { NextRequest, NextResponse } from "next/server";
import { getPortalSession } from "@/lib/portal/session";
import {
  isExperienceFeedbackType,
  submitExperienceFeedback,
} from "@/lib/portal/experience-feedback";

export const dynamic = "force-dynamic";

function unauthorized() {
  return NextResponse.json(
    {
      ok: false,
      code: "session_expired",
      message:
        "Your session expired. Sign in again to continue — your message is still here.",
    },
    { status: 401 },
  );
}

export async function POST(req: NextRequest) {
  const session = await getPortalSession();
  if (!session) return unauthorized();

  try {
    const body = (await req.json()) as {
      feedbackType?: unknown;
      message?: unknown;
      pagePath?: unknown;
      clientId?: unknown;
    };

    // Ignore any browser-supplied clientId — session is the only authority.
    void body.clientId;

    if (!isExperienceFeedbackType(body.feedbackType)) {
      return NextResponse.json(
        { ok: false, message: "Choose a feedback type." },
        { status: 400 },
      );
    }

    if (typeof body.message !== "string") {
      return NextResponse.json(
        { ok: false, message: "Please add a short message." },
        { status: 400 },
      );
    }

    const result = await submitExperienceFeedback({
      session,
      feedbackType: body.feedbackType,
      message: body.message,
      pagePath: typeof body.pagePath === "string" ? body.pagePath : null,
    });

    if (!result.ok) {
      return NextResponse.json(
        { ok: false, message: result.message },
        { status: 400 },
      );
    }

    return NextResponse.json({
      ok: true,
      message: "Thank you — your feedback was sent to our team.",
    });
  } catch (err) {
    console.error("[KXD Portal] Feedback route failed:", err);
    return NextResponse.json(
      {
        ok: false,
        message: "We couldn't send your feedback just now. Please try again.",
      },
      { status: 500 },
    );
  }
}
