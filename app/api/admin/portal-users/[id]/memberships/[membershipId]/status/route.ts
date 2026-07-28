import { NextResponse } from "next/server";
import { getPayload } from "payload";
import config from "@payload-config";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import {
  listPortalMembershipsForUser,
  MembershipSchemaUnavailableError,
  isMembershipSchemaUnavailableError,
  syncPortalUserLegacyClientAndPreference,
} from "@/lib/portal/memberships";
import { membershipUnavailableResponseBody } from "@/lib/portal/membership-schema";

export const dynamic = "force-dynamic";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

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
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  const body = (await req.json()) as { status?: "active" | "disabled" };
  if (body.status !== "active" && body.status !== "disabled") {
    return NextResponse.json(
      { ok: false, error: "Status must be active or disabled." },
      { status: 400 },
    );
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
  } catch (err) {
    if (isMembershipSchemaUnavailableError(err)) {
      return NextResponse.json(membershipUnavailableResponseBody(), { status: 503 });
    }
    return NextResponse.json({ ok: false, error: "Membership not found." }, { status: 404 });
  }

  const ownerId =
    typeof membershipDoc.portalUser === "number"
      ? membershipDoc.portalUser
      : Number(membershipDoc.portalUser);
  if (ownerId !== portalUserId) {
    return NextResponse.json({ ok: false, error: "Membership not found." }, { status: 404 });
  }

  let portalUser: AnyDoc;
  try {
    portalUser = (await payload.findByID({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "portal-users" as any,
      id: portalUserId,
      depth: 0,
      overrideAccess: true,
    })) as AnyDoc;
  } catch {
    return NextResponse.json({ ok: false, error: "Portal user not found." }, { status: 404 });
  }

  const memberships = await listPortalMembershipsForUser(portalUserId, { payload });
  const activeCount = memberships.filter((m) => m.status === "active").length;
  const target = memberships.find((m) => m.id === membershipId);
  if (!target) {
    return NextResponse.json({ ok: false, error: "Membership not found." }, { status: 404 });
  }

  if (
    body.status === "disabled" &&
    target.status === "active" &&
    portalUser.active !== false &&
    activeCount <= 1
  ) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Cannot disable the last active membership while the portal user is active. " +
          "Deactivate the user first, or add another membership.",
      },
      { status: 400 },
    );
  }

  try {
    await payload.update({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "portal-client-memberships" as any,
      id: membershipId,
      data: {
        status: body.status,
        ...(body.status === "disabled" ? { isDefault: false } : {}),
      },
      overrideAccess: true,
    });

    if (body.status === "disabled" && target.isDefault) {
      const remaining = (await listPortalMembershipsForUser(portalUserId, { payload })).filter(
        (m) => m.status === "active",
      );
      const nextDefault = remaining.sort((a, b) => a.clientId - b.clientId)[0];
      if (nextDefault) {
        await payload.update({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          collection: "portal-client-memberships" as any,
          id: nextDefault.id,
          data: { isDefault: true },
          overrideAccess: true,
        });
        await syncPortalUserLegacyClientAndPreference({
          portalUserId,
          clientId: nextDefault.clientId,
          payload,
        });
      }
    }

    if (body.status === "active" && activeCount === 0) {
      await payload.update({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        collection: "portal-client-memberships" as any,
        id: membershipId,
        data: { isDefault: true },
        overrideAccess: true,
      });
      await syncPortalUserLegacyClientAndPreference({
        portalUserId,
        clientId: target.clientId,
        payload,
      });
    }

    const updated = await listPortalMembershipsForUser(portalUserId, { payload });
    return NextResponse.json({ ok: true, memberships: updated });
  } catch (err) {
    if (err instanceof MembershipSchemaUnavailableError || isMembershipSchemaUnavailableError(err)) {
      return NextResponse.json(membershipUnavailableResponseBody(), { status: 503 });
    }
    const message = err instanceof Error ? err.message : "Could not update membership.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
