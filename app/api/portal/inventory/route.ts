/**
 * Portal inventory collection — client-scoped, CES inventory required.
 */
import { NextRequest, NextResponse } from "next/server";
import { getPayload } from "payload";
import config from "@payload-config";
import { resolveExperienceProfile } from "@/lib/ces/server";
import { isCesModuleEnabled } from "@/lib/ces";
import { getPortalSession } from "@/lib/portal/session";
import {
  createInventoryVehicle,
  listInventoryForClient,
} from "@/lib/inventory/server";
import { toPublicInventoryVehicle } from "@/lib/inventory/public-map";
import type { InventoryListingStatus, InventoryVehicleInput } from "@/lib/inventory/types";

export const dynamic = "force-dynamic";

async function requireInventorySession() {
  const session = await getPortalSession();
  if (!session) return { error: NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 }) };
  const profile = await resolveExperienceProfile(session);
  if (!isCesModuleEnabled(profile, "inventory")) {
    return { error: NextResponse.json({ ok: false, message: "Inventory is not enabled." }, { status: 403 }) };
  }
  return { session, profile };
}

export async function GET(req: NextRequest) {
  const gate = await requireInventorySession();
  if ("error" in gate) return gate.error;

  const status = (req.nextUrl.searchParams.get("status") || "all") as
    | InventoryListingStatus
    | "all";
  const search = req.nextUrl.searchParams.get("q") || "";

  const payload = await getPayload({ config });
  const vehicles = await listInventoryForClient(payload, gate.session.clientId, {
    status,
    search,
  });

  return NextResponse.json({
    ok: true,
    vehicles,
    previews: vehicles.map((row) => toPublicInventoryVehicle(row)).filter(Boolean),
  });
}

export async function POST(req: NextRequest) {
  const gate = await requireInventorySession();
  if ("error" in gate) return gate.error;

  try {
    const body = (await req.json()) as InventoryVehicleInput;
    const payload = await getPayload({ config });
    const result = await createInventoryVehicle(payload, {
      clientId: gate.session.clientId,
      data: body,
      actor: gate.session.email,
    });
    if (!result.ok) {
      return NextResponse.json(
        { ok: false, message: result.message, issues: "issues" in result ? result.issues : undefined },
        { status: 400 },
      );
    }
    return NextResponse.json({
      ok: true,
      vehicle: result.vehicle,
      preview: toPublicInventoryVehicle(result.vehicle),
    });
  } catch (err) {
    console.error("[KXD Inventory] Portal create failed:", err);
    return NextResponse.json(
      { ok: false, message: "Could not create vehicle." },
      { status: 500 },
    );
  }
}
