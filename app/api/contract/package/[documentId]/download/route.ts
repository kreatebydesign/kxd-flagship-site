import { NextRequest, NextResponse } from "next/server";
import { getPayload } from "payload";
import config from "@payload-config";
import {
  readCommercialDocumentBytes,
  verifyCommercialDocumentIntegrity,
} from "@/lib/proposal-lifecycle/documents/file";
import { hashPublicToken, timingSafeEqualHex } from "@/lib/proposal-lifecycle/hash";
import { normalizeLifecyclePackage } from "@/lib/proposal-lifecycle/package";

export const dynamic = "force-dynamic";

type CommercialDocRow = {
  id: number;
  storageKey?: string;
  storageProvider?: string | null;
  mimeType?: string;
  title?: string;
  contentHash?: string;
  kind?: string;
  contract?: number | { id: number };
};

/**
 * Client package download — requires post-seal completion token scoped to that contract.
 * Never serves files via public/media or raw storage URLs.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ documentId: string }> },
) {
  const documentId = Number((await params).documentId);
  const token = req.nextUrl.searchParams.get("token") ?? "";
  if (!documentId || token.length < 16) {
    return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });
  }

  const payload = await getPayload({ config });
  let doc: CommercialDocRow | null = null;
  try {
    doc = (await payload.findByID({
      collection: "commercial-documents" as never,
      id: documentId,
      depth: 0,
      overrideAccess: true,
    })) as unknown as CommercialDocRow;
  } catch {
    return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });
  }
  if (!doc?.storageKey) {
    return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });
  }

  const contractId =
    typeof doc.contract === "object" && doc.contract
      ? Number(doc.contract.id)
      : Number(doc.contract);
  if (!contractId) {
    return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });
  }

  let contract: { lifecyclePackage?: unknown; status?: string } | null = null;
  try {
    contract = (await payload.findByID({
      collection: "contracts" as never,
      id: contractId,
      depth: 0,
      overrideAccess: true,
    })) as unknown as { lifecyclePackage?: unknown; status?: string };
  } catch {
    return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });
  }

  const pkg = normalizeLifecyclePackage(contract?.lifecyclePackage);
  const tokenHash = hashPublicToken(token);
  if (
    !pkg.completionTokenHash ||
    !timingSafeEqualHex(pkg.completionTokenHash, tokenHash)
  ) {
    return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });
  }
  if (
    pkg.completionTokenExpiresAt &&
    Date.parse(pkg.completionTokenExpiresAt) < Date.now()
  ) {
    return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });
  }
  if (String(contract?.status) === "voided" || String(contract?.status) === "superseded") {
    return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });
  }

  const refs = pkg.documentRefs ?? [];
  if (!refs.some((r) => Number(r.id) === documentId)) {
    return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });
  }

  try {
    const buffer = await readCommercialDocumentBytes({
      storageKey: String(doc.storageKey),
      storageProvider: doc.storageProvider,
    });
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
    const safeTitle = String(doc.title ?? "document")
      .replace(/[^\w.-]+/g, "-")
      .slice(0, 80);
    const ext = doc.mimeType === "application/json" ? "json" : "pdf";
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": String(doc.mimeType ?? "application/pdf"),
        "Content-Disposition": `attachment; filename="${safeTitle}.${ext}"`,
        "Cache-Control": "no-store",
        "X-Robots-Tag": "noindex, nofollow",
        "Referrer-Policy": "no-referrer",
      },
    });
  } catch {
    return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });
  }
}
