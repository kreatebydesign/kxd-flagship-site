import { NextResponse } from "next/server";
import { requireStaffCapabilityApi } from "@/lib/staff/guard";
import { renderStaffDocumentTemplatePreviewPdf } from "@/lib/staff-documents/export-pdf";
import { hashStaffDocumentBody } from "@/lib/staff-documents/hash";
import { defaultSigningModeForKind, parseStaffDocumentKind } from "@/lib/staff-documents/validate";
import { STAFF_DOCUMENT_DEFAULT_LEGAL_ENTITY } from "@/lib/staff-documents/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const gated = await requireStaffCapabilityApi("admin.staff-documents.manage");
  if (gated instanceof NextResponse) return gated;

  const body = (await request.json()) as {
    title?: string;
    body?: string;
    kind?: string;
    legalEntityName?: string;
    templateVersion?: number;
  };

  const title = String(body.title ?? "").trim();
  const docBody = String(body.body ?? "").trim();
  if (!title || !docBody) {
    return NextResponse.json({ success: false, error: "Title and body required." }, { status: 400 });
  }

  const kind = parseStaffDocumentKind(body.kind ?? "confidentiality-nda");
  const signingMode = defaultSigningModeForKind(kind);
  const contentHash = hashStaffDocumentBody(docBody);
  const buffer = await renderStaffDocumentTemplatePreviewPdf({
    title,
    body: docBody,
    legalEntityName: body.legalEntityName?.trim() || STAFF_DOCUMENT_DEFAULT_LEGAL_ENTITY,
    templateVersion: Number(body.templateVersion ?? 1),
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
