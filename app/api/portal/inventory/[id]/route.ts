import { NextRequest, NextResponse } from "next/server";
import { getPayload } from "payload";
import config from "@payload-config";
import { isCesModuleEnabled } from "@/lib/ces";
import { resolveExperienceProfile } from "@/lib/ces/server";
import { getPortalSession } from "@/lib/portal/session";
import {
  getInventoryVehicleForClient,
  updateInventoryVehicle,
} from "@/lib/inventory/server";
import { toPublicInventoryVehicle } from "@/lib/inventory/public-map";
import type { InventoryVehicleInput } from "@/lib/inventory/types";

export const dynamic = "force-dynamic";

async function requireInventorySession() {
  const session = await getPortalSession();
  if (!session) {
    return {
      error: NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 }),
    };
  }
  const profile = await resolveExperienceProfile(session);
  if (!isCesModuleEnabled(profile, "inventory")) {
    return {
      error: NextResponse.json(
        { ok: false, message: "Inventory is not enabled." },
        { status: 403 },
      ),
    };
  }
  return { session };
}

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const gate = await requireInventorySession();
  if ("error" in gate) return gate.error;
  const { id } = await context.params;
  const vehicleId = Number(id);
  if (!Number.isFinite(vehicleId)) {
    return NextResponse.json({ ok: false, message: "Invalid id." }, { status: 400 });
  }

  const payload = await getPayload({ config });
  const vehicle = await getInventoryVehicleForClient(
    payload,
    gate.session.clientId,
    vehicleId,
  );
  if (!vehicle) {
    return NextResponse.json({ ok: false, message: "Not found." }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    vehicle,
    preview: toPublicInventoryVehicle(vehicle),
  });
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const gate = await requireInventorySession();
  if ("error" in gate) return gate.error;
  const { id } = await context.params;
  const vehicleId = Number(id);
  if (!Number.isFinite(vehicleId)) {
    return NextResponse.json({ ok: false, message: "Invalid id." }, { status: 400 });
  }

  try {
    const body = (await req.json()) as Partial<InventoryVehicleInput>;
    const payload = await getPayload({ config });
    const result = await updateInventoryVehicle(payload, {
      clientId: gate.session.clientId,
      vehicleId,
      data: body,
      actor: gate.session.email,
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
    console.error("[KXD Inventory] Portal update failed:", err);
    return NextResponse.json(
      { ok: false, message: "Could not update vehicle." },
      { status: 500 },
    );
  }
}
