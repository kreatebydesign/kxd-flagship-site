import { NextRequest, NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import { getProposalPreviewHtmlForOperator } from "@/lib/proposal-builder/preview-html";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requirePayloadAdminApi(request);
  if (auth instanceof NextResponse) return auth;

  const id = Number((await params).id);
  const html = await getProposalPreviewHtmlForOperator(id);
  if (!html) {
    return NextResponse.json({ success: false, error: "Not found." }, { status: 404 });
  }

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Frame-Options": "SAMEORIGIN",
    },
  });
}
