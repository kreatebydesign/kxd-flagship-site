import { NextResponse } from "next/server";
import { requireStaffCapabilityApi } from "@/lib/staff/guard";
import { endStaffShift } from "@/lib/staff-time/shifts";
import { readIdempotencyKey, staffTimeErrorResponse } from "@/lib/staff-time/api-errors";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const gated = await requireStaffCapabilityApi("staff.time.clock", request);
  if (gated instanceof NextResponse) return gated;

  try {
    const shift = await endStaffShift({
      actor: gated.actor,
      idempotencyKey: readIdempotencyKey(request),
    });
    return NextResponse.json({ success: true, shift });
  } catch (error) {
    const mapped = staffTimeErrorResponse(error);
    console.error("[KXD Staff Time] end shift failed:", error);
    return NextResponse.json(
      { success: false, error: mapped.message },
      { status: mapped.status },
    );
  }
}
