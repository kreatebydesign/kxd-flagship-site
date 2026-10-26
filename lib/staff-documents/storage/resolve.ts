import { isCommercialDocumentBlobConfigured } from "@/lib/proposal-lifecycle/documents/storage/resolve";
import { vercelBlobCommercialDocumentStorageAdapter } from "@/lib/proposal-lifecycle/documents/storage/vercel-blob";
import { localStaffDocumentStorageAdapter } from "./local.ts";
import type { StaffDocumentStorageAdapter, StaffDocumentStorageProvider } from "./types.ts";

export function isVercelRuntime(): boolean {
  return Boolean(process.env.VERCEL);
}

export function getDefaultStaffDocumentStorageAdapter(): StaffDocumentStorageAdapter {
  if (isVercelRuntime() && isCommercialDocumentBlobConfigured()) {
    return wrapCommercialAdapterAsStaff();
  }
  return localStaffDocumentStorageAdapter;
}

/** Open or write using the provider recorded on the staff_document_files row. */
export function getStaffDocumentStorageAdapter(
  provider: StaffDocumentStorageProvider,
): StaffDocumentStorageAdapter {
  if (provider === "vercel-blob") {
    return wrapCommercialAdapterAsStaff();
  }
  return localStaffDocumentStorageAdapter;
}

function wrapCommercialAdapterAsStaff(): StaffDocumentStorageAdapter {
  const blob = vercelBlobCommercialDocumentStorageAdapter;
  return {
    provider: "vercel-blob",
    upload: async (input) => {
      const result = await blob.upload(input);
      return { key: result.key, provider: "vercel-blob" as StaffDocumentStorageProvider };
    },
    open: async (key) => blob.open(key),
  };
}
