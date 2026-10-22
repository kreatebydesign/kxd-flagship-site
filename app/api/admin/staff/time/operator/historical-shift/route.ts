import { NextResponse } from "next/server";
import { requireStaffCapabilityApi } from "@/lib/staff/guard";
import { staffTimeErrorResponse } from "@/lib/staff-time/api-errors";
import { operatorCreateHistoricalCompletedShift } from "@/lib/staff-time/operator-corrections";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Operator-only: create a completed shift for a past interval (audited). */
export async function POST(request: Request) {
  const gated = await requireStaffCapabilityApi("admin.time.correct", request);
  if (gated instanceof NextResponse) return gated;

  try {
    const body = (await request.json()) as {
      staffUserId?: number | string;
      workTimezone?: string;
      startedAt?: string;
      endedAt?: string;
      reason?: string;
      workIntent?: unknown;
    };

    const staffUserId = Number(body.staffUserId);
    if (!Number.isFinite(staffUserId) || staffUserId <= 0) {
      return NextResponse.json(
        { success: false, error: "staffUserId is required." },
        { status: 400 },
      );
    }

    const workTimezone = String(body.workTimezone ?? "America/Los_Angeles").trim();
    const shift = await operatorCreateHistoricalCompletedShift({
      operator: gated.actor,
      staffUserId,
      workTimezone,
      startedAt: String(body.startedAt ?? ""),
      endedAt: String(body.endedAt ?? ""),
      reason: String(body.reason ?? ""),
      workIntent: body.workIntent as import("@/lib/staff-time/types").StaffWorkIntentInput,
    });

    return NextResponse.json({ success: true, shift });
  } catch (error) {
    const mapped = staffTimeErrorResponse(error);
    console.error("[KXD Staff Time] operator historical shift failed:", error);
    return NextResponse.json(
      { success: false, error: mapped.message },
      { status: mapped.status },
    );
  }
}
