import { NextResponse } from "next/server";
import { getPayload } from "payload";
import config from "@payload-config";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import {
  listPortalMembershipsForUser,
  syncPortalUserLegacyClientAndPreference,
} from "@/lib/portal/memberships";

export const dynamic = "force-dynamic";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

type RouteContext = {
  params: Promise<{ id: string; membershipId: string }>;
};

export async function POST(_req: Request, context: RouteContext) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  const { id: rawUserId, membershipId: rawMembershipId } = await context.params;
  const portalUserId = Number.parseInt(rawUserId, 10);
  const membershipId = Number.parseInt(rawMembershipId, 10);
  if (!Number.isFinite(portalUserId) || !Number.isFinite(membershipId)) {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  const payload = await getPayload({ config });

  let membershipDoc: AnyDoc;
  try {
    membershipDoc = (await payload.findByID({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "portal-client-memberships" as any,
      id: membershipId,
      depth: 0,
      overrideAccess: true,
    })) as AnyDoc;
  } catch {
    return NextResponse.json({ ok: false, error: "Membership not found." }, { status: 404 });
  }

  const ownerId =
    typeof membershipDoc.portalUser === "number"
      ? membershipDoc.portalUser
      : Number(membershipDoc.portalUser);
  if (ownerId !== portalUserId) {
    return NextResponse.json({ ok: false, error: "Membership not found." }, { status: 404 });
  }

  if (membershipDoc.status === "disabled") {
    return NextResponse.json(
      { ok: false, error: "Reactivate the membership before setting it as default." },
      { status: 400 },
    );
  }

  const clientId =
    typeof membershipDoc.client === "number"
      ? membershipDoc.client
      : Number(membershipDoc.client);
  if (!Number.isFinite(clientId)) {
    return NextResponse.json({ ok: false, error: "Membership client is invalid." }, { status: 400 });
  }

  try {
    await payload.update({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "portal-client-memberships" as any,
      id: membershipId,
      data: { isDefault: true, status: "active" },
      overrideAccess: true,
    });

    await syncPortalUserLegacyClientAndPreference({
      portalUserId,
      clientId,
      payload,
    });

    const memberships = await listPortalMembershipsForUser(portalUserId, { payload });
    return NextResponse.json({ ok: true, memberships });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not set default membership.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
