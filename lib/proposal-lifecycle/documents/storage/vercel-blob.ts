import { get, put } from "@vercel/blob";
import type {
  CommercialDocumentOpenResult,
  CommercialDocumentStorageAdapter,
  CommercialDocumentUploadInput,
  CommercialDocumentUploadResult,
} from "./types";

function getOptionalBlobToken(): string | undefined {
  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  return token || undefined;
}

function withOptionalToken<T extends Record<string, unknown>>(
  options: T,
): T & { token?: string } {
  const token = getOptionalBlobToken();
  return token ? { ...options, token } : options;
}

export function commercialDocumentBlobPath(key: string): string {
  const normalized = key.replace(/^\/+/, "");
  return normalized.startsWith("commercial-documents/")
    ? normalized
    : `commercial-documents/${normalized}`;
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

function mimeFallback(key: string): string {
  return key.endsWith(".json") ? "application/json" : "application/pdf";
}

export const vercelBlobCommercialDocumentStorageAdapter: CommercialDocumentStorageAdapter = {
  provider: "vercel-blob",

  async upload(input: CommercialDocumentUploadInput): Promise<CommercialDocumentUploadResult> {
    const key = commercialDocumentBlobPath(input.key);
    await put(
      key,
      input.buffer,
      withOptionalToken({
        access: "private" as const,
        contentType: input.mimeType,
        addRandomSuffix: false,
        allowOverwrite: false,
      }),
    );
    return { key, provider: "vercel-blob" };
  },

  async open(key: string): Promise<CommercialDocumentOpenResult> {
    const result = await get(
      commercialDocumentBlobPath(key),
      withOptionalToken({
        access: "private" as const,
      }),
    );

    if (!result || result.statusCode !== 200 || !result.stream) {
      throw new Error("Blob unavailable.");
    }

    const buffer = await streamToBuffer(result.stream);
    return {
      body: buffer,
      mimeType: result.blob.contentType ?? mimeFallback(key),
      byteLength: buffer.byteLength,
    };
  },
};
