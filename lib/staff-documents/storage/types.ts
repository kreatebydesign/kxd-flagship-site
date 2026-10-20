export type StaffDocumentStorageProvider = "local" | "vercel-blob";

export interface StaffDocumentUploadInput {
  key: string;
  buffer: Buffer;
  mimeType: string;
}

export interface StaffDocumentUploadResult {
  key: string;
  provider: StaffDocumentStorageProvider;
}

export interface StaffDocumentOpenResult {
  body: Buffer;
  mimeType: string;
  byteLength: number;
}

export interface StaffDocumentStorageAdapter {
  provider: StaffDocumentStorageProvider;
  upload(input: StaffDocumentUploadInput): Promise<StaffDocumentUploadResult>;
  open(key: string): Promise<StaffDocumentOpenResult>;
}
