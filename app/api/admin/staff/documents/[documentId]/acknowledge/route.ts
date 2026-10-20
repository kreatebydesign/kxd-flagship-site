import { NextResponse } from "next/server";
import { requireStaffCapabilityApi } from "@/lib/staff/guard";
import { acknowledgeStaffDocument } from "@/lib/staff-documents/data";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ documentId: string }> },
) {
  const gated = await requireStaffCapabilityApi("staff.documents.acknowledge");
  if (gated instanceof NextResponse) return gated;

  const documentId = Number((await context.params).documentId);
  if (!Number.isFinite(documentId) || documentId <= 0) {
    return NextResponse.json({ success: false, error: "Invalid document id." }, { status: 400 });
  }

  const body = (await request.json()) as {
    legalName?: string;
    typedAcknowledgment?: string;
    electronicRecordsConsent?: boolean;
    reviewedConfirmed?: boolean;
  };

  const forwarded = request.headers.get("x-forwarded-for");
  const ipAddress = forwarded?.split(",")[0]?.trim() || null;
  const userAgent = request.headers.get("user-agent");

  try {
    const result = await acknowledgeStaffDocument({
      actor: gated.actor,
      documentId,
      legalName: String(body.legalName ?? ""),
      typedAcknowledgment: String(body.typedAcknowledgment ?? ""),
      electronicRecordsConsent: Boolean(body.electronicRecordsConsent),
      reviewedConfirmed: Boolean(body.reviewedConfirmed),
      ipAddress,
      userAgent,
    });
    return NextResponse.json({
      success: true,
      alreadyAcknowledged: result.alreadyAcknowledged,
      document: result.detail,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to acknowledge.";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
