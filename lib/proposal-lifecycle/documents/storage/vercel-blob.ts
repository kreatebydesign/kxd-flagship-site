import { get, put } from "@vercel/blob";
import type {
  CommercialDocumentOpenResult,
  CommercialDocumentStorageAdapter,
  CommercialDocumentUploadInput,
  CommercialDocumentUploadResult,
} from "./types";

function isPlaceholderEnvValue(value: string): boolean {
  return /^\[SENSITIVE\]/i.test(value);
}

function getOptionalBlobToken(): string | undefined {
  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (!token || isPlaceholderEnvValue(token) || !/^vercel_blob_rw_/i.test(token)) {
    return undefined;
  }
  return token;
}

export type CommercialBlobCredentialState = {
  readWriteTokenPresent: boolean;
  readWriteTokenRejected: boolean;
  readWriteTokenFormatValid: boolean;
  storeIdPresent: boolean;
  storeIdRejected: boolean;
  oidcTokenPresent: boolean;
  /** True when put/get can authenticate (RW token or OIDC + store id). */
  canAuthenticate: boolean;
};

/** Safe diagnostics for repair scripts — never includes secret values. */
export function describeCommercialBlobCredentialState(): CommercialBlobCredentialState {
  const rawToken = process.env.BLOB_READ_WRITE_TOKEN?.trim() ?? "";
  const rawStoreId = process.env.BLOB_STORE_ID?.trim() ?? "";
  const oidcToken = process.env.VERCEL_OIDC_TOKEN?.trim() ?? "";

  const readWriteTokenPresent = rawToken.length > 0;
  const readWriteTokenRejected =
    readWriteTokenPresent &&
    (isPlaceholderEnvValue(rawToken) || !/^vercel_blob_rw_/i.test(rawToken));
  const readWriteTokenFormatValid =
    readWriteTokenPresent && !readWriteTokenRejected;

  const storeIdPresent = rawStoreId.length > 0;
  const storeIdRejected = storeIdPresent && isPlaceholderEnvValue(rawStoreId);

  const oidcTokenPresent = oidcToken.length > 0;
  const canAuthenticate =
    readWriteTokenFormatValid ||
    (oidcTokenPresent && storeIdPresent && !storeIdRejected);

  return {
    readWriteTokenPresent,
    readWriteTokenRejected,
    readWriteTokenFormatValid,
    storeIdPresent,
    storeIdRejected,
    oidcTokenPresent,
    canAuthenticate,
  };
}

/**
 * Runtime adapter selection (Vercel may use OIDC without an explicit env token).
 * Repair scripts should use {@link assertUsableCommercialBlobCredentials} instead.
 */
export function isCommercialDocumentBlobConfiguredForRuntime(): boolean {
  const state = describeCommercialBlobCredentialState();
  if (state.canAuthenticate) return true;
  const storeId = process.env.BLOB_STORE_ID?.trim() ?? "";
  if (
    storeId &&
    !isPlaceholderEnvValue(storeId) &&
    Boolean(process.env.VERCEL || process.env.VERCEL_ENV)
  ) {
    return true;
  }
  return false;
}

export function assertUsableCommercialBlobCredentials(context: string): void {
  const state = describeCommercialBlobCredentialState();
  if (state.canAuthenticate) return;
  const reasons: string[] = [];
  if (state.readWriteTokenRejected) {
    reasons.push("BLOB_READ_WRITE_TOKEN is missing, placeholder, or invalid format");
  } else if (!state.readWriteTokenFormatValid && !state.oidcTokenPresent) {
    reasons.push("BLOB_READ_WRITE_TOKEN not set");
  }
  if (state.storeIdRejected) {
    reasons.push("BLOB_STORE_ID is a placeholder");
  }
  if (state.oidcTokenPresent && (!state.storeIdPresent || state.storeIdRejected)) {
    reasons.push("VERCEL_OIDC_TOKEN set but BLOB_STORE_ID is missing or invalid");
  }
  if (!state.oidcTokenPresent && !state.readWriteTokenFormatValid && state.storeIdPresent) {
    reasons.push("BLOB_STORE_ID alone requires VERCEL_OIDC_TOKEN for local repair");
  }
  throw new Error(
    [`${context}: Vercel Blob credentials are not usable.`, ...reasons].join("\n"),
  );
}

function withOptionalToken<T extends Record<string, unknown>>(
  options: T,
): T & { token?: string; oidcToken?: string; storeId?: string } {
  const token = getOptionalBlobToken();
  if (token) return { ...options, token };

  const oidcToken = process.env.VERCEL_OIDC_TOKEN?.trim();
  const storeId = process.env.BLOB_STORE_ID?.trim();
  if (
    oidcToken &&
    storeId &&
    !/^\[SENSITIVE\]/i.test(storeId)
  ) {
    return { ...options, oidcToken, storeId };
  }

  return options;
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

/** Idempotent repair uploads (same private key, verified bytes). */
export async function uploadCommercialDocumentBlobRepair(
  input: CommercialDocumentUploadInput,
): Promise<CommercialDocumentUploadResult> {
  assertUsableCommercialBlobCredentials("uploadCommercialDocumentBlobRepair");
  const key = commercialDocumentBlobPath(input.key);
  await put(
    key,
    input.buffer,
    withOptionalToken({
      access: "private" as const,
      contentType: input.mimeType,
      addRandomSuffix: false,
      allowOverwrite: true,
    }),
  );
  return { key, provider: "vercel-blob" };
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
