import { NextResponse } from "next/server";
import { getPayload } from "payload";
import config from "@payload-config";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import {
  ensurePortalMembership,
  listPortalMembershipsForUser,
  MembershipSchemaUnavailableError,
  syncPortalUserLegacyClientAndPreference,
} from "@/lib/portal/memberships";
import { membershipUnavailableResponseBody } from "@/lib/portal/membership-schema";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

async function loadPortalUser(payload: Awaited<ReturnType<typeof getPayload>>, id: number) {
  try {
    return await payload.findByID({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "portal-users" as any,
      id,
      depth: 0,
      overrideAccess: true,
    });
  } catch {
    return null;
  }
}

export async function GET(_req: Request, context: RouteContext) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  const { id: rawId } = await context.params;
  const portalUserId = Number.parseInt(rawId, 10);
  if (!Number.isFinite(portalUserId)) {
    return NextResponse.json({ ok: false, error: "Invalid portal user." }, { status: 400 });
  }

  const payload = await getPayload({ config });
  const user = await loadPortalUser(payload, portalUserId);
  if (!user) {
    return NextResponse.json({ ok: false, error: "Portal user not found." }, { status: 404 });
  }

  const memberships = await listPortalMembershipsForUser(portalUserId, { payload });
  return NextResponse.json({ ok: true, memberships });
}

export async function POST(req: Request, context: RouteContext) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  const { id: rawId } = await context.params;
  const portalUserId = Number.parseInt(rawId, 10);
  if (!Number.isFinite(portalUserId)) {
    return NextResponse.json({ ok: false, error: "Invalid portal user." }, { status: 400 });
  }

  const body = (await req.json()) as { clientId?: number; setDefault?: boolean };
  const clientId = body.clientId;
  if (!clientId || !Number.isFinite(clientId)) {
    return NextResponse.json({ ok: false, error: "Client is required." }, { status: 400 });
  }

  const payload = await getPayload({ config });
  const user = await loadPortalUser(payload, portalUserId);
  if (!user) {
    return NextResponse.json({ ok: false, error: "Portal user not found." }, { status: 404 });
  }

  try {
    await payload.findByID({
      collection: "clients",
      id: clientId,
      depth: 0,
      overrideAccess: true,
    });
  } catch {
    return NextResponse.json({ ok: false, error: "Client not found." }, { status: 400 });
  }

  const existing = await listPortalMembershipsForUser(portalUserId, { payload });
  const duplicate = existing.find((m) => m.clientId === clientId);
  if (duplicate && duplicate.status === "active") {
    return NextResponse.json(
      { ok: false, error: "This portal user already has an active membership for that client." },
      { status: 400 },
    );
  }

  const shouldDefault = body.setDefault === true || existing.filter((m) => m.status === "active").length === 0;

  try {
    const membership = await ensurePortalMembership({
      portalUserId,
      clientId,
      isDefault: shouldDefault,
      payload,
    });

    if (shouldDefault) {
      await syncPortalUserLegacyClientAndPreference({
        portalUserId,
        clientId,
        payload,
      });
    }

    const memberships = await listPortalMembershipsForUser(portalUserId, { payload });
    return NextResponse.json({ ok: true, membership, memberships });
  } catch (err) {
    if (err instanceof MembershipSchemaUnavailableError) {
      return NextResponse.json(membershipUnavailableResponseBody(), { status: 503 });
    }
    const message = err instanceof Error ? err.message : "Could not add membership.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
