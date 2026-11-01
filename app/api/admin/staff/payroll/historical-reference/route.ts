import { NextResponse } from "next/server";
import { requireStaffCapabilityApi } from "@/lib/staff/guard";
import { staffPayrollErrorResponse } from "@/lib/staff-pay/api-errors";
import { loadTylerHistoricalOwnerReview } from "@/lib/staff-pay/historical-owner-review";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const gated = await requireStaffCapabilityApi("admin.payroll.review", request);
  if (gated instanceof NextResponse) return gated;

  try {
    return NextResponse.json({
      success: true,
      review: loadTylerHistoricalOwnerReview(),
    });
  } catch (error) {
    const mapped = staffPayrollErrorResponse(error);
    return NextResponse.json(
      { success: false, error: mapped.message },
      { status: mapped.status },
    );
  }
}
