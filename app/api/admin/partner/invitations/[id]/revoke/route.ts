import { NextRequest, NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import { revokePartnerInvitation } from "@/lib/portal/partner/invitations";

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

  try {
    const invitation = await revokePartnerInvitation({
      invitationId,
      operatorUserId: Number(auth.id),
    });
    return NextResponse.json({ ok: true, invitation });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not revoke invitation.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
