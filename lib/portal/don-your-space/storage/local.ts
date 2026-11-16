import { createReadStream, existsSync, readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { DON_ACCOUNTABILITY_STORAGE_DIR } from "../constants";
import { donDeliverableBlobKey } from "./keys";
import type { DonDeliverableOpenResult, DonDeliverableStorageAdapter } from "./types";

function storageRoot(): string {
  return path.join(process.cwd(), DON_ACCOUNTABILITY_STORAGE_DIR);
}

function resolveLocalPath(key: string): string {
  const base = donDeliverableBlobKey(key).split("/").pop() ?? key;
  const root = path.resolve(storageRoot());
  const filePath = path.resolve(root, base);
  if (!filePath.startsWith(root)) {
    throw new Error("Invalid storage key.");
  }
  return filePath;
}

export const localDonDeliverableStorageAdapter: DonDeliverableStorageAdapter = {
  provider: "local",

  async upload(key: string, buffer: Buffer, _mimeType: string): Promise<void> {
    const filePath = resolveLocalPath(key);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, buffer);
  },

  async open(key: string): Promise<DonDeliverableOpenResult> {
    const filePath = resolveLocalPath(key);
    if (!existsSync(filePath)) {
      throw new Error("Deliverable not found.");
    }
    const buffer = readFileSync(filePath);
    const mimeType = filePath.endsWith(".zip")
      ? "application/zip"
      : filePath.endsWith(".json")
        ? "application/json"
        : "application/pdf";
    return { body: buffer, mimeType, byteLength: buffer.byteLength };
  },
};

export function localDonDeliverableExists(key: string): boolean {
  return existsSync(resolveLocalPath(key));
}

export function openDonDeliverableLocalStream(
  key: string,
): ReturnType<typeof createReadStream> | null {
  const filePath = resolveLocalPath(key);
  if (!existsSync(filePath)) return null;
  return createReadStream(filePath);
}