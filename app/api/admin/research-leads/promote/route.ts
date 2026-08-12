/**
 * POST /api/admin/research-leads/promote
 * Promote a research intake record into a Sales opportunity (idempotent).
 */
import { NextRequest, NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import { promoteResearchLeadToSales } from "@/lib/sales/promote-research-lead";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    const researchLeadId = Number(body.researchLeadId ?? body.id);
    if (!researchLeadId) {
      return NextResponse.json(
        { success: false, error: "researchLeadId is required." },
        { status: 400 },
      );
    }

    const result = await promoteResearchLeadToSales(researchLeadId, {
      operatorLabel:
        auth && typeof auth === "object" && "email" in auth && auth.email
          ? String(auth.email)
          : undefined,
    });

    if (!result.ok) {
      const status =
        result.code === "not_found" ? 404 : result.code === "conflict" ? 409 : 500;
      return NextResponse.json({ success: false, error: result.message }, { status });
    }

    return NextResponse.json({
      success: true,
      created: result.created,
      researchLeadId: result.researchLeadId,
      salesLeadId: result.salesLeadId,
      href: `/admin/sales?focus=${result.salesLeadId}`,
    });
  } catch (err) {
    console.error("[KXD] Promote research lead failed:", err);
    return NextResponse.json(
      { success: false, error: "Failed to promote research lead." },
      { status: 500 },
    );
  }
}
