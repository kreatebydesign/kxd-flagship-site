import { NextResponse } from "next/server";
import { requireStaffCapabilityApi } from "@/lib/staff/guard";
import { resolveStaffTimePayRequest } from "@/lib/staff-time/pay-requests";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ requestId: string }> },
) {
  const gated = await requireStaffCapabilityApi("admin.payroll.review", request);
  if (gated instanceof NextResponse) return gated;

  const { requestId: raw } = await context.params;
  const requestId = Number(raw);
  if (!Number.isFinite(requestId) || requestId <= 0) {
    return NextResponse.json({ success: false, error: "Invalid request id." }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON." }, { status: 400 });
  }

  const status = String(body.status ?? "");
  if (status !== "under_review" && status !== "resolved" && status !== "withdrawn") {
    return NextResponse.json({ success: false, error: "Invalid status." }, { status: 400 });
  }

  const resolutionKindRaw = body.resolutionKind;
  const resolutionKind =
    resolutionKindRaw === "accepted_as_recorded" ||
    resolutionKindRaw === "owner_review_scheduled" ||
    resolutionKindRaw === "rejected" ||
    resolutionKindRaw === "no_payroll_change"
      ? resolutionKindRaw
      : null;

  try {
    const updated = await resolveStaffTimePayRequest(gated.actor, {
      requestId,
      status,
      ownerNote: body.ownerNote ? String(body.ownerNote) : null,
      resolutionKind,
    });
    return NextResponse.json({
      success: true,
      request: updated,
      disclaimer:
        "Owner resolution does not import historical time or mark wages paid. Use operator time correction and external payroll separately.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update request.";
    const statusCode = message === "STAFF_PAY_REQUESTS_MIGRATION_REQUIRED" ? 503 : 400;
    return NextResponse.json({ success: false, error: message }, { status: statusCode });
  }
}
