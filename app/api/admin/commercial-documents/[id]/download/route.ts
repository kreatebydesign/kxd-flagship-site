import { NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import { getPayload } from "payload";
import config from "@payload-config";
import {
  readCommercialDocumentFile,
  verifyCommercialDocumentIntegrity,
} from "@/lib/proposal-lifecycle/documents/file";

export const dynamic = "force-dynamic";

type CommercialDocRow = {
  storageKey?: string;
  mimeType?: string;
  title?: string;
  contentHash?: string;
  kind?: string;
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  const id = Number((await params).id);
  if (!id) {
    return NextResponse.json({ ok: false, error: "Invalid id." }, { status: 400 });
  }

  const payload = await getPayload({ config });
  let doc: CommercialDocRow | null = null;
  try {
    doc = (await payload.findByID({
      collection: "commercial-documents" as never,
      id,
      depth: 0,
      overrideAccess: true,
    })) as unknown as CommercialDocRow;
  } catch {
    return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });
  }

  if (!doc?.storageKey) {
    return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });
  }

  try {
    const buffer = readCommercialDocumentFile(String(doc.storageKey));
    const integrity = verifyCommercialDocumentIntegrity({
      buffer,
      contentHash: doc.contentHash,
      mimeType: doc.mimeType,
      kind: doc.kind,
    });
    if (!integrity.ok) {
      return NextResponse.json(
        { ok: false, error: "Document integrity check failed." },
        { status: 409 },
      );
    }
    const filename = `${String(doc.title ?? "document").replace(/[^\w.-]+/g, "-").slice(0, 80)}.${
      doc.mimeType === "application/json" ? "json" : "pdf"
    }`;
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": String(doc.mimeType ?? "application/pdf"),
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
        "X-Robots-Tag": "noindex, nofollow",
        "Referrer-Policy": "no-referrer",
      },
    });
  } catch {
    return NextResponse.json({ ok: false, error: "Document unavailable." }, { status: 404 });
  }
}
