import { NextResponse } from "next/server";
import { requireStaffCapabilityApi } from "@/lib/staff/guard";
import { signStaffDocumentAsEmployee } from "@/lib/staff-documents/data";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ documentId: string }> },
) {
  const gated = await requireStaffCapabilityApi("staff.documents.sign");
  if (gated instanceof NextResponse) return gated;

  const documentId = Number((await context.params).documentId);
  if (!Number.isFinite(documentId) || documentId <= 0) {
    return NextResponse.json({ success: false, error: "Invalid document id." }, { status: 400 });
  }

  const body = (await request.json()) as {
    legalName?: string;
    title?: string;
    entityName?: string;
    typedAcknowledgment?: string;
    authorityConfirmed?: boolean;
    electronicRecordsConsent?: boolean;
  };

  const forwarded = request.headers.get("x-forwarded-for");
  const ipAddress = forwarded?.split(",")[0]?.trim() || null;
  const userAgent = request.headers.get("user-agent");

  try {
    const result = await signStaffDocumentAsEmployee({
      actor: gated.actor,
      documentId,
      legalName: String(body.legalName ?? ""),
      title: String(body.title ?? ""),
      entityName: String(body.entityName ?? ""),
      typedAcknowledgment: String(body.typedAcknowledgment ?? ""),
      authorityConfirmed: Boolean(body.authorityConfirmed),
      electronicRecordsConsent: Boolean(body.electronicRecordsConsent),
      ipAddress,
      userAgent,
    });
    return NextResponse.json({
      success: true,
      alreadySigned: result.alreadySigned,
      document: result.detail,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to sign document.";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
