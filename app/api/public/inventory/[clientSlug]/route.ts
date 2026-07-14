/**
 * GET /api/public/inventory/[clientSlug]
 * Published, listable inventory only. VIN never included.
 */
import { NextRequest, NextResponse } from "next/server";
import { getPayload } from "payload";
import config from "@payload-config";
import { listPublicInventory } from "@/lib/inventory/server";
import type { InventoryGroup } from "@/lib/inventory/types";

export const dynamic = "force-dynamic";

const GROUPS = new Set<InventoryGroup>(["new", "used", "coming_soon"]);

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ clientSlug: string }> },
) {
  try {
    const { clientSlug } = await context.params;
    const slug = String(clientSlug ?? "").trim().toLowerCase();
    if (!slug) {
      return NextResponse.json(
        { ok: false, message: "Client slug required." },
        { status: 400 },
      );
    }

    const groupParam = req.nextUrl.searchParams.get("group");
    const featured = req.nextUrl.searchParams.get("featured") === "1";
    const group =
      groupParam && GROUPS.has(groupParam as InventoryGroup)
        ? (groupParam as InventoryGroup)
        : undefined;

    const payload = await getPayload({ config });
    const vehicles = await listPublicInventory(payload, slug, {
      group,
      featured: featured || undefined,
    });

    return NextResponse.json({
      ok: true,
      clientSlug: slug,
      count: vehicles.length,
      vehicles,
    });
  } catch (err) {
    console.error("[KXD Inventory] Public list failed:", err);
    return NextResponse.json(
      { ok: false, message: "Unable to load inventory." },
      { status: 500 },
    );
  }
}
