export type DonDeliverableStorageProvider = "local" | "vercel-blob";

export interface DonDeliverableOpenResult {
  body: Buffer | NodeJS.ReadableStream | ReadableStream<Uint8Array>;
  mimeType: string;
  byteLength: number;
}

export interface DonDeliverableStorageAdapter {
  readonly provider: DonDeliverableStorageProvider;
  open(key: string): Promise<DonDeliverableOpenResult>;
  upload(key: string, buffer: Buffer, mimeType: string): Promise<void>;
}