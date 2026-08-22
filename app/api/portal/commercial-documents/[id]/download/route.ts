/**
 * GET /api/portal/commercial-documents/[id]/download
 * Session-scoped commercial document delivery for executed agreements and certificates.
 */
import { NextResponse } from "next/server";
import {
  readCommercialDocumentBytes,
  verifyCommercialDocumentIntegrity,
} from "@/lib/proposal-lifecycle/documents/file";
import { verifyPortalCommercialDocumentAccess } from "@/lib/portal/commercial";
import { getPortalSession } from "@/lib/portal/session";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getPortalSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const id = Number((await params).id);
  if (!id) {
    return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });
  }

  const dispositionParam = new URL(req.url).searchParams.get("disposition");
  const inline = dispositionParam === "inline";

  const access = await verifyPortalCommercialDocumentAccess({
    documentId: id,
    clientId: session.clientId,
  });
  if (!access.ok) {
    return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });
  }

  try {
    const buffer = await readCommercialDocumentBytes({
      storageKey: access.storageKey,
      storageProvider: access.storageProvider,
    });
    const integrity = verifyCommercialDocumentIntegrity({
      buffer,
      contentHash: access.contentHash,
      mimeType: access.mimeType,
      kind: access.kind,
    });
    if (!integrity.ok) {
      return NextResponse.json(
        { ok: false, error: "Document unavailable." },
        { status: 409 },
      );
    }

    const filename = `${String(access.title ?? "document").replace(/[^\w.-]+/g, "-").slice(0, 80)}.${
      access.mimeType === "application/json" ? "json" : "pdf"
    }`;

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": String(access.mimeType ?? "application/pdf"),
        "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${filename}"`,
        "Cache-Control": "private, no-store",
        "X-Robots-Tag": "noindex, nofollow",
        "Referrer-Policy": "no-referrer",
      },
    });
  } catch {
    return NextResponse.json({ ok: false, error: "Document unavailable." }, { status: 404 });
  }
}
