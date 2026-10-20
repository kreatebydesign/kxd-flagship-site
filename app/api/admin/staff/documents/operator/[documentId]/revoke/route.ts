import { NextResponse } from "next/server";
import { requireStaffCapabilityApi } from "@/lib/staff/guard";
import { revokeStaffDocumentAsOperator } from "@/lib/staff-documents/data";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ documentId: string }> },
) {
  const gated = await requireStaffCapabilityApi("admin.staff-documents.manage");
  if (gated instanceof NextResponse) return gated;

  const documentId = Number((await context.params).documentId);
  if (!Number.isFinite(documentId) || documentId <= 0) {
    return NextResponse.json({ success: false, error: "Invalid document id." }, { status: 400 });
  }

  const body = (await request.json()) as { reason?: string };

  try {
    const result = await revokeStaffDocumentAsOperator({
      actor: gated.actor,
      documentId,
      reason: body.reason,
    });
    return NextResponse.json({ success: true, document: result.detail });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to revoke.";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
