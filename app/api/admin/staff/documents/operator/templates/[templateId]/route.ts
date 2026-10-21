import { NextResponse } from "next/server";
import { requireStaffCapabilityApi } from "@/lib/staff/guard";
import {
  getStaffDocumentTemplateForOperator,
  transitionStaffDocumentTemplateStatus,
  updateStaffDocumentTemplateDraft,
} from "@/lib/staff-documents/template-operator";
import type { StaffDocumentTemplateStatus } from "@/lib/staff-documents/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = { params: Promise<{ templateId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const gated = await requireStaffCapabilityApi("admin.staff-documents.manage");
  if (gated instanceof NextResponse) return gated;

  const templateId = Number((await context.params).templateId);
  if (!templateId) {
    return NextResponse.json({ success: false, error: "Invalid template." }, { status: 400 });
  }

  const template = await getStaffDocumentTemplateForOperator(templateId);
  if (!template) {
    return NextResponse.json({ success: false, error: "Not found." }, { status: 404 });
  }

  return NextResponse.json({ success: true, template });
}

export async function PATCH(request: Request, context: RouteContext) {
  const gated = await requireStaffCapabilityApi("admin.staff-documents.manage");
  if (gated instanceof NextResponse) return gated;

  const templateId = Number((await context.params).templateId);
  if (!templateId) {
    return NextResponse.json({ success: false, error: "Invalid template." }, { status: 400 });
  }

  const body = (await request.json()) as {
    title?: string;
    body?: string;
    kind?: string;
    legalEntityName?: string;
    status?: StaffDocumentTemplateStatus;
  };

  try {
    if (body.status) {
      await transitionStaffDocumentTemplateStatus({
        actor: gated.actor,
        templateId,
        status: body.status,
      });
    } else {
      await updateStaffDocumentTemplateDraft({
        actor: gated.actor,
        templateId,
        title: body.title,
        body: body.body,
        kind: body.kind,
        legalEntityName: body.legalEntityName,
      });
    }
    const template = await getStaffDocumentTemplateForOperator(templateId);
    return NextResponse.json({ success: true, template });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to update template.";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
