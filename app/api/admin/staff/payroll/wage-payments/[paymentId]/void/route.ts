import { NextResponse } from "next/server";
import { requireStaffCapabilityApi } from "@/lib/staff/guard";
import { staffWagePaymentErrorResponse } from "@/lib/staff-pay/wage-payments/api-errors";
import { voidStaffWagePayment } from "@/lib/staff-pay/wage-payments/record";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ paymentId: string }> },
) {
  const gated = await requireStaffCapabilityApi("admin.payroll.review", request);
  if (gated instanceof NextResponse) return gated;

  const { paymentId: raw } = await context.params;
  const paymentId = Number(raw);
  if (!Number.isFinite(paymentId) || paymentId <= 0) {
    return NextResponse.json({ success: false, error: "Invalid payment id." }, { status: 400 });
  }

  try {
    const body = (await request.json()) as { note?: string | null };
    await voidStaffWagePayment(gated.actor, paymentId, body.note ?? null);
    return NextResponse.json({
      success: true,
      disclaimer: "Wage payment voided. Allocations released for re-settlement.",
    });
  } catch (error) {
    const mapped = staffWagePaymentErrorResponse(error);
    return NextResponse.json(
      { success: false, error: mapped.message },
      { status: mapped.status },
    );
  }
}
