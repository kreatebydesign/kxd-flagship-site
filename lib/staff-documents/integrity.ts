import { hashStaffDocumentPdfBytes } from "./hash.ts";

export function verifyStaffDocumentIntegrity(input: {
  buffer: Buffer;
  contentHash?: string | null;
  mimeType?: string | null;
}): { ok: boolean; reason?: string } {
  if (!input.contentHash) return { ok: true };
  if (input.mimeType === "application/json") {
    return { ok: true };
  }
  const byteHash = hashStaffDocumentPdfBytes(input.buffer);
  if (byteHash === input.contentHash) return { ok: true };
  return { ok: false, reason: "PDF content hash mismatch." };
}
