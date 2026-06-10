/**
 * POST /api/admin/creative/actions/repair-orphans
 *
 * Finds orphaned creative items (no relatedCampaign set) and attempts to
 * re-link them using a conservative client-match heuristic.
 *
 * Safe contract:
 *   - Never deletes data.
 *   - Only sets null relationship fields; does not overwrite existing links.
 *   - If a client has multiple active campaigns, the item is left unresolved
 *     (ambiguous match is never forced).
 *   - Running multiple times is safe — already-linked items are not touched.
 *
 * Request body: {} (no parameters required)
 *
 * Response:
 *   {
 *     success: true,
 *     attempted: number,
 *     repaired: { flyers, videos, socialPosts, assets },
 *     unresolved: { flyers: [], videos: [], socialPosts: [], assets: [] },
 *     errors: string[],
 *     note: string,
 *   }
 */
import { NextResponse } from "next/server";
import { repairOrphanedItems } from "@/lib/creative-actions";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const result = await repairOrphanedItems();

    const totalRepaired   = Object.values(result.repaired).reduce((a, b) => a + b, 0);
    const totalUnresolved = Object.values(result.unresolved)
      .reduce((a, arr) => a + arr.length, 0);

    return NextResponse.json({
      success:      true,
      attempted:    result.attempted,
      repaired:     result.repaired,
      unresolved:   result.unresolved,
      errors:       result.errors,
      totalRepaired,
      totalUnresolved,
      note: result.attempted === 0
        ? "No orphaned items found — Creative Engine is clean."
        : totalRepaired > 0
          ? `${totalRepaired} item(s) re-linked. ${totalUnresolved} could not be resolved unambiguously — review in Payload.`
          : `No items could be automatically resolved. ${totalUnresolved} item(s) require manual linking in Payload.`,
    });
  } catch (err) {
    console.error("[KXD Actions] repair-orphans error:", err);
    return NextResponse.json(
      { success: false, error: "Repair action failed.", detail: String(err) },
      { status: 500 }
    );
  }
}
