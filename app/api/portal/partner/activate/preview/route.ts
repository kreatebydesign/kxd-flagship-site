import { NextRequest, NextResponse } from "next/server";
import {
  findPartnerInvitationByRawToken,
  markPartnerInvitationOpened,
  PARTNER_INVITATION_PUBLIC_ERROR,
  maskPartnerInviteEmail,
} from "@/lib/portal/partner/invitations";
import {
  assertPortalRateLimit,
  clientIpFromRequest,
} from "@/lib/portal/identity/rate-limit";
import { assertPartnerActivationOrigin } from "@/lib/portal/partner/activation-origin";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const originCheck = assertPartnerActivationOrigin(req);
  if (!originCheck.ok) {
    return NextResponse.json(
      { ok: false, message: originCheck.message },
      { status: originCheck.status },
    );
  }

  const rate = assertPortalRateLimit({
    bucket: "portal-partner-activate",
    identity: clientIpFromRequest(req),
  });
  if (!rate.ok) {
    return NextResponse.json(
      { ok: false, message: PARTNER_INVITATION_PUBLIC_ERROR },
      { status: 429 },
    );
  }

  const body = (await req.json()) as { token?: string };
  const found = await findPartnerInvitationByRawToken(body.token?.trim() ?? "");
  if (!found) {
    return NextResponse.json(
      { ok: false, message: PARTNER_INVITATION_PUBLIC_ERROR },
      { status: 400 },
    );
  }

  await markPartnerInvitationOpened(Number(found.invitation.id));

  return NextResponse.json({
    ok: true,
    emailMasked: maskPartnerInviteEmail(String(found.invitation.email ?? "")),
    displayName: found.row.displayName,
  });
}
