/**
 * POST /api/admin/creative/actions/regenerate
 *
 * Inspects a campaign's generationConfig and creates only the missing
 * creative outputs (flyers, social posts, videos, brand kit).
 *
 * Differs from rerun-campaign in intent:
 *   - rerun-campaign: re-trigger a spawn for operational re-runs.
 *   - regenerate: fix gaps in an existing campaign's output set.
 *
 * Safe contract:
 *   - Does not duplicate records — the spawn engine counts existing items first.
 *   - Returns an informative note if generationConfig is empty (nothing to do).
 *   - No writes occur unless a genuine gap exists.
 *
 * Request body:
 *   { campaignId: number }
 *
 * Response:
 *   {
 *     success: true,
 *     campaignId: number,
 *     campaignTitle: string,
 *     configFound: boolean,
 *     spawn: SpawnResult | null,
 *     errors: string[],
 *     note: string,
 *   }
 */
import { NextRequest, NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import { regenerateMissingOutputs } from "@/lib/creative-actions";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

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
    const result = await regenerateMissingOutputs(campaignId);

    return NextResponse.json({
      success:       true,
      campaignId:    result.campaignId,
      campaignTitle: result.campaignTitle,
      configFound:   result.configFound,
      spawn:         result.spawn,
      errors:        result.errors,
      note:          result.note,
    });
  } catch (err) {
    console.error("[KXD Actions] regenerate error:", err);
    return NextResponse.json(
      { success: false, error: "Regenerate action failed.", detail: String(err) },
      { status: 500 }
    );
  }
}
