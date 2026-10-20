import { mkdirSync, readFileSync, existsSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { resolveStoragePath } from "@/lib/proposal-lifecycle/documents/storage-path";
import type {
  StaffDocumentOpenResult,
  StaffDocumentStorageAdapter,
  StaffDocumentUploadInput,
  StaffDocumentUploadResult,
} from "./types.ts";

const STORAGE_ROOT = join(process.cwd(), "storage", "staff-documents");

export function getStaffDocumentsLocalRoot(): string {
  return STORAGE_ROOT;
}

export const localStaffDocumentStorageAdapter: StaffDocumentStorageAdapter = {
  provider: "local",

  async upload(input: StaffDocumentUploadInput): Promise<StaffDocumentUploadResult> {
    mkdirSync(STORAGE_ROOT, { recursive: true });
    const abs = resolveStoragePath(STORAGE_ROOT, input.key);
    mkdirSync(dirname(abs), { recursive: true });
    if (!existsSync(abs)) {
      writeFileSync(abs, input.buffer);
    }
    return { key: input.key, provider: "local" };
  },

  async open(key: string): Promise<StaffDocumentOpenResult> {
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
