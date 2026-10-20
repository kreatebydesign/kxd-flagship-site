import { NextResponse } from "next/server";
import { requireStaffCapabilityApi } from "@/lib/staff/guard";
import { resolveRequestTimezone } from "@/lib/platform/timezone";
import { parseStaffWorkIntent } from "@/lib/staff-time/intent";
import { startStaffShift } from "@/lib/staff-time/shifts";
import { readIdempotencyKey, staffTimeErrorResponse } from "@/lib/staff-time/api-errors";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const gated = await requireStaffCapabilityApi("staff.time.clock");
  if (gated instanceof NextResponse) return gated;

  try {
    const body = (await request.json()) as { workIntent?: unknown };
    const workIntent = parseStaffWorkIntent(body.workIntent ?? body);
    const workTimezone = await resolveRequestTimezone();
    const shift = await startStaffShift({
      actor: gated.actor,
      user: gated.user,
      workTimezone,
      workIntent,
      idempotencyKey: readIdempotencyKey(request),
    });
    return NextResponse.json({ success: true, shift });
  } catch (error) {
    const mapped = staffTimeErrorResponse(error);
    console.error("[KXD Staff Time] start shift failed:", error);
    return NextResponse.json(
      { success: false, error: mapped.message },
      { status: mapped.status },
    );
  }
}
