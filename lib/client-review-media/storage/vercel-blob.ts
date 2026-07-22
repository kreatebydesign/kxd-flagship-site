import { del, get, put } from "@vercel/blob";
import type {
  ClientReviewOpenResult,
  ClientReviewStorageAdapter,
  ClientReviewUploadInput,
  ClientReviewUploadResult,
} from "./types";
import { buildClientReviewStorageKey } from "./sanitize";

/**
 * Optional explicit read-write token. When omitted, `@vercel/blob` resolves
 * credentials from `BLOB_READ_WRITE_TOKEN` or Vercel OIDC + `BLOB_STORE_ID`.
 */
function getOptionalBlobToken(): string | undefined {
  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  return token || undefined;
}

function withOptionalToken<T extends Record<string, unknown>>(
  options: T,
): T & { token?: string } {
  const token = getOptionalBlobToken();
  return token ? { ...options, token } : options;
}

export const vercelBlobClientReviewStorageAdapter: ClientReviewStorageAdapter = {
  provider: "vercel-blob",

  async upload(input: ClientReviewUploadInput): Promise<ClientReviewUploadResult> {
    const key = buildClientReviewStorageKey(input.clientId, input.originalFilename);

    await put(
      key,
      input.buffer,
      withOptionalToken({
        access: "private" as const,
        contentType: input.mimeType,
        addRandomSuffix: false,
      }),
    );

    return { key };
  },

  async open(key: string): Promise<ClientReviewOpenResult> {
    const result = await get(
      key,
      withOptionalToken({
        access: "private" as const,
      }),
    );

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
    const token = getOptionalBlobToken();
    await del(key, token ? { token } : undefined);
  },
};
