import { NextResponse } from "next/server";
import { getPayload } from "payload";
import config from "@payload-config";
import { isCesModuleEnabled } from "@/lib/ces";
import { resolveExperienceProfile } from "@/lib/ces/server";
import { getPortalSession } from "@/lib/portal/session";
import { duplicateInventoryVehicle } from "@/lib/inventory/server";
import { toPublicInventoryVehicle } from "@/lib/inventory/public-map";

export const dynamic = "force-dynamic";

export async function POST(
  _req: Request,
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

  try {
    const payload = await getPayload({ config });
    const result = await duplicateInventoryVehicle(payload, {
      clientId: session.clientId,
      vehicleId,
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
    console.error("[KXD Inventory] Duplicate failed:", err);
    return NextResponse.json(
      { ok: false, message: "Could not duplicate vehicle." },
      { status: 500 },
    );
  }
}
