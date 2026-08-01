import { NextResponse } from "next/server";
import { getPayload } from "payload";
import config from "@payload-config";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import { listPortalMembershipsForUser } from "@/lib/portal/memberships";
import { membershipUnavailableResponseBody } from "@/lib/portal/membership-schema";
import { isMembershipSchemaUnavailableError } from "@/lib/portal/memberships";
import { isPortalMembershipRole } from "@/lib/portal/identity/roles";
import { appendPortalSecurityEvent } from "@/lib/portal/identity/security-events";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string; membershipId: string }>;
};

export async function POST(req: Request, context: RouteContext) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  const { id: rawUserId, membershipId: rawMembershipId } = await context.params;
  const portalUserId = Number.parseInt(rawUserId, 10);
  const membershipId = Number.parseInt(rawMembershipId, 10);
  if (!Number.isFinite(portalUserId) || !Number.isFinite(membershipId)) {
    return NextResponse.json({ ok: false, error: "Invalid membership." }, { status: 400 });
  }

  const body = (await req.json()) as { role?: string; confirm?: boolean };
  if (body.confirm !== true) {
    return NextResponse.json(
      { ok: false, error: "Role changes require explicit confirmation." },
      { status: 400 },
    );
  }
  if (!isPortalMembershipRole(body.role)) {
    return NextResponse.json({ ok: false, error: "Invalid role." }, { status: 400 });
  }

  const payload = await getPayload({ config });

  try {
    const memberships = await listPortalMembershipsForUser(portalUserId, { payload });
    const target = memberships.find((m) => m.id === membershipId);
    if (!target) {
      return NextResponse.json({ ok: false, error: "Membership not found." }, { status: 404 });
    }

    await payload.update({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "portal-client-memberships" as any,
      id: membershipId,
      data: {
        role: body.role,
        canManageMembers: false,
      },
      overrideAccess: true,
    });

    await appendPortalSecurityEvent({
      type: "membership.role_changed",
      actorKind: "operator",
      actorOperatorUserId: Number(auth.id) || null,
      summary: `Membership #${membershipId} role set to ${body.role}`,
      metadata: {
        portalUserId,
        membershipId,
        clientId: target.clientId,
        fromRole: target.role,
        toRole: body.role,
      },
    });

    const next = await listPortalMembershipsForUser(portalUserId, { payload });
    return NextResponse.json({ ok: true, memberships: next });
  } catch (err) {
    if (isMembershipSchemaUnavailableError(err)) {
      return NextResponse.json(membershipUnavailableResponseBody(), { status: 503 });
    }
    const message = err instanceof Error ? err.message : "Could not update role.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
