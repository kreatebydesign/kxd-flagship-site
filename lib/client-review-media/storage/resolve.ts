import type { ClientReviewStorageAdapter, ClientReviewStorageProvider } from "./types";
import { localClientReviewStorageAdapter } from "./local";
import { vercelBlobClientReviewStorageAdapter } from "./vercel-blob";

export function isVercelBlobStorageConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim());
}

export function getDefaultClientReviewStorageAdapter(): ClientReviewStorageAdapter {
  if (isVercelBlobStorageConfigured()) {
    return vercelBlobClientReviewStorageAdapter;
  }
  return localClientReviewStorageAdapter;
}

export function getClientReviewStorageAdapter(
  provider: ClientReviewStorageProvider,
): ClientReviewStorageAdapter {
  if (provider === "vercel-blob") {
    return vercelBlobClientReviewStorageAdapter;
  }
  return localClientReviewStorageAdapter;
}
