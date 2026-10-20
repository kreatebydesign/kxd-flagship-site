import { NextResponse } from "next/server";
import { requireStaffCapabilityReadApi } from "@/lib/staff/guard";
import { readStaffDocumentFileBytes } from "@/lib/staff-documents/data";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  req: Request,
  context: { params: Promise<{ documentId: string; fileId: string }> },
) {
  const gated = await requireStaffCapabilityReadApi("staff.documents.read");
  if (gated instanceof NextResponse) return gated;

  const params = await context.params;
  const documentId = Number(params.documentId);
  const fileId = Number(params.fileId);
  if (!documentId || !fileId) {
    return NextResponse.json({ success: false, error: "Invalid id." }, { status: 400 });
  }

  const dispositionParam = new URL(req.url).searchParams.get("disposition");
  const inline = dispositionParam === "inline";

  try {
    const { buffer, mimeType, title } = await readStaffDocumentFileBytes({
      actor: gated.actor,
      fileId,
      staffDocumentId: documentId,
    });

    const filename = `${title.replace(/[^\w.-]+/g, "-").slice(0, 80)}.pdf`;
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": mimeType,
        "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${filename}"`,
        "Cache-Control": "no-store",
        "X-Robots-Tag": "noindex, nofollow",
        "Referrer-Policy": "no-referrer",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Not found.";
    const status = message.includes("permission") ? 403 : 404;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
