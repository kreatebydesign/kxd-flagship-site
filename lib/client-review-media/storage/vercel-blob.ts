import { del, get, put } from "@vercel/blob";
import type {
  ClientReviewOpenResult,
  ClientReviewStorageAdapter,
  ClientReviewUploadInput,
  ClientReviewUploadResult,
} from "./types";
import { buildClientReviewStorageKey } from "./sanitize";

function getBlobToken(): string {
  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (!token) {
    throw new Error("BLOB_READ_WRITE_TOKEN is not configured.");
  }
  return token;
}

export const vercelBlobClientReviewStorageAdapter: ClientReviewStorageAdapter = {
  provider: "vercel-blob",

  async upload(input: ClientReviewUploadInput): Promise<ClientReviewUploadResult> {
    const key = buildClientReviewStorageKey(input.clientId, input.originalFilename);
    const token = getBlobToken();

    await put(key, input.buffer, {
      access: "private",
      token,
      contentType: input.mimeType,
      addRandomSuffix: false,
    });

    return { key };
  },

  async open(key: string): Promise<ClientReviewOpenResult> {
    const token = getBlobToken();
    const result = await get(key, { access: "private", token });

    if (!result || result.statusCode !== 200 || !result.stream) {
      throw new Error("Blob unavailable.");
    }

    return {
      body: result.stream,
      mimeType: result.blob.contentType ?? "application/octet-stream",
      filesize: result.blob.size,
    };
  },

  async delete(key: string): Promise<void> {
    const token = getBlobToken();
    await del(key, { token });
  },
};
