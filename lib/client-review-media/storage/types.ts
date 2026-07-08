export type ClientReviewStorageProvider = "local" | "vercel-blob";

export interface ClientReviewUploadInput {
  clientId: number;
  buffer: Buffer;
  mimeType: string;
  originalFilename: string;
}

export interface ClientReviewUploadResult {
  key: string;
}

export interface ClientReviewOpenResult {
  body: Buffer | NodeJS.ReadableStream | ReadableStream<Uint8Array>;
  mimeType: string;
  filesize: number;
}

export interface ClientReviewStorageAdapter {
  readonly provider: ClientReviewStorageProvider;
  upload(input: ClientReviewUploadInput): Promise<ClientReviewUploadResult>;
  open(key: string): Promise<ClientReviewOpenResult>;
  delete(key: string): Promise<void>;
}

export interface ClientReviewStorageRef {
  provider: ClientReviewStorageProvider;
  key: string;
  mimeType: string;
  originalFilename: string;
}
