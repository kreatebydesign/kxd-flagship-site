/**
 * GET /api/portal/website-review/attachments/[id]
 * Session-scoped file delivery for review attachments.
 */
import { NextRequest, NextResponse } from "next/server";
import { getPayload } from "payload";
import config from "@payload-config";
import { openClientReviewMedia } from "@/lib/client-review-media/serve";
import { getPortalSession } from "@/lib/portal/session";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getPortalSession();
  if (!session) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }

  const { id: idParam } = await params;
  const mediaId = Number.parseInt(idParam, 10);
  if (!Number.isFinite(mediaId)) {
    return NextResponse.json({ ok: false, message: "Not found." }, { status: 404 });
  }

  try {
    const payload = await getPayload({ config });
    const doc = await payload.findByID({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "client-review-media" as any,
      id: mediaId,
      depth: 0,
      overrideAccess: true,
    });

    const row = doc as Record<string, unknown>;
    const rowClientId =
      typeof row.client === "number"
        ? row.client
        : (row.client as { id?: number } | undefined)?.id;

    if (rowClientId !== session.clientId) {
      return NextResponse.json({ ok: false, message: "Not found." }, { status: 404 });
    }

    const opened = await openClientReviewMedia(row);

    return new NextResponse(opened.body as unknown as BodyInit, {
      headers: {
        "Content-Type": opened.mimeType,
        "Content-Disposition": `inline; filename="${opened.filename.replace(/"/g, "")}"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (err) {
    console.error("[KXD Portal] Attachment serve failed:", err);
    return NextResponse.json({ ok: false, message: "File unavailable." }, { status: 404 });
  }
}
