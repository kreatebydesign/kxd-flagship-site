import { NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import {
  confirmCsiWebsiteLeadSale,
  CsiLifecycleNotFoundError,
  CsiLifecycleStateError,
  CsiLifecycleValidationError,
  markCsiCommissionPaid,
} from "@/lib/client-site-intelligence/sale-commission";
import { isStudioPayloadOperator } from "../../../../../../payload/access/index";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ eventId: string }> };

export async function POST(req: Request, context: RouteContext) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;
  if (!isStudioPayloadOperator(auth)) {
    return NextResponse.json(
      { success: false, error: "Studio operator authority is required." },
      { status: 403 },
    );
  }

  const { eventId: eventIdParam } = await context.params;
  const eventId = Number(eventIdParam);
  if (!Number.isFinite(eventId) || eventId <= 0) {
    return NextResponse.json(
      { success: false, error: "A valid Client Site Event is required." },
      { status: 400 },
    );
  }

  try {
    const body = (await req.json()) as Record<string, unknown>;
    const action = String(body.action ?? "");
    const actor = { id: Number(auth.id) };

    if (action === "confirm-sale") {
      const result = await confirmCsiWebsiteLeadSale({
        eventId,
        soldAt: String(body.soldAt ?? ""),
        saleReference: String(body.saleReference ?? ""),
        cartModelReference:
          body.cartModelReference == null
            ? null
            : String(body.cartModelReference),
        actor,
      });
      return NextResponse.json({
        success: true,
        duplicate: result.kind === "already_confirmed",
        lifecycleStatus: result.record.lifecycleStatus,
        commissionStatus: result.record.commissionStatus,
        commissionAmountCents: result.record.commissionAmountCents,
        activityPublished: result.activityPublished,
      });
    }

    if (action === "mark-paid") {
      const result = await markCsiCommissionPaid({
        eventId,
        paidAt: String(body.paidAt ?? ""),
        paymentReference:
          body.paymentReference == null ? null : String(body.paymentReference),
        actor,
      });
      return NextResponse.json({
        success: true,
        duplicate: result.kind === "already_paid",
        commissionStatus: result.record.commissionStatus,
        commissionAmountCents: result.record.commissionAmountCents,
        activityPublished: result.activityPublished,
      });
    }

    return NextResponse.json(
      { success: false, error: "Unsupported CSI lifecycle action." },
      { status: 400 },
    );
  } catch (error) {
    if (error instanceof CsiLifecycleNotFoundError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 404 },
      );
    }
    if (error instanceof CsiLifecycleValidationError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 },
      );
    }
    if (error instanceof CsiLifecycleStateError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { success: false, error: "CSI lifecycle action failed." },
      { status: 500 },
    );
  }
}
