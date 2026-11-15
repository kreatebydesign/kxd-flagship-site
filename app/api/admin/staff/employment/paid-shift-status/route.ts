import { NextResponse } from "next/server";
import { requireStaffCapabilityReadApi } from "@/lib/staff/guard";
import { loadStaffPaidShiftSelfStatus } from "@/lib/staff-employment/compliance-data";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const gated = await requireStaffCapabilityReadApi("staff.time.read.self");
  if (gated instanceof NextResponse) return gated;

  const status = await loadStaffPaidShiftSelfStatus(gated.actor);
  return NextResponse.json({ success: true, status });
}