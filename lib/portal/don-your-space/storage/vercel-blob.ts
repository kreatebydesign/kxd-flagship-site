import { get, put } from "@vercel/blob";
import {
  assertUsableCommercialBlobCredentials,
  describeCommercialBlobCredentialState,
} from "@/lib/proposal-lifecycle/documents/storage/vercel-blob";
import { donDeliverableBlobKey } from "./keys";
import type { DonDeliverableOpenResult, DonDeliverableStorageAdapter } from "./types";

function getOptionalBlobToken(): string | undefined {
  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (token && /^vercel_blob_rw_/i.test(token) && !/^\[SENSITIVE\]/i.test(token)) {
    return token;
  }
  return undefined;
}

function withOptionalToken<T extends Record<string, unknown>>(
  options: T,
): T & { token?: string; oidcToken?: string; storeId?: string } {
  const token = getOptionalBlobToken();
  if (token) return { ...options, token };

  const oidcToken = process.env.VERCEL_OIDC_TOKEN?.trim();
  const storeId = process.env.BLOB_STORE_ID?.trim();
  if (oidcToken && storeId && !/^\[SENSITIVE\]/i.test(storeId)) {
    return { ...options, oidcToken, storeId };
  }
  return options;
}

async function streamToBuffer(
  stream: NodeJS.ReadableStream | ReadableStream<Uint8Array>,
): Promise<Buffer> {
  if (typeof (stream as ReadableStream<Uint8Array>).getReader === "function") {
    const reader = (stream as ReadableStream<Uint8Array>).getReader();
    const chunks: Uint8Array[] = [];
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) chunks.push(value);
    }
    return Buffer.concat(chunks.map((c) => Buffer.from(c)));
  }
  const nodeStream = stream as NodeJS.ReadableStream;
  const chunks: Buffer[] = [];
  for await (const chunk of nodeStream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

export function isDonDeliverableBlobConfigured(): boolean {
  return describeCommercialBlobCredentialState().canAuthenticate;
}

export const vercelBlobDonDeliverableStorageAdapter: DonDeliverableStorageAdapter = {
  provider: "vercel-blob",

  async upload(key: string, buffer: Buffer, mimeType: string): Promise<void> {
    assertUsableCommercialBlobCredentials("Don deliverable upload");
    const blobKey = donDeliverableBlobKey(key);
    await put(
      blobKey,
      buffer,
      withOptionalToken({
        access: "private" as const,
        contentType: mimeType,
        addRandomSuffix: false,
        allowOverwrite: true,
      }),
    );
  },

  async open(key: string): Promise<DonDeliverableOpenResult> {
    assertUsableCommercialBlobCredentials("Don deliverable open");
    const blobKey = donDeliverableBlobKey(key);
    const result = await get(
      blobKey,
      withOptionalToken({
        access: "private" as const,
      }),
    );
    if (!result || result.statusCode !== 200 || !result.stream) {
      throw new Error("Deliverable not found.");
    }
    const buffer = await streamToBuffer(result.stream);
    return {
      body: buffer,
      mimeType: result.blob.contentType ?? "application/octet-stream",
      byteLength: buffer.byteLength,
    };
  },
};