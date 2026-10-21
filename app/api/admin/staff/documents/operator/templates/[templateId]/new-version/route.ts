import { NextResponse } from "next/server";
import { requireStaffCapabilityApi } from "@/lib/staff/guard";
import {
  createStaffDocumentTemplateNewVersion,
  getStaffDocumentTemplateForOperator,
} from "@/lib/staff-documents/template-operator";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = { params: Promise<{ templateId: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const gated = await requireStaffCapabilityApi("admin.staff-documents.manage");
  if (gated instanceof NextResponse) return gated;

  const templateId = Number((await context.params).templateId);
  if (!templateId) {
    return NextResponse.json({ success: false, error: "Invalid template." }, { status: 400 });
  }

  try {
    const { id } = await createStaffDocumentTemplateNewVersion({
      actor: gated.actor,
      templateId,
    });
    const template = await getStaffDocumentTemplateForOperator(id);
    return NextResponse.json({ success: true, id, template });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to create new version.";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
