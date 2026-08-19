/**
 * GET /api/admin/sales/leads/:id/activities
 * Lead-scoped commercial history from sales-activities.
 */
import { NextRequest, NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import { getLeadActivities } from "@/lib/sales/activities";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  const { id: rawId } = await ctx.params;
  const id = Number(rawId);
  if (!id) {
    return NextResponse.json({ success: false, error: "Valid lead id required." }, { status: 400 });
  }

  try {
    const docs = await getLeadActivities(id, 50);
    return NextResponse.json({
      success: true,
      activities: docs.map((doc) => ({
        id: Number(doc.id),
        activityType: String(doc.activityType ?? "note"),
        title: String(doc.title ?? "Activity"),
        summary: doc.summary ? String(doc.summary) : null,
        occurredAt: String(doc.occurredAt ?? doc.createdAt ?? ""),
      })),
    });
  } catch (err) {
    console.error("[KXD Sales] Lead activities failed:", err);
    return NextResponse.json(
      { success: false, error: "Failed to load lead history." },
      { status: 500 },
    );
  }
}
