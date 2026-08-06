import { mkdirSync, readFileSync, existsSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { resolveStoragePath } from "../storage-path";
import type {
  CommercialDocumentOpenResult,
  CommercialDocumentStorageAdapter,
  CommercialDocumentUploadInput,
  CommercialDocumentUploadResult,
} from "./types";

const STORAGE_ROOT = join(process.cwd(), "storage", "commercial-documents");

export function getCommercialDocumentsLocalRoot(): string {
  return STORAGE_ROOT;
}

export const localCommercialDocumentStorageAdapter: CommercialDocumentStorageAdapter = {
  provider: "local",

  async upload(input: CommercialDocumentUploadInput): Promise<CommercialDocumentUploadResult> {
    mkdirSync(STORAGE_ROOT, { recursive: true });
    const abs = resolveStoragePath(STORAGE_ROOT, input.key);
    mkdirSync(dirname(abs), { recursive: true });
    if (!existsSync(abs)) {
      writeFileSync(abs, input.buffer);
    }
    return { key: input.key, provider: "local" };
  },

  async open(key: string): Promise<CommercialDocumentOpenResult> {
    const abs = resolveStoragePath(STORAGE_ROOT, key);
    if (!existsSync(abs)) throw new Error("Document not found.");
    const buffer = readFileSync(abs);
    return {
      body: buffer,
      mimeType: key.endsWith(".json") ? "application/json" : "application/pdf",
      byteLength: buffer.byteLength,
    };
  },
};
