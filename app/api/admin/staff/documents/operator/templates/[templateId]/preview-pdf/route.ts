import { NextResponse } from "next/server";
import { requireStaffCapabilityApi } from "@/lib/staff/guard";
import { getStaffDocumentTemplateForOperator } from "@/lib/staff-documents/template-operator";
import { renderStaffDocumentTemplatePreviewPdf } from "@/lib/staff-documents/export-pdf";
import { hashStaffDocumentBody } from "@/lib/staff-documents/hash";
import { defaultSigningModeForKind, parseStaffDocumentKind } from "@/lib/staff-documents/validate";
import { STAFF_DOCUMENT_DEFAULT_LEGAL_ENTITY } from "@/lib/staff-documents/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = { params: Promise<{ templateId: string }> };

export async function POST(request: Request, context: RouteContext) {
  const gated = await requireStaffCapabilityApi("admin.staff-documents.manage");
  if (gated instanceof NextResponse) return gated;

  const templateId = Number((await context.params).templateId);
  const body = (await request.json().catch(() => ({}))) as {
    title?: string;
    body?: string;
    kind?: string;
    legalEntityName?: string;
    templateVersion?: number;
  };

  let title = String(body.title ?? "").trim();
  let docBody = String(body.body ?? "").trim();
  let kind = body.kind ? parseStaffDocumentKind(body.kind) : "policy-acknowledgment";
  let legalEntityName = body.legalEntityName?.trim() || STAFF_DOCUMENT_DEFAULT_LEGAL_ENTITY;
  let version = Number(body.templateVersion ?? 1);
  let signingMode = defaultSigningModeForKind(kind);

  if (templateId > 0 && !docBody) {
    const template = await getStaffDocumentTemplateForOperator(templateId);
    if (!template) {
      return NextResponse.json({ success: false, error: "Not found." }, { status: 404 });
    }
    title = template.title;
    docBody = template.body;
    kind = template.kind;
    legalEntityName = template.legalEntityName;
    version = template.version;
    signingMode = template.signingMode;
  }

  if (!title || !docBody) {
    return NextResponse.json({ success: false, error: "Title and body required." }, { status: 400 });
  }

  const contentHash = hashStaffDocumentBody(docBody);
  const buffer = await renderStaffDocumentTemplatePreviewPdf({
    title,
    body: docBody,
    legalEntityName,
    templateVersion: version,
    contentHash,
    kind,
    signingMode,
  });

  const filename = `${title.replace(/[^\w.-]+/g, "_").slice(0, 80)}-preview.pdf`;
  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
