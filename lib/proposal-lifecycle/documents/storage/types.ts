/**
 * Commercial document storage — local (dev) | vercel-blob (production).
 * Modeled on lib/client-review-media/storage. Never exposes raw Blob URLs.
 */

export type CommercialDocumentStorageProvider = "local" | "vercel-blob";

export interface CommercialDocumentUploadInput {
  /** Logical key under commercial-documents namespace. */
  key: string;
  buffer: Buffer;
  mimeType: string;
}

export interface CommercialDocumentUploadResult {
  key: string;
  provider: CommercialDocumentStorageProvider;
}

export interface CommercialDocumentOpenResult {
  body: Buffer;
  mimeType: string;
  byteLength: number;
}

export interface CommercialDocumentStorageAdapter {
  readonly provider: CommercialDocumentStorageProvider;
  upload(input: CommercialDocumentUploadInput): Promise<CommercialDocumentUploadResult>;
  open(key: string): Promise<CommercialDocumentOpenResult>;
}
