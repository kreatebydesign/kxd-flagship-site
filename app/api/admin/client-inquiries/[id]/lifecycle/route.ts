/**
 * POST /api/admin/client-inquiries/[id]/lifecycle
 * Studio operator lifecycle updates for managed-client inquiries.
 * Never creates commission. Never writes sales-leads.
 */

import { NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import { isStudioPayloadOperator } from "../../../../../../payload/access/index";
import { updateClientInquiryLifecycle } from "@/lib/managed-client-leads/update-lifecycle";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: Request, context: RouteContext) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;
  if (!isStudioPayloadOperator(auth)) {
    return NextResponse.json(
      { success: false, error: "Studio operator authority is required." },
      { status: 403 },
    );
  }

  const { id: idParam } = await context.params;
  const inquiryId = Number(idParam);
  if (!Number.isFinite(inquiryId) || inquiryId <= 0) {
    return NextResponse.json(
      { success: false, error: "A valid client inquiry id is required." },
      { status: 400 },
    );
  }

  try {
    const body = (await req.json()) as Record<string, unknown>;
    const result = await updateClientInquiryLifecycle({
      inquiryId,
      actorUserId: Number(auth.id),
      operationalStatus: body.operationalStatus as never,
      disposition: body.disposition as never,
      leadQuality: body.leadQuality as never,
      verificationState: body.verificationState as never,
      qualificationState: body.qualificationState as never,
      outcomeState: body.outcomeState as never,
      outcomeNote:
        body.outcomeNote == null ? undefined : String(body.outcomeNote),
      confirmedSaleReference:
        body.confirmedSaleReference == null
          ? undefined
          : String(body.confirmedSaleReference),
      firstRespondedAt:
        body.firstRespondedAt == null
          ? undefined
          : String(body.firstRespondedAt),
      assignedOwnerId:
        body.assignedOwnerId == null
          ? undefined
          : Number(body.assignedOwnerId),
      googleConversionObserved:
        typeof body.googleConversionObserved === "boolean"
          ? body.googleConversionObserved
          : undefined,
      reconciliationState: body.reconciliationState as never,
      operatorNotes:
        body.operatorNotes == null ? undefined : String(body.operatorNotes),
    });

    if (!result.ok) {
      const status =
        result.code === "not_found"
          ? 404
          : result.code === "forbidden" || result.code === "policy"
            ? 403
            : 400;
      return NextResponse.json(
        { success: false, error: result.message },
        { status },
      );
    }

    return NextResponse.json({
      success: true,
      inquiryId: result.inquiry.id,
      inquiryKey: result.inquiry.inquiryKey,
      verificationState: result.inquiry.verificationState,
      qualificationState: result.inquiry.qualificationState,
      operationalStatus: result.inquiry.operationalStatus,
      responseTimeSeconds: result.inquiry.responseTimeSeconds,
    });
  } catch (err) {
    console.error("[KXD] client-inquiry lifecycle failed:", err);
    return NextResponse.json(
      { success: false, error: "Failed to update client inquiry." },
      { status: 500 },
    );
  }
}
