import { NextRequest, NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import { renderProposalPreviewHtml } from "@/lib/proposal-builder/export-html";
import { getProposal, previewCanonical } from "@/lib/proposal-builder/services";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  const id = Number((await params).id);
  const proposal = await getProposal(id);
  if (!proposal) {
    return NextResponse.json({ success: false, error: "Not found." }, { status: 404 });
  }

  const canonical = previewCanonical(proposal);
  const html = renderProposalPreviewHtml(canonical);
  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
