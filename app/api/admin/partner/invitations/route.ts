import { NextRequest, NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import {
  assertPortalRateLimit,
  clientIpFromRequest,
} from "@/lib/portal/identity/rate-limit";
import { createPartnerInvitation } from "@/lib/portal/partner/invitations";
import { resolvePartnerInvitationOrigin } from "@/lib/portal/partner/email-invitation";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const auth = await requirePayloadAdminApi(req);
  if (auth instanceof NextResponse) return auth;

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

  const body = (await req.json()) as {
    displayName?: string;
    email?: string;
    personalNote?: string;
  };

  try {
    const result = await createPartnerInvitation({
      displayName: String(body.displayName ?? ""),
      email: String(body.email ?? ""),
      personalNote: body.personalNote,
      invitedByUserId: Number(auth.id),
      origin: resolvePartnerInvitationOrigin(req.nextUrl.origin),
    });

    return NextResponse.json({
      ok: true,
      invitation: result.invitation,
      emailSent: result.emailSent,
      // Returned once when email delivery is unavailable. Never stored for later retrieval.
      oneTimeActivateUrl: result.oneTimeActivateUrl ?? null,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not create invitation.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
