import { NextResponse } from "next/server";
import { requireStaffCapabilityApi } from "@/lib/staff/guard";
import { listOpenStaffTimePayRequestsForOwner } from "@/lib/staff-time/pay-requests";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const gated = await requireStaffCapabilityApi("admin.payroll.review", request);
  if (gated instanceof NextResponse) return gated;

  try {
    const requests = await listOpenStaffTimePayRequestsForOwner();
    return NextResponse.json({ success: true, requests });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Could not load pay requests.",
      },
      { status: 500 },
    );
  }
}
