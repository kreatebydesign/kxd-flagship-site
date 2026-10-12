import { NextRequest, NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import {
  loadOwnerNetworkProfile,
  operatorUpdateNetworkProfile,
} from "@/lib/portal/partner/network-directory";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requirePayloadAdminApi(req);
  if (auth instanceof NextResponse) return auth;

  const partnerId = Number(req.nextUrl.searchParams.get("partnerId"));
  if (!Number.isFinite(partnerId) || partnerId <= 0) {
    return NextResponse.json(
      { ok: false, error: "partnerId is required." },
      { status: 400 },
    );
  }
  const profile = await loadOwnerNetworkProfile(partnerId);
  if (!profile) {
    return NextResponse.json(
      { ok: false, error: "Partner not found." },
      { status: 404 },
    );
  }
  return NextResponse.json({ ok: true, profile });
}

export async function PATCH(req: NextRequest) {
  const auth = await requirePayloadAdminApi(req);
  if (auth instanceof NextResponse) return auth;

  const body = (await req.json()) as Record<string, unknown>;
  const partnerId = Number(body.partnerId);
  const result = await operatorUpdateNetworkProfile({
    partnerId,
    directoryVisibility:
      body.directoryVisibility === "published" ||
      body.directoryVisibility === "private"
        ? body.directoryVisibility
        : undefined,
    cityMarket:
      typeof body.cityMarket === "string" ? body.cityMarket : undefined,
    companyOrRole:
      typeof body.companyOrRole === "string" ? body.companyOrRole : undefined,
    connectionLane1:
      typeof body.connectionLane1 === "string"
        ? body.connectionLane1
        : undefined,
    connectionLane2:
      typeof body.connectionLane2 === "string"
        ? body.connectionLane2
        : undefined,
    connectionLane3:
      typeof body.connectionLane3 === "string"
        ? body.connectionLane3
        : undefined,
    profileLine:
      typeof body.profileLine === "string" ? body.profileLine : undefined,
    directoryMarkId:
      body.directoryMarkId === null
        ? null
        : body.directoryMarkId != null
          ? Number(body.directoryMarkId)
          : undefined,
    trustedPartner:
      typeof body.trustedPartner === "boolean"
        ? body.trustedPartner
        : undefined,
  });
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.message },
      { status: 400 },
    );
  }
  return NextResponse.json({ ok: true });
}
