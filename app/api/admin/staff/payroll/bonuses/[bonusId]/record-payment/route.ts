import { NextResponse } from "next/server";
import { requireStaffCapabilityApi } from "@/lib/staff/guard";
import { isFounderOrAdmin } from "@/lib/staff/permissions";
import { staffDiscretionaryBonusErrorResponse } from "@/lib/staff-pay/bonuses/api-errors";
import { recordStaffDiscretionaryBonusPayment } from "@/lib/staff-pay/bonuses/mark-paid";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ bonusId: string }> },
) {
  const gated = await requireStaffCapabilityApi("admin.payroll.review", request);
  if (gated instanceof NextResponse) return gated;
  if (!isFounderOrAdmin(gated.actor)) {
    return NextResponse.json(
      { success: false, error: "Only the owner may record bonus payments." },
      { status: 403 },
    );
  }

  const { bonusId: bonusIdRaw } = await context.params;
  const bonusId = Number(bonusIdRaw);
  if (!Number.isFinite(bonusId) || bonusId <= 0) {
    return NextResponse.json({ success: false, error: "Invalid bonus id." }, { status: 400 });
  }

  try {
    const body = (await request.json()) as {
      paymentReference?: string;
      paymentIdempotencyKey?: string;
      paidAt?: string;
    };
    const result = await recordStaffDiscretionaryBonusPayment(gated.actor, {
      bonusId,
      paymentReference: String(body.paymentReference ?? ""),
      paymentIdempotencyKey: String(body.paymentIdempotencyKey ?? ""),
      paidAt: body.paidAt,
    });
    return NextResponse.json({
      success: true,
      idempotent: result.idempotent,
      bonus: result.bonus,
    });
  } catch (error) {
    const mapped = staffDiscretionaryBonusErrorResponse(error);
    return NextResponse.json(
      { success: false, error: mapped.message },
      { status: mapped.status },
    );
  }
}