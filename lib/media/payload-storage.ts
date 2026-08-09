/**
 * Payload `media` durable storage policy.
 *
 * Public media (CES logos, inventory, onboarding, admin library) stays on the
 * `media` collection and requires a **public** Vercel Blob store.
 *
 * `BLOB_READ_WRITE_TOKEN` is reserved for private commercial documents and
 * client-review attachments (`access: "private"`). The official Payload
 * `@payloadcms/storage-vercel-blob` adapter only uploads with public access,
 * so it cannot share that private store.
 *
 * Set `MEDIA_BLOB_READ_WRITE_TOKEN` to a distinct public Blob store token.
 * OIDC / `BLOB_STORE_ID` alone is not enough for the Payload adapter.
 */

import { bundledPublicMediaSrc } from "./bundled-public-media";

const BLOB_TOKEN_RE = /^vercel_blob_rw_([a-z\d]+)_[a-z\d]+$/i;

export const MEDIA_BLOB_TOKEN_ENV = "MEDIA_BLOB_READ_WRITE_TOKEN";
export const PRIVATE_BLOB_TOKEN_ENV = "BLOB_READ_WRITE_TOKEN";

const MISSING_PUBLIC_MEDIA_TOKEN =
  "Public Payload Media requires MEDIA_BLOB_READ_WRITE_TOKEN on a public Vercel Blob store. BLOB_READ_WRITE_TOKEN is reserved for private commercial/review files and cannot accept public media uploads. OIDC / BLOB_STORE_ID alone is not enough.";

const SHARED_STORE_TOKEN =
  "MEDIA_BLOB_READ_WRITE_TOKEN must be a public Blob store token, distinct from the private BLOB_READ_WRITE_TOKEN used for commercial documents and review attachments.";

const PRIVATE_STORE_PUBLIC_UPLOAD =
  "Public Payload Media cannot upload to the private commercial Blob store. Create a separate public Vercel Blob store and set MEDIA_BLOB_READ_WRITE_TOKEN. Keep BLOB_READ_WRITE_TOKEN unchanged for private commercial/review files.";

export function isVercelRuntime(): boolean {
  return Boolean(process.env.VERCEL || process.env.VERCEL_ENV);
}

export function privateBlobReadWriteToken(): string | undefined {
  const token = process.env[PRIVATE_BLOB_TOKEN_ENV]?.trim();
  return token || undefined;
}

export function payloadMediaBlobToken(): string | undefined {
  const token = process.env[MEDIA_BLOB_TOKEN_ENV]?.trim();
  return token || undefined;
}

export function shouldEnablePayloadMediaBlobStorage(): boolean {
  return Boolean(payloadMediaBlobToken());
}

export function vercelBlobPublicBaseUrlFromToken(token = payloadMediaBlobToken()): string | null {
  const storeId = token?.match(BLOB_TOKEN_RE)?.[1]?.toLowerCase();
  if (!storeId) return null;
  return `https://${storeId}.public.blob.vercel-storage.com`;
}

export function generatePayloadMediaFileUrl(args: {
  filename?: string | null;
  prefix?: string | null;
}): string {
  const filename = args.filename?.trim() || "";
  const bundled = filename ? bundledPublicMediaSrc(filename) : null;
  if (bundled) return bundled;

  const base = vercelBlobPublicBaseUrlFromToken();
  if (base && filename) {
    const encoded = encodeURIComponent(filename.split("/").pop() || filename);
    const prefix = (args.prefix || "").replace(/^\/+|\/+$/g, "");
    return prefix ? `${base}/${prefix}/${encoded}` : `${base}/${encoded}`;
  }

  if (filename) return `/media/${filename.replace(/^\/+/, "")}`;
  return "";
}

export function requireDurablePayloadMedia(): { ok: true } | { ok: false; error: string } {
  if (!isVercelRuntime()) return { ok: true };
  const mediaToken = payloadMediaBlobToken();
  if (!mediaToken) {
    return { ok: false, error: MISSING_PUBLIC_MEDIA_TOKEN };
  }
  const privateToken = privateBlobReadWriteToken();
  if (privateToken && mediaToken === privateToken) {
    return { ok: false, error: SHARED_STORE_TOKEN };
  }
  return { ok: true };
}

export function collectErrorText(err: unknown): string {
  const parts: string[] = [];
  const seen = new Set<unknown>();
  let current: unknown = err;
  while (current && !seen.has(current)) {
    seen.add(current);
    if (typeof current === "string") {
      parts.push(current);
      break;
    }
    if (current instanceof Error) {
      parts.push(current.message);
      current = current.cause;
      continue;
    }
    if (typeof current === "object") {
      const rec = current as Record<string, unknown>;
      if (typeof rec.message === "string") parts.push(rec.message);
      if (typeof rec.data === "string") parts.push(rec.data);
      current = rec.cause ?? rec.err ?? rec.error ?? rec.originalError;
      continue;
    }
    break;
  }
  return parts.filter(Boolean).join("\n");
}

export function explainPayloadMediaUploadFailure(err: unknown): string {
  const text = collectErrorText(err);
  if (/cannot use public access on a private store/i.test(text)) {
    return PRIVATE_STORE_PUBLIC_UPLOAD;
  }
  if (/cannot use private access on a public store/i.test(text)) {
    return SHARED_STORE_TOKEN;
  }
  const first = text.split("\n").map((line) => line.trim()).find(Boolean);
  return first
    ? `Could not store the file in Media. ${first}`
    : "Could not store the file in Media.";
}

/**
 * Durable enough to attach to onboarding / inventory.
 * On Vercel, relative `/media/*` paths are ephemeral unless they are git-bundled.
 */
export function isDurablePayloadMediaUrl(url: string | null | undefined): boolean {
  const trimmed = url?.trim() ?? "";
  if (!trimmed) return false;
  if (/^https?:\/\//i.test(trimmed)) return true;
  if (trimmed.startsWith("/media/")) {
    const rel = trimmed.slice("/media/".length);
    if (bundledPublicMediaSrc(rel)) return true;
    if (!isVercelRuntime()) return true;
  }
  return false;
}
