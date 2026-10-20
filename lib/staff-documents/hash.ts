import { sha256Hex } from "@/lib/proposal-lifecycle/hash";

export function hashStaffDocumentBody(body: string): string {
  return sha256Hex(body.trim());
}

export function hashStaffDocumentPdfBytes(buffer: Buffer): string {
  return sha256Hex(buffer.toString("base64"));
}
