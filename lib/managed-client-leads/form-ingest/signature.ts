/**
 * HMAC helpers for managed-client form ingest.
 * Reuses CSI crypto construction; separate header names and secrets.
 */

import {
  computeCsiSignatureBase64,
  verifyCsiIngestSignature,
  type CsiSignatureVerifyResult,
} from "@/lib/client-site-intelligence/signature";
import {
  MCI_FORM_INGEST_FRESHNESS_WINDOW_SECONDS,
  MCI_FORM_SIGNATURE_HEADER,
  MCI_FORM_TIMESTAMP_HEADER,
} from "./constants";

export type MciFormSignatureVerifyResult = CsiSignatureVerifyResult;

export function buildMciFormSignedContent(
  timestampSeconds: number,
  rawBody: string,
): string {
  return `${timestampSeconds}.${rawBody}`;
}

export function computeMciFormSignatureBase64(
  secret: string,
  timestampSeconds: number,
  rawBody: string,
): string {
  return computeCsiSignatureBase64(secret, timestampSeconds, rawBody);
}

export function verifyMciFormIngestSignature(input: {
  secret: string;
  rawBody: string;
  timestampHeader: string | null | undefined;
  signatureHeader: string | null | undefined;
  nowMs?: number;
  freshnessWindowSeconds?: number;
}): MciFormSignatureVerifyResult {
  return verifyCsiIngestSignature({
    ...input,
    freshnessWindowSeconds:
      input.freshnessWindowSeconds ?? MCI_FORM_INGEST_FRESHNESS_WINDOW_SECONDS,
  });
}

export function readMciFormSignatureHeaders(headers: Headers): {
  timestampHeader: string | null;
  signatureHeader: string | null;
} {
  return {
    timestampHeader: headers.get(MCI_FORM_TIMESTAMP_HEADER),
    signatureHeader: headers.get(MCI_FORM_SIGNATURE_HEADER),
  };
}
