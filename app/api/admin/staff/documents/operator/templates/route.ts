import { NextResponse } from "next/server";
import { requireStaffCapabilityApi } from "@/lib/staff/guard";
import {
  createStaffDocumentTemplate,
  listStaffDocumentTemplatesForOperator,
  updateStaffDocumentTemplateStatus,
} from "@/lib/staff-documents/data";
import type { StaffDocumentTemplateStatus } from "@/lib/staff-documents/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const gated = await requireStaffCapabilityApi("admin.staff-documents.manage");
  if (gated instanceof NextResponse) return gated;

  const templates = await listStaffDocumentTemplatesForOperator();
  return NextResponse.json({ success: true, templates });
}

export async function POST(request: Request) {
  const gated = await requireStaffCapabilityApi("admin.staff-documents.manage");
  if (gated instanceof NextResponse) return gated;

  const body = (await request.json()) as {
    title?: string;
    body?: string;
    useSample?: boolean;
    kind?: string;
    legalEntityName?: string;
  };

  try {
    const created = await createStaffDocumentTemplate({
      actor: gated.actor,
      title: String(body.title ?? ""),
      body: String(body.body ?? ""),
      kind: body.kind,
      useSample: Boolean(body.useSample),
      legalEntityName: body.legalEntityName,
    });
    return NextResponse.json({ success: true, id: created.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to create template.";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  const gated = await requireStaffCapabilityApi("admin.staff-documents.manage");
  if (gated instanceof NextResponse) return gated;

  const body = (await request.json()) as {
    templateId?: number;
    status?: StaffDocumentTemplateStatus;
  };
  const templateId = Number(body.templateId);
  if (!templateId) {
    return NextResponse.json({ success: false, error: "templateId required." }, { status: 400 });
  }

  try {
    await updateStaffDocumentTemplateStatus({
      actor: gated.actor,
      templateId,
      status: body.status ?? "draft",
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to update template.";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
