import "server-only";

import { getClientReviewStorageAdapter } from "./storage";
import { parseClientReviewStorageRef } from "./record";

export interface OpenClientReviewMediaResult {
  body: Buffer | NodeJS.ReadableStream | ReadableStream<Uint8Array>;
  mimeType: string;
  filename: string;
}

export async function openClientReviewMedia(
  doc: Record<string, unknown>,
): Promise<OpenClientReviewMediaResult> {
  const ref = parseClientReviewStorageRef(doc);
  if (!ref) {
    throw new Error("File unavailable.");
  }

  const adapter = getClientReviewStorageAdapter(ref.provider);
  const opened = await adapter.open(ref.key);

  return {
    body: opened.body,
    mimeType: ref.mimeType || opened.mimeType,
    filename: ref.originalFilename,
  };
}
