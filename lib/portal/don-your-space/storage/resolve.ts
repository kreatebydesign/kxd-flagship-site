import "server-only";

import { isCommercialDocumentBlobConfigured } from "@/lib/proposal-lifecycle/documents/storage/resolve";
import { localDonDeliverableStorageAdapter } from "./local";
import { isDonDeliverableBlobConfigured, vercelBlobDonDeliverableStorageAdapter } from "./vercel-blob";
import type { DonDeliverableStorageAdapter } from "./types";

function isVercelRuntime(): boolean {
  return Boolean(process.env.VERCEL || process.env.VERCEL_ENV);
}

/**
 * Prefer private Vercel Blob when configured. Local disk is dev-only.
 */
export function getDonDeliverableStorageAdapter(): DonDeliverableStorageAdapter {
  if (isDonDeliverableBlobConfigured() || isCommercialDocumentBlobConfigured()) {
    return vercelBlobDonDeliverableStorageAdapter;
  }
  if (isVercelRuntime()) {
    throw new Error(
      "Don Your Space deliverables are not configured on Vercel. Set BLOB_READ_WRITE_TOKEN or BLOB_STORE_ID (OIDC), then upload via scripts/upload-don-your-space-deliverables-blob.ts.",
    );
  }
  return localDonDeliverableStorageAdapter;
}