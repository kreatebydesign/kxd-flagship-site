import { NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import {
  exchangeGoogleCalendarAuthorizationCode,
  isGoogleCalendarError,
} from "@/lib/google/calendar";
import { actorHasCapability } from "@/lib/scheduling/permissions";
import { schedulingActorFromUser } from "@/lib/scheduling/actor";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/calendar/oauth/callback
 * Exchanges ?code= for tokens. Returns refresh token once for env configuration.
 * Does not persist secrets. Does not expose tokens to non-admin sessions.
 */
export async function GET(req: Request) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  const actor = schedulingActorFromUser(auth);
  if (!actorHasCapability(actor, "scheduling.manage-connection")) {
    return NextResponse.json(
      { ok: false, error: "Missing scheduling.manage-connection capability." },
      { status: 403 },
    );
  }

  const url = new URL(req.url);
  const error = url.searchParams.get("error");
  if (error) {
    return NextResponse.json(
      {
        ok: false,
        error: `Google OAuth denied: ${error}`,
        code: "authorization_failure",
      },
      { status: 400 },
    );
  }

  const code = url.searchParams.get("code");
  if (!code) {
    return NextResponse.json(
      { ok: false, error: "Missing OAuth code.", code: "invalid_request" },
      { status: 400 },
    );
  }

  try {
    const tokens = await exchangeGoogleCalendarAuthorizationCode(code);

    return NextResponse.json({
      ok: true,
      connected: true,
      scope: tokens.scope,
      hasRefreshToken: Boolean(tokens.refreshToken),
      /**
       * One-time setup payload for founder / Vercel secret configuration.
       * Store as GOOGLE_CALENDAR_REFRESH_TOKEN — never commit to git.
       */
      setup: {
        envVar: "GOOGLE_CALENDAR_REFRESH_TOKEN",
        refreshToken: tokens.refreshToken,
        note: tokens.refreshToken
          ? "Copy refreshToken into GOOGLE_CALENDAR_REFRESH_TOKEN (Vercel / .env.local). Re-consent if upgrading from readonly-only."
          : "No refresh_token returned — revoke prior Google grant and retry with prompt=consent.",
      },
      writeEnabled: true,
      phase: "26C",
    });
  } catch (err) {
    if (isGoogleCalendarError(err)) {
      return NextResponse.json(
        { ok: false, error: err.message, code: err.code },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { ok: false, error: "OAuth token exchange failed." },
      { status: 500 },
    );
  }
}
