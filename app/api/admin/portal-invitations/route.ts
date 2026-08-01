import { NextRequest, NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import {
  createPortalInvitationDraft,
  listPortalInvitations,
  sendPortalInvitation,
} from "@/lib/portal/identity/invitations";
import { isPortalMembershipRole } from "@/lib/portal/identity/roles";
import {
  assertPortalRateLimit,
  clientIpFromRequest,
} from "@/lib/portal/identity/rate-limit";
import { resolvePortalResetOrigin } from "@/lib/portal/email";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  try {
    const invitations = await listPortalInvitations();
    return NextResponse.json({ ok: true, invitations });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not list invitations.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  const body = (await req.json()) as {
    email?: string;
    displayName?: string;
    welcomeNote?: string;
    allowExistingUserExpansion?: boolean;
    sendNow?: boolean;
    memberships?: Array<{ clientId?: number; role?: string }>;
  };

  const memberships = (body.memberships ?? [])
    .map((row) => ({
      clientId: Number(row.clientId),
      role: row.role,
    }))
    .filter(
      (row) =>
        Number.isFinite(row.clientId) &&
        row.clientId > 0 &&
        isPortalMembershipRole(row.role),
    )
    .map((row) => ({
      clientId: row.clientId,
      role: row.role as "client-owner" | "client-admin" | "client-member",
    }));

  try {
    const invitation = await createPortalInvitationDraft({
      email: body.email ?? "",
      displayName: body.displayName ?? "",
      welcomeNote: body.welcomeNote,
      allowExistingUserExpansion: body.allowExistingUserExpansion === true,
      memberships,
      invitedByUserId: Number(auth.id) || null,
    });

    if (body.sendNow) {
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
      const origin = resolvePortalResetOrigin(req);
      const sent = await sendPortalInvitation({
        invitationId: invitation.id,
        origin,
        operatorUserId: Number(auth.id) || null,
      });
      return NextResponse.json({
        ok: true,
        invitation: sent.invitation,
        emailSent: sent.emailSent,
        activateUrlForDev: sent.activateUrlForDev,
      });
    }

    return NextResponse.json({ ok: true, invitation });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not create invitation.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
