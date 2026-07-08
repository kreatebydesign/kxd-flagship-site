import path from "path";
import { createReadStream } from "fs";
import { mkdir, stat, unlink, writeFile } from "fs/promises";
import type {
  ClientReviewOpenResult,
  ClientReviewStorageAdapter,
  ClientReviewUploadInput,
  ClientReviewUploadResult,
} from "./types";
import { buildClientReviewStorageKey } from "./sanitize";

const LOCAL_ROOT = path.join(process.cwd(), "private/client-review-media");

function resolveLocalPath(key: string): string {
  const normalized = key.replace(/\\/g, "/");
  const relative = normalized.startsWith("client-review-media/")
    ? normalized.slice("client-review-media/".length)
    : path.basename(normalized);

  const filePath = path.resolve(LOCAL_ROOT, relative);
  if (!filePath.startsWith(LOCAL_ROOT)) {
    throw new Error("Invalid storage key.");
  }

  return filePath;
}

export const localClientReviewStorageAdapter: ClientReviewStorageAdapter = {
  provider: "local",

  async upload(input: ClientReviewUploadInput): Promise<ClientReviewUploadResult> {
    const key = buildClientReviewStorageKey(input.clientId, input.originalFilename);
    const filePath = resolveLocalPath(key);

    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, input.buffer);

    return { key };
  },

  async open(key: string): Promise<ClientReviewOpenResult> {
    const filePath = resolveLocalPath(key);
    const fileStat = await stat(filePath);

    return {
      body: createReadStream(filePath),
      mimeType: "application/octet-stream",
      filesize: fileStat.size,
    };
  },

  async delete(key: string): Promise<void> {
    const filePath = resolveLocalPath(key);
    await unlink(filePath);
  },
};
