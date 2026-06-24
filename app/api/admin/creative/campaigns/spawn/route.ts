/**
 * POST /api/admin/creative/campaigns/spawn
 *
 * Campaign Spawn Engine — manual trigger endpoint.
 *
 * Fetches a campaign by ID, validates it has a generationConfig, and calls
 * spawnCreativeFromCampaign to generate the configured creative work items.
 *
 * This is a MANUAL trigger only. Nothing executes automatically.
 * Safe to call multiple times — the engine skips items that already exist.
 *
 * Request body:
 *   { campaignId: number }
 *
 * Success response:
 *   {
 *     success: true,
 *     campaignId: number,
 *     campaignTitle: string,
 *     created: { brandKits, flyers, socialPosts, videos },
 *     skipped: { brandKits, flyers, socialPosts, videos },
 *     errors: string[],
 *     totalCreated: number,
 *   }
 *
 * Error response:
 *   { success: false, error: string }
 */
import { NextRequest, NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import { spawnCreativeFromCampaign } from "@/lib/creative-spawn-engine";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();

    const campaignId = Number(body.campaignId);
    if (!campaignId || isNaN(campaignId) || campaignId <= 0) {
      return NextResponse.json(
        { success: false, error: "campaignId is required and must be a positive integer." },
        { status: 400 }
      );
    }

    const result = await spawnCreativeFromCampaign(campaignId);

    const totalCreated = Object.values(result.created).reduce((a, b) => a + b, 0);

    // Surface partial errors as a warning but still return 200 if at least
    // some items were created or skipped (campaign found and processed).
    const hasProcessed = totalCreated > 0 || Object.values(result.skipped).some(n => n > 0);
    const hasFatalError = result.errors.some(e =>
      e.includes("not found") || e.includes("Failed to initialize") || e.includes("Failed to fetch")
    );

    if (hasFatalError && totalCreated === 0) {
      return NextResponse.json(
        { success: false, error: result.errors[0] ?? "Spawn failed.", errors: result.errors },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success:       true,
      campaignId:    result.campaignId,
      campaignTitle: result.campaignTitle,
      clientId:      result.clientId,
      created:       result.created,
      skipped:       result.skipped,
      errors:        result.errors,           // populated only on partial failures
      totalCreated,
      note:          hasProcessed
        ? totalCreated === 0
          ? "All requested items already exist — nothing new was created."
          : `${totalCreated} item(s) created. Re-run is safe; existing items will be skipped.`
        : "No items were configured — update generationConfig and try again.",
    });
  } catch (err) {
    console.error("[KXD Spawn Engine] Route error:", err);
    return NextResponse.json(
      { success: false, error: "Internal error in spawn route.", detail: String(err) },
      { status: 500 }
    );
  }
}
