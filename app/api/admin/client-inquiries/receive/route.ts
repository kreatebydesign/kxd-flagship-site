/**
 * POST /api/admin/client-inquiries/receive
 * Studio operator intake of a managed-client received inquiry.
 * Never writes sales-leads. Never creates commission.
 */

import { NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import { isStudioPayloadOperator } from "../../../../../payload/access/index";
import { receiveManagedClientInquiry } from "@/lib/managed-client-leads/receive";
import type { ManagedClientLeadChannel } from "@/lib/acquisition-operations/policy";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;
  if (!isStudioPayloadOperator(auth)) {
    return NextResponse.json(
      { success: false, error: "Studio operator authority is required." },
      { status: 403 },
    );
  }

  try {
    const body = (await req.json()) as Record<string, unknown>;
    const clientId = Number(body.clientId);
    const clientKey = String(body.clientKey ?? "").trim();
    const channel = String(body.channel ?? "form").trim() as ManagedClientLeadChannel;

    if (!Number.isFinite(clientId) || clientId <= 0 || !clientKey) {
      return NextResponse.json(
        { success: false, error: "clientId and clientKey are required." },
        { status: 400 },
      );
    }

    const result = await receiveManagedClientInquiry({
      clientId,
      clientKey,
      channel,
      receivedAt: body.receivedAt ? String(body.receivedAt) : undefined,
      destinationInbox:
        body.destinationInbox == null ? null : String(body.destinationInbox),
      landingPage: body.landingPage == null ? null : String(body.landingPage),
      campaign: body.campaign == null ? null : String(body.campaign),
      sourceMedium: body.sourceMedium == null ? null : String(body.sourceMedium),
      contactName: body.contactName == null ? null : String(body.contactName),
      contactEmail: body.contactEmail == null ? null : String(body.contactEmail),
      contactPhone: body.contactPhone == null ? null : String(body.contactPhone),
      messageSummary:
        body.messageSummary == null ? null : String(body.messageSummary),
      sourceSystem: body.sourceSystem == null ? null : String(body.sourceSystem),
      sourceExternalId:
        body.sourceExternalId == null ? null : String(body.sourceExternalId),
      sourceClientSiteEventId:
        body.sourceClientSiteEventId == null
          ? null
          : Number(body.sourceClientSiteEventId),
      googleConversionObserved: Boolean(body.googleConversionObserved),
      inquiryKey: body.inquiryKey ? String(body.inquiryKey) : undefined,
      operatorNotes:
        body.operatorNotes == null ? null : String(body.operatorNotes),
      actorUserId: Number(auth.id),
    });

    if (!result.ok) {
      const status =
        result.code === "policy" || result.code === "channel" || result.code === "binding"
          ? 403
          : result.code === "conflict"
            ? 409
            : 400;
      return NextResponse.json(
        { success: false, error: result.message },
        { status },
      );
    }

    return NextResponse.json({
      success: true,
      created: result.created,
      inquiryId: result.inquiry.id,
      inquiryKey: result.inquiry.inquiryKey,
      reconciliationState: result.inquiry.reconciliationState,
    });
  } catch (err) {
    console.error("[KXD] client-inquiry receive failed:", err);
    return NextResponse.json(
      { success: false, error: "Failed to receive client inquiry." },
      { status: 500 },
    );
  }
}
