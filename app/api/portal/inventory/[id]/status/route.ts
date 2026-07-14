import { NextRequest, NextResponse } from "next/server";
import { getPayload } from "payload";
import config from "@payload-config";
import { isCesModuleEnabled } from "@/lib/ces";
import { resolveExperienceProfile } from "@/lib/ces/server";
import { getPortalSession } from "@/lib/portal/session";
import { updateInventoryVehicle } from "@/lib/inventory/server";
import { toPublicInventoryVehicle } from "@/lib/inventory/public-map";
import { INVENTORY_LISTING_STATUSES } from "@/lib/inventory/types";
import type { InventoryListingStatus } from "@/lib/inventory/types";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getPortalSession();
  if (!session) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }
  const profile = await resolveExperienceProfile(session);
  if (!isCesModuleEnabled(profile, "inventory")) {
    return NextResponse.json(
      { ok: false, message: "Inventory is not enabled." },
      { status: 403 },
    );
  }

  const { id } = await context.params;
  const vehicleId = Number(id);
  if (!Number.isFinite(vehicleId)) {
    return NextResponse.json({ ok: false, message: "Invalid id." }, { status: 400 });
  }

  const body = await req.json();
  const listingStatus = String(body.listingStatus ?? "") as InventoryListingStatus;
  if (!(INVENTORY_LISTING_STATUSES as readonly string[]).includes(listingStatus)) {
    return NextResponse.json(
      { ok: false, message: "Invalid listing status." },
      { status: 400 },
    );
  }

  try {
    const payload = await getPayload({ config });
    const result = await updateInventoryVehicle(payload, {
      clientId: session.clientId,
      vehicleId,
      data: { listingStatus },
      actor: session.email,
    });
    if (!result.ok) {
      return NextResponse.json(
        { ok: false, message: result.message },
        { status: 400 },
      );
    }
    return NextResponse.json({
      ok: true,
      vehicle: result.vehicle,
      preview: toPublicInventoryVehicle(result.vehicle),
    });
  } catch (err) {
    console.error("[KXD Inventory] Status update failed:", err);
    return NextResponse.json(
      { ok: false, message: "Could not update status." },
      { status: 500 },
    );
  }
}
