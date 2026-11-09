import { NextResponse } from "next/server";
import { requireStaffCapabilityApi } from "@/lib/staff/guard";
import {
  createStaffTimePayRequest,
} from "@/lib/staff-time/pay-requests";
import type { CreateStaffTimePayRequestInput } from "@/lib/staff-time/pay-request-validation";
import type { StaffTimePayRequestKind } from "@/lib/staff-pay/employee-view-types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function parseKind(value: unknown): StaffTimePayRequestKind | null {
  if (
    value === "shift_acknowledgment" ||
    value === "correction_dispute" ||
    value === "historical_backfill"
  ) {
    return value;
  }
  return null;
}

export async function POST(request: Request) {
  const gated = await requireStaffCapabilityApi("staff.time.read.self", request);
  if (gated instanceof NextResponse) return gated;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON." }, { status: 400 });
  }

  const requestKind = parseKind(body.requestKind);
  if (!requestKind) {
    return NextResponse.json({ success: false, error: "Invalid request type." }, { status: 400 });
  }

  const input: CreateStaffTimePayRequestInput = {
    requestKind,
    localDateKey: String(body.localDateKey ?? ""),
    shiftId: body.shiftId != null ? Number(body.shiftId) : null,
    payPeriodId: body.payPeriodId != null ? Number(body.payPeriodId) : null,
    proposedStartAt: body.proposedStartAt ? String(body.proposedStartAt) : null,
    proposedEndAt: body.proposedEndAt ? String(body.proposedEndAt) : null,
    employeeNote: String(body.employeeNote ?? ""),
  };

  try {
    const created = await createStaffTimePayRequest(gated.actor, input);
    return NextResponse.json({
      success: true,
      request: created,
      disclaimer: "Submission is not payroll approval and does not change recorded shifts.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not submit request.";
    const status =
      message === "STAFF_PAY_REQUESTS_MIGRATION_REQUIRED"
        ? 503
        : message.includes("FORBIDDEN") || message === "SHIFT_NOT_FOUND"
          ? 403
          : 400;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
