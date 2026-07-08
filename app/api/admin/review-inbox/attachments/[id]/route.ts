import { NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import { streamClientReviewAttachment } from "@/lib/website-review-inbox/serve-attachment";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  const { id: idParam } = await params;
  const mediaId = Number.parseInt(idParam, 10);
  if (!Number.isFinite(mediaId)) {
    return NextResponse.json({ ok: false, message: "Not found." }, { status: 404 });
  }

  try {
    const file = await streamClientReviewAttachment(mediaId);
    return new NextResponse(file.stream as unknown as BodyInit, {
      headers: {
        "Content-Type": file.mimeType,
        "Content-Disposition": `inline; filename="${file.filename.replace(/"/g, "")}"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (err) {
    console.error("[KXD Review Inbox] Attachment serve failed:", err);
    return NextResponse.json({ ok: false, message: "File unavailable." }, { status: 404 });
  }
}
