/**
 * POST /api/admin/creative/actions/rerun-campaign
 *
 * Re-triggers the Campaign Spawn Engine for a specific campaign.
 * Delegates to spawnCreativeFromCampaign which is fully idempotent —
 * only the deficit between configured and existing items is created.
 *
 * Safe contract:
 *   - Does not delete or overwrite existing creative items.
 *   - Safe to run multiple times on the same campaign.
 *   - Requires autoGenerate to be enabled on the campaign in Payload
 *     for any items to be spawned.
 *
 * Request body:
 *   { campaignId: number }
 *
 * Response:
 *   {
 *     success: true,
 *     campaignId: number,
 *     campaignTitle: string,
 *     created:  { brandKits, flyers, socialPosts, videos },
 *     skipped:  { brandKits, flyers, socialPosts, videos },
 *     errors:   string[],
 *     note:     string,
 *   }
 */
import { NextRequest, NextResponse } from "next/server";
import { rerunCampaignSpawn } from "@/lib/creative-actions";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let body: { campaignId?: unknown };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const rawId     = body?.campaignId;
  const campaignId = typeof rawId === "number" ? rawId : parseInt(String(rawId ?? ""), 10);

  if (!campaignId || isNaN(campaignId) || campaignId <= 0) {
    return NextResponse.json(
      { success: false, error: "campaignId (positive integer) is required." },
      { status: 400 }
    );
  }

  try {
    const result = await rerunCampaignSpawn(campaignId);

    return NextResponse.json({
      success:       true,
      campaignId:    result.campaignId,
      campaignTitle: result.campaignTitle,
      clientId:      result.clientId,
      created:       result.created,
      skipped:       result.skipped,
      errors:        result.errors,
      note:          result.note,
    });
  } catch (err) {
    console.error("[KXD Actions] rerun-campaign error:", err);
    return NextResponse.json(
      { success: false, error: "Rerun action failed.", detail: String(err) },
      { status: 500 }
    );
  }
}
