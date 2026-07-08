/**
 * GET /api/portal/website-review/attachments/[id]
 * Session-scoped file delivery for review attachments.
 */
import path from "path";
import { createReadStream } from "fs";
import { stat } from "fs/promises";
import { NextRequest, NextResponse } from "next/server";
import { getPayload } from "payload";
import config from "@payload-config";
import { getPortalSession } from "@/lib/portal/session";

export const dynamic = "force-dynamic";

const STATIC_ROOT = path.join(process.cwd(), "private/client-review-media");

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

    const filename = String(row.filename ?? "");
    if (!filename) {
      return NextResponse.json({ ok: false, message: "File unavailable." }, { status: 404 });
    }

    const safeName = path.basename(filename);
    const filePath = path.join(STATIC_ROOT, safeName);

    await stat(filePath);

    const mimeType = String(row.mimeType ?? "application/octet-stream");
    const originalFilename = String(row.originalFilename ?? safeName);
    const stream = createReadStream(filePath);

    return new NextResponse(stream as unknown as BodyInit, {
      headers: {
        "Content-Type": mimeType,
        "Content-Disposition": `inline; filename="${originalFilename.replace(/"/g, "")}"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (err) {
    console.error("[KXD Portal] Attachment serve failed:", err);
    return NextResponse.json({ ok: false, message: "File unavailable." }, { status: 404 });
  }
}
