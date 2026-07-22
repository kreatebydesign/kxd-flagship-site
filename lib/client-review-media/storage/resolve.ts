import type { ClientReviewStorageAdapter, ClientReviewStorageProvider } from "./types";
import { localClientReviewStorageAdapter } from "./local";
import { vercelBlobClientReviewStorageAdapter } from "./vercel-blob";

/**
 * True when Vercel Blob credentials are available.
 *
 * Supported auth modes (via `@vercel/blob`):
 * - `BLOB_READ_WRITE_TOKEN`
 * - Vercel OIDC (`VERCEL_OIDC_TOKEN` / runtime OIDC) + `BLOB_STORE_ID`
 */
export function isVercelBlobStorageConfigured(): boolean {
  if (process.env.BLOB_READ_WRITE_TOKEN?.trim()) return true;
  if (process.env.BLOB_STORE_ID?.trim()) return true;
  return false;
}

function isVercelRuntime(): boolean {
  return Boolean(process.env.VERCEL || process.env.VERCEL_ENV);
}

/**
 * Select the default upload adapter.
 *
 * Local filesystem is for development only. On Vercel, never fall back to
 * local disk — serverless filesystems are not writable/persistent.
 */
export function getDefaultClientReviewStorageAdapter(): ClientReviewStorageAdapter {
  if (isVercelBlobStorageConfigured()) {
    return vercelBlobClientReviewStorageAdapter;
  }

  if (isVercelRuntime()) {
    throw new Error(
      "Client review media storage is not configured on Vercel. Set BLOB_READ_WRITE_TOKEN or BLOB_STORE_ID (OIDC).",
    );
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
