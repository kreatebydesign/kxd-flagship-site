import { NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import { revokePortalInvitation } from "@/lib/portal/identity/invitations";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_req: Request, context: RouteContext) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  const { id: rawId } = await context.params;
  const invitationId = Number.parseInt(rawId, 10);
  if (!Number.isFinite(invitationId)) {
    return NextResponse.json({ ok: false, error: "Invalid invitation." }, { status: 400 });
  }

  try {
    const invitation = await revokePortalInvitation({
      invitationId,
      operatorUserId: Number(auth.id) || null,
    });
    return NextResponse.json({ ok: true, invitation });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not revoke invitation.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
