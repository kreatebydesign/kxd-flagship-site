/**
 * GET /api/public/inventory/[clientSlug]/[vehicleSlug]
 * Single public vehicle. VIN never included.
 */
import { NextResponse } from "next/server";
import { getPayload } from "payload";
import config from "@payload-config";
import { getPublicInventoryVehicle } from "@/lib/inventory/server";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  context: { params: Promise<{ clientSlug: string; vehicleSlug: string }> },
) {
  try {
    const { clientSlug, vehicleSlug } = await context.params;
    const cSlug = String(clientSlug ?? "").trim().toLowerCase();
    const vSlug = String(vehicleSlug ?? "").trim().toLowerCase();
    if (!cSlug || !vSlug) {
      return NextResponse.json(
        { ok: false, message: "Client slug and vehicle slug required." },
        { status: 400 },
      );
    }

    const payload = await getPayload({ config });
    const vehicle = await getPublicInventoryVehicle(payload, cSlug, vSlug);
    if (!vehicle) {
      return NextResponse.json(
        { ok: false, message: "Vehicle not found." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      ok: true,
      clientSlug: cSlug,
      vehicle,
    });
  } catch (err) {
    console.error("[KXD Inventory] Public detail failed:", err);
    return NextResponse.json(
      { ok: false, message: "Unable to load vehicle." },
      { status: 500 },
    );
  }
}
