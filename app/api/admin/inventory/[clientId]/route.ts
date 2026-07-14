/**
 * Admin inventory list for a client — Payload admin only.
 */
import { NextRequest, NextResponse } from "next/server";
import { getPayload } from "payload";
import config from "@payload-config";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import { listInventoryForClient } from "@/lib/inventory/server";
import { toPublicInventoryVehicle } from "@/lib/inventory/public-map";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ clientId: string }> },
) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  const { clientId: raw } = await context.params;
  const clientId = Number(raw);
  if (!Number.isFinite(clientId)) {
    return NextResponse.json({ ok: false, error: "Invalid client id." }, { status: 400 });
  }

  try {
    const payload = await getPayload({ config });
    const vehicles = await listInventoryForClient(payload, clientId);
    return NextResponse.json({
      ok: true,
      vehicles,
      previews: vehicles
        .map((row) => toPublicInventoryVehicle(row))
        .filter(Boolean),
    });
  } catch (err) {
    console.error("[KXD Inventory] Admin list failed:", err);
    return NextResponse.json(
      { ok: false, error: "Unable to load inventory." },
      { status: 500 },
    );
  }
}
