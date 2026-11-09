import { NextResponse } from "next/server";
import { requireStaffCapabilityReadApi } from "@/lib/staff/guard";
import { loadStaffMyTimePayPage } from "@/lib/staff-pay/employee-self-view";
import { staffTimePayRequestsTableReady } from "@/lib/staff-time/pay-requests";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const gated = await requireStaffCapabilityReadApi("staff.time.read.self");
  if (gated instanceof NextResponse) return gated;

  try {
    const view = await loadStaffMyTimePayPage(gated.actor);
    const requestsReady = await staffTimePayRequestsTableReady();
    return NextResponse.json({
      success: true,
      view,
      meta: {
        payRequestsEnabled: requestsReady,
        payRequestsMigration: "20261101_staff_time_pay_requests",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Could not load My Time & Pay.",
      },
      { status: 500 },
    );
  }
}
