import { NextResponse } from "next/server";
import { requireStaffCapabilityApi } from "@/lib/staff/guard";
import { staffPayrollErrorResponse } from "@/lib/staff-pay/api-errors";
import { applyTylerOwnerApprovedHistoricalEntries } from "@/lib/staff-pay/historical-entries";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Records Tyler Oct 15–19 duration rows only. Does not mark paid or create Time Clock shifts. */
export async function POST(request: Request) {
  const gated = await requireStaffCapabilityApi("admin.payroll.review", request);
  if (gated instanceof NextResponse) return gated;

  try {
    const result = await applyTylerOwnerApprovedHistoricalEntries(gated.actor);
    return NextResponse.json({
      success: true,
      ...result,
      disclaimer:
        "Historical duration records saved. No wage payment recorded. Time Clock shifts unchanged.",
    });
  } catch (error) {
    const mapped = staffPayrollErrorResponse(error);
    return NextResponse.json(
      { success: false, error: mapped.message },
      { status: mapped.status },
    );
  }
}
