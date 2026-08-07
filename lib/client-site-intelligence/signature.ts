/**
 * HMAC signature verification for Client Site Intelligence ingest.
 * Pattern aligned with Resend/KXD Sign webhook: freshness + timingSafeEqual.
 */

import { createHmac, timingSafeEqual } from "node:crypto";
import { CSI_FRESHNESS_WINDOW_SECONDS } from "./constants";

export type CsiSignatureVerifyResult =
  | { ok: true; timestampSeconds: number }
  | {
      ok: false;
      reason: "missing_headers" | "stale_timestamp" | "invalid_signature";
    };

export function buildCsiSignedContent(timestampSeconds: number, rawBody: string): string {
  return `${timestampSeconds}.${rawBody}`;
}

export function computeCsiSignatureBase64(
  secret: string,
  timestampSeconds: number,
  rawBody: string,
): string {
  return createHmac("sha256", secret)
    .update(buildCsiSignedContent(timestampSeconds, rawBody))
    .digest("base64");
}

function signaturesEqual(expected: string, candidate: string): boolean {
  try {
    const a = Buffer.from(expected);
    const b = Buffer.from(candidate);
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/**
 * Parse webhook timestamp: exact unsigned integer seconds only.
 * Rejects floats, scientific notation, empty, and non-numeric values.
 */
export function parseCsiTimestampSeconds(
  timestampHeader: string | null | undefined,
): number | null {
  const timestampRaw = timestampHeader?.trim() ?? "";
  if (!/^\d{1,12}$/.test(timestampRaw)) return null;
  const timestampSeconds = Number(timestampRaw);
  if (!Number.isSafeInteger(timestampSeconds)) return null;
  return timestampSeconds;
}

/**
 * Verify `x-kxd-csi-signature` against HMAC-SHA256(base64) of `${timestamp}.${rawBody}`.
 * Accepts `v1,<base64>` or bare base64; multiple space-separated candidates allowed.
 * Uses the exact rawBody string (never reserialized JSON).
 */
export function verifyCsiIngestSignature(input: {
  secret: string;
  rawBody: string;
  timestampHeader: string | null | undefined;
  signatureHeader: string | null | undefined;
  nowMs?: number;
  freshnessWindowSeconds?: number;
}): CsiSignatureVerifyResult {
  const signatureRaw = input.signatureHeader?.trim() ?? "";
  if (!input.timestampHeader?.trim() || !signatureRaw) {
    return { ok: false, reason: "missing_headers" };
  }

  const timestampSeconds = parseCsiTimestampSeconds(input.timestampHeader);
  if (timestampSeconds == null) {
    return { ok: false, reason: "stale_timestamp" };
  }

  const nowMs = input.nowMs ?? Date.now();
  const window = input.freshnessWindowSeconds ?? CSI_FRESHNESS_WINDOW_SECONDS;
  // Reject both stale (too old) and unreasonably future timestamps.
  if (Math.abs(nowMs / 1000 - timestampSeconds) > window) {
    return { ok: false, reason: "stale_timestamp" };
  }

  const expected = computeCsiSignatureBase64(
    input.secret,
    timestampSeconds,
    input.rawBody,
  );
  const candidates = signatureRaw
    .split(/\s+/)
    .map((part) => part.replace(/^v1,/i, "").trim())
    .filter(Boolean);

  const okSig = candidates.some((candidate) => signaturesEqual(expected, candidate));
  if (!okSig) {
    return { ok: false, reason: "invalid_signature" };
  }

  return { ok: true, timestampSeconds };
}
