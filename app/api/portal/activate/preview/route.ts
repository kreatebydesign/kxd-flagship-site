import { NextRequest, NextResponse } from "next/server";
import {
  findInvitationByRawToken,
  INVITATION_PUBLIC_ERROR,
  markInvitationOpened,
} from "@/lib/portal/identity/invitations";
import {
  assertPortalRateLimit,
  clientIpFromRequest,
} from "@/lib/portal/identity/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
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

  const body = (await req.json()) as { token?: string };
  const token = body.token?.trim() ?? "";
  const found = await findInvitationByRawToken(token);
  if (!found) {
    return NextResponse.json({ ok: false, message: INVITATION_PUBLIC_ERROR }, { status: 400 });
  }

  await markInvitationOpened(Number(found.invitation.id));

  return NextResponse.json({
    ok: true,
    emailMasked: maskEmail(String(found.invitation.email ?? "")),
    displayName: found.invitation.displayName
      ? String(found.invitation.displayName)
      : null,
    companyNames: found.membershipDetails.map((m) => m.clientName),
    clientRoles: found.membershipDetails.map((m) => ({
      clientId: m.clientId,
      clientName: m.clientName,
      role: m.role,
    })),
  });
}

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return "invitee";
  const head = local.slice(0, 1);
  return `${head}•••@${domain}`;
}
