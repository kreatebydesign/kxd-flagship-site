import { sha256Hex, stableJsonHash } from "../hash.ts";

/** Verify on-disk bytes match the stored contentHash algorithm for that artifact kind. */
export function verifyCommercialDocumentIntegrity(input: {
  buffer: Buffer;
  contentHash?: string | null;
  mimeType?: string | null;
  kind?: string | null;
}): { ok: boolean; reason?: string } {
  if (!input.contentHash) return { ok: true };
  if (input.mimeType === "application/json") {
    try {
      const parsed = JSON.parse(input.buffer.toString("utf8"));
      if (stableJsonHash(parsed) !== input.contentHash) {
        return { ok: false, reason: "JSON content hash mismatch." };
      }
      return { ok: true };
    } catch {
      return { ok: false, reason: "Corrupt JSON document." };
    }
  }
  const byteHash = sha256Hex(input.buffer.toString("base64"));
  if (byteHash === input.contentHash) return { ok: true };
  // Accepted proposal stores canonical source hash, not PDF byte hash.
  if (input.kind === "accepted-proposal") return { ok: true };
  return { ok: false, reason: "PDF content hash mismatch." };
}
