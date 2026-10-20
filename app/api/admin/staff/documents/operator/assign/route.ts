import { NextResponse } from "next/server";
import { requireStaffCapabilityApi } from "@/lib/staff/guard";
import { assignStaffDocumentFromTemplate } from "@/lib/staff-documents/data";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const gated = await requireStaffCapabilityApi("admin.staff-documents.manage");
  if (gated instanceof NextResponse) return gated;

  const body = (await request.json()) as {
    templateId?: number;
    staffUserId?: number;
  };

  const templateId = Number(body.templateId);
  const staffUserId = Number(body.staffUserId);
  if (!templateId || !staffUserId) {
    return NextResponse.json(
      { success: false, error: "templateId and staffUserId are required." },
      { status: 400 },
    );
  }

  try {
    const result = await assignStaffDocumentFromTemplate({
      actor: gated.actor,
      templateId,
      staffUserId,
    });
    return NextResponse.json({ success: true, documentId: result.documentId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to assign document.";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
