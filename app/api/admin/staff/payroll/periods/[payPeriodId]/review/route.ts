import { NextResponse } from "next/server";
import { requireStaffCapabilityApi } from "@/lib/staff/guard";
import { staffPayrollErrorResponse } from "@/lib/staff-pay/api-errors";
import { loadStaffPayPeriodReview } from "@/lib/staff-pay/period-review";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: { params: Promise<{ payPeriodId: string }> },
) {
  const gated = await requireStaffCapabilityApi("admin.payroll.review", request);
  if (gated instanceof NextResponse) return gated;

  const { payPeriodId: raw } = await context.params;
  const payPeriodId = Number(raw);
  if (!Number.isFinite(payPeriodId) || payPeriodId <= 0) {
    return NextResponse.json(
      { success: false, error: "Invalid pay period id." },
      { status: 400 },
    );
  }

  try {
    const review = await loadStaffPayPeriodReview(gated.actor, payPeriodId);
    return NextResponse.json({ success: true, review });
  } catch (error) {
    const mapped = staffPayrollErrorResponse(error);
    return NextResponse.json(
      { success: false, error: mapped.message },
      { status: mapped.status },
    );
  }
}
