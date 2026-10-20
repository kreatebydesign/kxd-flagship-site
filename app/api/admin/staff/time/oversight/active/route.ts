import { NextResponse } from "next/server";
import { requireStaffCapabilityReadApi } from "@/lib/staff/guard";
import { loadStaffTimeOversightActiveShifts } from "@/lib/staff-time/shifts";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Operator read-only view of active staff shifts. */
export async function GET() {
  const gated = await requireStaffCapabilityReadApi("admin.time.oversight.read");
  if (gated instanceof NextResponse) return gated;

  const active = await loadStaffTimeOversightActiveShifts();
  return NextResponse.json({ success: true, active });
}
