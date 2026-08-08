import { NextRequest, NextResponse } from "next/server";
import { getPortalWriteSession } from "@/lib/portal/session";
import { confirmTotpEnrollment } from "@/lib/portal/identity/mfa-store";
import { assertPortalMutatingOrigin } from "@/lib/portal/identity/origin";
import {
  assertPortalRateLimit,
  clientIpFromRequest,
} from "@/lib/portal/identity/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const originCheck = assertPortalMutatingOrigin(req);
  if (!originCheck.ok) {
    return NextResponse.json({ ok: false, message: originCheck.message }, { status: 403 });
  }
  const rate = assertPortalRateLimit({
    bucket: "portal-totp",
    identity: clientIpFromRequest(req),
  });
  if (!rate.ok) {
    return NextResponse.json({ ok: false, message: "Too many attempts." }, { status: 429 });
  }

  const session = await getPortalWriteSession();
  if (!session) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }

  const body = (await req.json()) as { token?: string };
  const result = await confirmTotpEnrollment({
    portalUserId: session.portalUserId,
    token: body.token ?? "",
  });
  if (!result.ok) {
    return NextResponse.json({ ok: false, message: result.error }, { status: 400 });
  }
  return NextResponse.json({
    ok: true,
    recoveryCodes: result.recoveryCodes,
  });
}
