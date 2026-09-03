import type {
  CommercialDocumentStorageAdapter,
  CommercialDocumentStorageProvider,
} from "./types";
import { localCommercialDocumentStorageAdapter } from "./local";
import { vercelBlobCommercialDocumentStorageAdapter } from "./vercel-blob";

/**
 * True when Vercel Blob credentials are available.
 * Same auth modes as client-review-media:
 * - BLOB_READ_WRITE_TOKEN
 * - Vercel OIDC + BLOB_STORE_ID
 */
export function isCommercialDocumentBlobConfigured(): boolean {
  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (token && !/^\[SENSITIVE\]$/i.test(token) && /^vercel_blob_rw_/i.test(token)) {
    return true;
  }
  const storeId = process.env.BLOB_STORE_ID?.trim();
  if (storeId && !/^\[SENSITIVE\]$/i.test(storeId)) return true;
  return false;
}

export function isVercelRuntime(): boolean {
  return Boolean(process.env.VERCEL || process.env.VERCEL_ENV);
}

/**
 * Select storage for new commercial-document writes.
 * On Vercel, never fall back to ephemeral local disk.
 */
export function getDefaultCommercialDocumentStorageAdapter(): CommercialDocumentStorageAdapter {
  if (isCommercialDocumentBlobConfigured()) {
    return vercelBlobCommercialDocumentStorageAdapter;
  }

  if (isVercelRuntime()) {
    throw new Error(
      "Commercial document storage is not configured on Vercel. Set BLOB_READ_WRITE_TOKEN or BLOB_STORE_ID (OIDC).",
    );
  }

  return localCommercialDocumentStorageAdapter;
}

export function getCommercialDocumentStorageAdapter(
  provider: CommercialDocumentStorageProvider,
): CommercialDocumentStorageAdapter {
  if (provider === "vercel-blob") {
    return vercelBlobCommercialDocumentStorageAdapter;
  }
  return localCommercialDocumentStorageAdapter;
}
