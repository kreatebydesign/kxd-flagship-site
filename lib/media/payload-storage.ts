/**
 * Payload `media` durable storage policy.
 *
 * Public media (CES logos, inventory, onboarding, admin library) stays on the
 * `media` collection. Production durability uses the official Payload Vercel
 * Blob adapter — the same Blob store as commercial documents and client-review
 * attachments. Those private adapters are unchanged.
 *
 * The official adapter requires `BLOB_READ_WRITE_TOKEN` (it cannot enable on
 * OIDC + `BLOB_STORE_ID` alone). Omit an empty token so the plugin stays
 * disabled locally instead of falling back unsafely.
 */

import { bundledPublicMediaSrc } from "./bundled-public-media";

const BLOB_TOKEN_RE = /^vercel_blob_rw_([a-z\d]+)_[a-z\d]+$/i;

export function isVercelRuntime(): boolean {
  return Boolean(process.env.VERCEL || process.env.VERCEL_ENV);
}

export function payloadMediaBlobToken(): string | undefined {
  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
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
  if (isVercelRuntime() && !shouldEnablePayloadMediaBlobStorage()) {
    return {
      ok: false,
      error:
        "Payload Media storage is not configured on Vercel. Set BLOB_READ_WRITE_TOKEN before importing or uploading media. OIDC / BLOB_STORE_ID alone is not enough for the Payload adapter.",
    };
  }
  return { ok: true };
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
