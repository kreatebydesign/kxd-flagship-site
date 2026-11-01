import { NextResponse } from "next/server";
import { requireStaffCapabilityApi } from "@/lib/staff/guard";
import { staffPayrollErrorResponse } from "@/lib/staff-pay/api-errors";
import {
  listStaffPayHistoricalEntriesForStaff,
  staffPayHistoricalEntriesTableReady,
} from "@/lib/staff-pay/historical-entries";
import { TYLER_RETHWILL_STAFF_USER_ID } from "@/lib/staff-pay/tyler-october-historical-reference";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const gated = await requireStaffCapabilityApi("admin.payroll.review", request);
  if (gated instanceof NextResponse) return gated;

  try {
    const ready = await staffPayHistoricalEntriesTableReady();
    const entries = ready
      ? await listStaffPayHistoricalEntriesForStaff(TYLER_RETHWILL_STAFF_USER_ID)
      : [];
    return NextResponse.json({ success: true, tableReady: ready, entries });
  } catch (error) {
    const mapped = staffPayrollErrorResponse(error);
    return NextResponse.json(
      { success: false, error: mapped.message },
      { status: mapped.status },
    );
  }
}
