import { NextRequest, NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import { resolveClientFacingProposal } from "@/lib/proposal-builder/canonicalize";
import { renderProposalPdf } from "@/lib/proposal-builder/export-pdf";
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

  const canonical =
    resolveClientFacingProposal(proposal as Parameters<typeof resolveClientFacingProposal>[0], {
      allowLiveDraft: true,
    }) || previewCanonical(proposal);
  const { buffer, filename } = await renderProposalPdf(canonical);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
