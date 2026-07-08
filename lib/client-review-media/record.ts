import path from "path";
import type { ClientReviewStorageProvider, ClientReviewStorageRef } from "./storage";

export function parseClientReviewStorageRef(
  doc: Record<string, unknown>,
): ClientReviewStorageRef | null {
  const storageKey = doc.storageKey ? String(doc.storageKey) : null;
  const legacyFilename = doc.filename ? String(doc.filename) : null;
  const key = storageKey ?? legacyFilename;

  if (!key) return null;

  const providerRaw = doc.storageProvider ? String(doc.storageProvider) : null;
  const provider: ClientReviewStorageProvider =
    providerRaw === "vercel-blob" ? "vercel-blob" : "local";

  return {
    provider,
    key,
    mimeType: String(doc.mimeType ?? "application/octet-stream"),
    originalFilename: String(doc.originalFilename ?? path.basename(key)),
  };
}
