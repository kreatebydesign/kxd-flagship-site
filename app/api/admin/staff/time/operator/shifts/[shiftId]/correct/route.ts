import { NextResponse } from "next/server";
import { requireStaffCapabilityApi } from "@/lib/staff/guard";
import { staffTimeErrorResponse } from "@/lib/staff-time/api-errors";
import { operatorCorrectStaffShiftBounds } from "@/lib/staff-time/operator-corrections";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Operator-only: correct shift start/end with audit trail (completed or active start only). */
export async function POST(
  request: Request,
  context: { params: Promise<{ shiftId: string }> },
) {
  const gated = await requireStaffCapabilityApi("admin.time.correct", request);
  if (gated instanceof NextResponse) return gated;

  const { shiftId: shiftIdRaw } = await context.params;
  const shiftId = Number(shiftIdRaw);
  if (!Number.isFinite(shiftId) || shiftId <= 0) {
    return NextResponse.json(
      { success: false, error: "Invalid shift id." },
      { status: 400 },
    );
  }

  try {
    const body = (await request.json()) as {
      reason?: string;
      startedAt?: string | null;
      endedAt?: string | null;
    };

    const shift = await operatorCorrectStaffShiftBounds({
      operator: gated.actor,
      shiftId,
      reason: String(body.reason ?? ""),
      startedAt: body.startedAt ?? null,
      endedAt: body.endedAt ?? null,
    });

    return NextResponse.json({ success: true, shift });
  } catch (error) {
    const mapped = staffTimeErrorResponse(error);
    console.error("[KXD Staff Time] operator shift correction failed:", error);
    return NextResponse.json(
      { success: false, error: mapped.message },
      { status: mapped.status },
    );
  }
}
