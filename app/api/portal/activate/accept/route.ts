import { NextRequest, NextResponse } from "next/server";
import {
  acceptPortalInvitation,
  findInvitationByRawToken,
  INVITATION_PUBLIC_ERROR,
} from "@/lib/portal/identity/invitations";
import {
  assertPortalRateLimit,
  clientIpFromRequest,
} from "@/lib/portal/identity/rate-limit";
import { assertPortalMutatingOrigin } from "@/lib/portal/identity/origin";
import { createPortalSession } from "@/lib/portal/session";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const originCheck = assertPortalMutatingOrigin(req);
  if (!originCheck.ok) {
    return NextResponse.json(
      { ok: false, message: originCheck.message },
      { status: originCheck.status },
    );
  }

  const rate = assertPortalRateLimit({
    bucket: "portal-activate",
    identity: clientIpFromRequest(req),
  });
  if (!rate.ok) {
    return NextResponse.json(
      { ok: false, message: INVITATION_PUBLIC_ERROR },
      { status: 429 },
    );
  }

  const body = (await req.json()) as {
    token?: string;
    password?: string;
    displayName?: string;
    termsAccepted?: boolean;
  };

  // Ensure token still resolves before accept (enumeration-safe failures).
  if (!(await findInvitationByRawToken(body.token?.trim() ?? ""))) {
    return NextResponse.json({ ok: false, message: INVITATION_PUBLIC_ERROR }, { status: 400 });
  }

  const result = await acceptPortalInvitation({
    rawToken: body.token?.trim() ?? "",
    password: body.password ?? "",
    displayName: body.displayName,
    termsAccepted: body.termsAccepted === true,
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, message: result.publicMessage }, { status: 400 });
  }

  await createPortalSession(result.portalUserId);

  return NextResponse.json({
    ok: true,
    requiresSecurityEnrollment: result.requiresSecurityEnrollment,
    redirectTo: result.requiresSecurityEnrollment
      ? "/portal/security/enroll"
      : "/portal",
  });
}
