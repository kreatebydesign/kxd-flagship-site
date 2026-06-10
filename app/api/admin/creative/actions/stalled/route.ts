/**
 * POST /api/admin/creative/actions/stalled
 *
 * READ-ONLY scan. Returns all creative work items that are stalled:
 *   - Status is still "new" or "drafting" (earliest lifecycle stages).
 *   - Results are grouped by type and sorted oldest-first.
 *
 * Safe contract:
 *   - This route is strictly observational — NO STATUS CHANGES are made.
 *   - Designed to surface actionable insight before a human or future phase
 *     decides how to intervene.
 *   - Idempotent, side-effect-free, safe to call any number of times.
 *
 * Request body: {} (no parameters required)
 *
 * Response:
 *   {
 *     success: true,
 *     flyers:      StalledItem[],
 *     videos:      StalledItem[],
 *     socialPosts: StalledItem[],
 *     totalStalled: number,
 *     note: string,
 *   }
 *
 * StalledItem:
 *   { id, title, status, client, updatedAt, daysSinceUpdate }
 */
import { NextResponse } from "next/server";
import { fixStalledItems } from "@/lib/creative-actions";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const report = await fixStalledItems();

    return NextResponse.json({
      success:      true,
      flyers:       report.flyers,
      videos:       report.videos,
      socialPosts:  report.socialPosts,
      totalStalled: report.totalStalled,
      note:         report.note,
    });
  } catch (err) {
    console.error("[KXD Actions] stalled error:", err);
    return NextResponse.json(
      { success: false, error: "Stalled scan failed.", detail: String(err) },
      { status: 500 }
    );
  }
}
