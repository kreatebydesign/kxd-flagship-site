import { NextRequest, NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import { sendPortalInvitation } from "@/lib/portal/identity/invitations";
import {
  assertPortalRateLimit,
  clientIpFromRequest,
} from "@/lib/portal/identity/rate-limit";
import { resolvePortalResetOrigin } from "@/lib/portal/email";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, context: RouteContext) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  const { id: rawId } = await context.params;
  const invitationId = Number.parseInt(rawId, 10);
  if (!Number.isFinite(invitationId)) {
    return NextResponse.json({ ok: false, error: "Invalid invitation." }, { status: 400 });
  }

  const rate = assertPortalRateLimit({
    bucket: "admin-invite-send",
    identity: clientIpFromRequest(req),
  });
  if (!rate.ok) {
    return NextResponse.json(
      { ok: false, error: "Too many invitation sends. Try again shortly." },
      { status: 429 },
    );
  }

  try {
    const origin = resolvePortalResetOrigin(req);
    const sent = await sendPortalInvitation({
      invitationId,
      origin,
      operatorUserId: Number(auth.id) || null,
      resend: true,
    });
    return NextResponse.json({
      ok: true,
      invitation: sent.invitation,
      emailSent: sent.emailSent,
      activateUrlForDev: sent.activateUrlForDev,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not send invitation.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
