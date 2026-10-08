import { NextRequest, NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import {
  loadOwnerNetworkShowcaseList,
  operatorUpsertNetworkShowcase,
} from "@/lib/portal/partner/network-directory";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requirePayloadAdminApi(req);
  if (auth instanceof NextResponse) return auth;
  const items = await loadOwnerNetworkShowcaseList();
  return NextResponse.json({ ok: true, items });
}

export async function POST(req: NextRequest) {
  const auth = await requirePayloadAdminApi(req);
  if (auth instanceof NextResponse) return auth;

  const body = (await req.json()) as Record<string, unknown>;
  const result = await operatorUpsertNetworkShowcase({
    id: body.id != null ? Number(body.id) : undefined,
    directoryVisibility:
      body.directoryVisibility === "published" ||
      body.directoryVisibility === "private"
        ? body.directoryVisibility
        : undefined,
    companyName:
      typeof body.companyName === "string" ? body.companyName : undefined,
    categoryMarket:
      typeof body.categoryMarket === "string" ? body.categoryMarket : undefined,
    workDescription:
      typeof body.workDescription === "string"
        ? body.workDescription
        : undefined,
    markId:
      body.markId === null
        ? null
        : body.markId != null
          ? Number(body.markId)
          : undefined,
    websiteUrl:
      typeof body.websiteUrl === "string" ? body.websiteUrl : undefined,
    creditedPartnerId:
      body.creditedPartnerId === null
        ? null
        : body.creditedPartnerId != null
          ? Number(body.creditedPartnerId)
          : undefined,
    creditAttribution:
      typeof body.creditAttribution === "boolean"
        ? body.creditAttribution
        : undefined,
    ownerApprovedForNetwork:
      typeof body.ownerApprovedForNetwork === "boolean"
        ? body.ownerApprovedForNetwork
        : undefined,
    sortOrder:
      body.sortOrder != null ? Number(body.sortOrder) : undefined,
  });
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.message },
      { status: 400 },
    );
  }
  return NextResponse.json({ ok: true, id: result.id });
}
