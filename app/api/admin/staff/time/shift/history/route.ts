import { NextResponse } from "next/server";
import { requireStaffCapabilityReadApi } from "@/lib/staff/guard";
import { listStaffShiftHistory } from "@/lib/staff-time/shifts";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const gated = await requireStaffCapabilityReadApi("staff.time.read.self");
  if (gated instanceof NextResponse) return gated;

  const url = new URL(request.url);
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit") ?? 20)));

  const history = await listStaffShiftHistory(gated.actor.userId, limit);
  return NextResponse.json({ success: true, history });
}
