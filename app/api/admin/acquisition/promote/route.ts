/**
 * POST /api/admin/acquisition/promote
 * Intentional operator promotion of KXD inbound intake → canonical sales-leads.
 */
import { NextRequest, NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import {
  promoteInquiryToSales,
  promoteProjectInquiryToSales,
  promoteWebsiteAuditToSales,
} from "@/lib/sales/promote-inbound";

export const dynamic = "force-dynamic";

const SOURCE_TYPES = new Set(["inquiry", "project_inquiry", "website_audit"]);

export async function POST(req: NextRequest) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    const sourceType = String(body.sourceType ?? "").trim();
    const sourceId = Number(body.sourceId ?? body.id);

    if (!SOURCE_TYPES.has(sourceType) || !sourceId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "sourceType (inquiry | project_inquiry | website_audit) and sourceId are required.",
        },
        { status: 400 },
      );
    }

    const operatorLabel =
      auth && typeof auth === "object" && "email" in auth && auth.email
        ? String(auth.email)
        : undefined;

    const result =
      sourceType === "inquiry"
        ? await promoteInquiryToSales(sourceId, { operatorLabel })
        : sourceType === "project_inquiry"
          ? await promoteProjectInquiryToSales(sourceId, { operatorLabel })
          : await promoteWebsiteAuditToSales(sourceId, { operatorLabel });

    if (!result.ok) {
      const status =
        result.code === "not_found"
          ? 404
          : result.code === "not_eligible" ||
              result.code === "conflict" ||
              result.code === "needs_review"
            ? 409
            : 500;
      return NextResponse.json(
        {
          success: false,
          error: result.message,
          code: result.code,
          candidateSalesLeadIds: result.candidateSalesLeadIds,
        },
        { status },
      );
    }

    return NextResponse.json({
      success: true,
      created: result.created,
      sourceType: result.sourceRecordType,
      sourceId: result.sourceRecordId,
      salesLeadId: result.salesLeadId,
      provenance: result.provenance,
      href: `/admin/sales?focus=${result.salesLeadId}`,
    });
  } catch (err) {
    console.error("[KXD] Acquisition promote failed:", err);
    return NextResponse.json(
      { success: false, error: "Failed to promote inbound record to Sales." },
      { status: 500 },
    );
  }
}
