/**
 * Managed-client website form ingest webhook (Phase 3).
 *
 * Primal: POST /api/webhooks/managed-client-inquiries/primal-motorsports
 *
 * Headers:
 *   x-kxd-mci-timestamp  — unix seconds (exact integer)
 *   x-kxd-mci-signature  — v1,<base64> HMAC-SHA256 of `${timestamp}.${rawBody}`
 *
 * Receipt truth only. Does not create KXD sales opportunities or commissions.
 * Does not route through CSI.
 */
import { NextRequest, NextResponse } from "next/server";
import {
  MCI_FORM_INGEST_MAX_BODY_BYTES,
  readMciFormSignatureHeaders,
} from "@/lib/managed-client-leads/form-ingest";
import { ingestManagedClientFormWebhook } from "@/lib/managed-client-leads/form-ingest/ingest";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ clientKey: string }> };

export async function POST(req: NextRequest, context: RouteContext) {
  const { clientKey } = await context.params;

  const contentLength = req.headers.get("content-length");
  if (contentLength) {
    const n = Number(contentLength);
    if (Number.isFinite(n) && n > MCI_FORM_INGEST_MAX_BODY_BYTES) {
      return NextResponse.json(
        { ok: false, error: "Request body too large.", code: "payload_too_large" },
        { status: 413 },
      );
    }
  }

  const rawBody = await req.text();
  const { timestampHeader, signatureHeader } = readMciFormSignatureHeaders(
    req.headers,
  );

  const result = await ingestManagedClientFormWebhook({
    pathClientKey: clientKey ?? "",
    rawBody,
    timestampHeader,
    signatureHeader,
    contentTypeHeader: req.headers.get("content-type"),
  });

  return NextResponse.json(result.body, { status: result.status });
}
