import { NextRequest, NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import {
  assertPortalRateLimit,
  clientIpFromRequest,
} from "@/lib/portal/identity/rate-limit";
import { resendPartnerInvitation } from "@/lib/portal/partner/invitations";
import { resolvePartnerInvitationOrigin } from "@/lib/portal/partner/email-invitation";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requirePayloadAdminApi(req);
  if (auth instanceof NextResponse) return auth;

  const { id: rawId } = await context.params;
  const invitationId = Number.parseInt(rawId, 10);
  if (!Number.isFinite(invitationId)) {
    return NextResponse.json({ ok: false, error: "Invalid invitation." }, { status: 400 });
  }

  const rate = assertPortalRateLimit({
    bucket: "admin-partner-invite",
    identity: `op:${String(auth.id)}:${clientIpFromRequest(req)}`,
  });
  if (!rate.ok) {
    return NextResponse.json(
      { ok: false, error: "Too many invitation attempts. Try again shortly." },
      { status: 429 },
    );
  }

  try {
    const result = await resendPartnerInvitation({
      invitationId,
      operatorUserId: Number(auth.id),
      origin: resolvePartnerInvitationOrigin(req.nextUrl.origin),
    });
    return NextResponse.json({
      ok: true,
      invitation: result.invitation,
      emailSent: result.emailSent,
      oneTimeActivateUrl: result.oneTimeActivateUrl ?? null,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not resend invitation.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
