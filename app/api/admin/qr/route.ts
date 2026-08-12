/**
 * GET /api/admin/qr — recent saved QR records (metadata only).
 */

import { NextResponse } from "next/server";
import { getPayload } from "payload";
import config from "@payload-config";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import { listRecentQrRecords } from "@/lib/qr";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  const url = new URL(req.url);
  const limitRaw = Number(url.searchParams.get("limit") ?? "20");
  const clientRaw = url.searchParams.get("clientId");
  const clientId =
    clientRaw && /^\d+$/.test(clientRaw) ? Number(clientRaw) : null;

  try {
    const payload = await getPayload({ config });
    const records = await listRecentQrRecords(payload, {
      limit: Number.isFinite(limitRaw) ? limitRaw : 20,
      clientId,
    });
    return NextResponse.json({ ok: true, records });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to list QR records.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
