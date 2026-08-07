/**
 * Client Site Intelligence ingest webhook (csi-v1-a).
 *
 * Per-clientKey path binding + HMAC credential registry.
 * OTP Carts: POST /api/webhooks/client-site/otp-carts
 *
 * Headers:
 *   x-kxd-csi-timestamp  — unix seconds (exact integer)
 *   x-kxd-csi-signature  — v1,<base64> HMAC-SHA256 of `${timestamp}.${rawBody}`
 *
 * Server-only. Secrets never exposed to browser bundles.
 * HMAC uses the exact raw request body from req.text() — never reserialized JSON.
 */
import { NextRequest, NextResponse } from "next/server";
import {
  CSI_MAX_BODY_BYTES,
  ingestClientSiteWebhook,
  readCsiSignatureHeaders,
} from "@/lib/client-site-intelligence";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ clientKey: string }> };

export async function POST(req: NextRequest, context: RouteContext) {
  const { clientKey } = await context.params;

  const contentLength = req.headers.get("content-length");
  if (contentLength) {
    const n = Number(contentLength);
    if (Number.isFinite(n) && n > CSI_MAX_BODY_BYTES) {
      return NextResponse.json(
        { ok: false, error: "Request body too large.", code: "payload_too_large" },
        { status: 413 },
      );
    }
  }

  // Exact raw body for HMAC — do not parse/restringify before verification.
  const rawBody = await req.text();
  const { timestampHeader, signatureHeader } = readCsiSignatureHeaders(req.headers);

  const result = await ingestClientSiteWebhook({
    pathClientKey: clientKey ?? "",
    rawBody,
    timestampHeader,
    signatureHeader,
    contentTypeHeader: req.headers.get("content-type"),
  });

  return NextResponse.json(result.body, { status: result.status });
}
