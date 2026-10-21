import { NextResponse } from "next/server";
import { requireStaffCapabilityReadApi } from "@/lib/staff/guard";
import { findActiveStaffShift } from "@/lib/staff-time/shifts";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const gated = await requireStaffCapabilityReadApi("staff.time.read.self");
  if (gated instanceof NextResponse) return gated;

  const shift = await findActiveStaffShift(gated.actor.userId);
  return NextResponse.json({ success: true, shift });
}
