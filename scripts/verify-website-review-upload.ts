/**
 * Website Review attachment upload — focused regression verification.
 *
 * Covers storage selection, MIME handling, auth/isolation contracts, and
 * optional local filesystem upload when blob credentials are absent.
 *
 * Live Vercel Blob / authenticated portal HTTP upload is exercised only when
 * credentials are available; otherwise the blocked boundary is reported.
 *
 * Run: npm run verify:website-review-upload
 */
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import {
  isWebsiteReviewMimeAllowed,
  resolveWebsiteReviewMimeType,
  WEBSITE_REVIEW_MAX_FILE_BYTES,
} from "../lib/ces/modules/website-review/attachments";
import {
  getDefaultClientReviewStorageAdapter,
  isVercelBlobStorageConfigured,
} from "../lib/client-review-media/storage/resolve";
import { localClientReviewStorageAdapter } from "../lib/client-review-media/storage/local";
import { buildClientReviewStorageKey } from "../lib/client-review-media/storage/sanitize";

const root = process.cwd();
let failures = 0;

function check(label: string, pass: boolean) {
  console.log(pass ? `  ✔ ${label}` : `  ✗ ${label}`);
  if (!pass) failures += 1;
}

function read(rel: string) {
  return readFileSync(path.join(root, rel), "utf8");
}

function withEnv(patch: Record<string, string | undefined>, fn: () => void): void {
  const previous: Record<string, string | undefined> = {};
  for (const key of Object.keys(patch)) {
    previous[key] = process.env[key];
    const value = patch[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  try {
    fn();
  } finally {
    for (const key of Object.keys(patch)) {
      const value = previous[key];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

function tinyPng(): Buffer {
  return Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64",
  );
}

function tinyJpeg(): Buffer {
  return Buffer.from(
    "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAGcP//EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAQUCf//EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQMBAT8Bf//EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQIBAT8Bf//Z",
    "base64",
  );
}

async function main() {
  console.log("\nWebsite Review upload — verify:website-review-upload\n");

  const uploadRoute = read("app/api/portal/website-review/upload/route.ts");
  const attachmentZone = read(
    "components/ces/modules/website-review/WebsiteReviewAttachmentZone.tsx",
  );
  const resolveSrc = read("lib/client-review-media/storage/resolve.ts");
  const blobSrc = read("lib/client-review-media/storage/vercel-blob.ts");
  const attachmentsServer = read(
    "lib/ces/modules/website-review/attachments-server.ts",
  );
  const submitRoute = read("app/api/portal/website-review/route.ts");
  const serveRoute = read(
    "app/api/portal/website-review/attachments/[id]/route.ts",
  );

  console.log("Source contracts");
  check(
    "upload route uses getPortalSession (no trusted clientId body field)",
    uploadRoute.includes("getPortalSession()") &&
      !uploadRoute.includes('formData.get("clientId")'),
  );
  check(
    "upload route uses FormData field name `file`",
    uploadRoute.includes('formData.get("file")'),
  );
  check(
    "client zone posts to /api/portal/website-review/upload with FormData file",
    attachmentZone.includes('"/api/portal/website-review/upload"') &&
      attachmentZone.includes('formData.append("file", file)'),
  );
  check(
    "client + server share resolveWebsiteReviewMimeType",
    attachmentZone.includes("resolveWebsiteReviewMimeType") &&
      uploadRoute.includes("resolveWebsiteReviewMimeType"),
  );
  check(
    "Vercel runtime never falls back to local disk",
    resolveSrc.includes("isVercelRuntime") &&
      resolveSrc.includes("storage is not configured on Vercel"),
  );
  check(
    "blob adapter configured when BLOB_STORE_ID or BLOB_READ_WRITE_TOKEN present",
    resolveSrc.includes("BLOB_STORE_ID") &&
      resolveSrc.includes("BLOB_READ_WRITE_TOKEN"),
  );
  check(
    "blob adapter does not hard-require token (OIDC path allowed)",
    blobSrc.includes("getOptionalBlobToken") &&
      !blobSrc.includes("BLOB_READ_WRITE_TOKEN is not configured."),
  );
  check(
    "attachment linking validates client ownership",
    attachmentsServer.includes("does not belong to client") &&
      attachmentsServer.includes("linkAttachmentsToRequest"),
  );
  check(
    "submit route validates attachment IDs for client",
    submitRoute.includes("validateAttachmentIdsForClient"),
  );
  check(
    "serve route remains portal-authenticated",
    serveRoute.includes("getPortalSession"),
  );
  check(
    "upload failure keeps generic portal message",
    uploadRoute.includes("We couldn't upload that file. Please try again."),
  );

  console.log("\nMIME + size validation");
  check("PNG mime allowed", isWebsiteReviewMimeAllowed("image/png") === true);
  check("JPEG mime allowed", isWebsiteReviewMimeAllowed("image/jpeg") === true);
  check(
    "empty type + .png resolves to image/png",
    resolveWebsiteReviewMimeType("", "photo.png") === "image/png",
  );
  check(
    "empty type + .jpg resolves to image/jpeg",
    resolveWebsiteReviewMimeType("", "photo.jpg") === "image/jpeg",
  );
  check(
    "empty type + .jpeg resolves to image/jpeg",
    resolveWebsiteReviewMimeType("", "photo.jpeg") === "image/jpeg",
  );
  check(
    "octet-stream + .jpeg resolves to image/jpeg",
    resolveWebsiteReviewMimeType("application/octet-stream", "a.jpeg") ===
      "image/jpeg",
  );
  check(
    "unsupported exe rejected",
    isWebsiteReviewMimeAllowed(resolveWebsiteReviewMimeType("", "malware.exe")) ===
      false,
  );
  check(
    "max file size remains 10 MB",
    WEBSITE_REVIEW_MAX_FILE_BYTES === 10 * 1024 * 1024,
  );

  console.log("\nStorage adapter selection");
  withEnv(
    {
      BLOB_READ_WRITE_TOKEN: undefined,
      BLOB_STORE_ID: undefined,
      VERCEL: undefined,
      VERCEL_ENV: undefined,
    },
    () => {
      check(
        "local default when no blob env and not on Vercel",
        isVercelBlobStorageConfigured() === false &&
          getDefaultClientReviewStorageAdapter().provider === "local",
      );
    },
  );

  withEnv(
    {
      BLOB_READ_WRITE_TOKEN: undefined,
      BLOB_STORE_ID: "store_example123",
      VERCEL: undefined,
      VERCEL_ENV: undefined,
    },
    () => {
      check(
        "BLOB_STORE_ID alone selects vercel-blob",
        isVercelBlobStorageConfigured() === true &&
          getDefaultClientReviewStorageAdapter().provider === "vercel-blob",
      );
    },
  );

  withEnv(
    {
      BLOB_READ_WRITE_TOKEN: "vercel_blob_rw_example_token",
      BLOB_STORE_ID: undefined,
      VERCEL: undefined,
      VERCEL_ENV: undefined,
    },
    () => {
      check(
        "BLOB_READ_WRITE_TOKEN alone selects vercel-blob",
        isVercelBlobStorageConfigured() === true &&
          getDefaultClientReviewStorageAdapter().provider === "vercel-blob",
      );
    },
  );

  withEnv(
    {
      BLOB_READ_WRITE_TOKEN: undefined,
      BLOB_STORE_ID: undefined,
      VERCEL: "1",
      VERCEL_ENV: "production",
    },
    () => {
      let threw = false;
      try {
        getDefaultClientReviewStorageAdapter();
      } catch {
        threw = true;
      }
      check("Vercel without blob credentials refuses local fallback", threw === true);
    },
  );

  console.log("\nHistorical failure mode (local on serverless)");
  check(
    "storage key remains client-scoped",
    buildClientReviewStorageKey(9, "photo.png").startsWith("client-review-media/9/"),
  );

  console.log("\nLocal filesystem upload (dev adapter)");
  const png = tinyPng();
  const jpg = tinyJpeg();
  const jpegName = `verify-${randomUUID()}.jpeg`;

  try {
    const pngResult = await localClientReviewStorageAdapter.upload({
      clientId: 9,
      buffer: png,
      mimeType: "image/png",
      originalFilename: "verify.png",
    });
    check("local PNG upload writes object", Boolean(pngResult.key));

    const jpgResult = await localClientReviewStorageAdapter.upload({
      clientId: 9,
      buffer: jpg,
      mimeType: "image/jpeg",
      originalFilename: "verify.jpg",
    });
    check("local JPG upload writes object", Boolean(jpgResult.key));

    const jpegResult = await localClientReviewStorageAdapter.upload({
      clientId: 9,
      buffer: jpg,
      mimeType: resolveWebsiteReviewMimeType("", jpegName),
      originalFilename: jpegName,
    });
    check("local JPEG extension upload writes object", Boolean(jpegResult.key));

    await localClientReviewStorageAdapter.delete(pngResult.key);
    await localClientReviewStorageAdapter.delete(jpgResult.key);
    await localClientReviewStorageAdapter.delete(jpegResult.key);
    check("local cleanup deletes uploaded objects", true);
  } catch (err) {
    check(
      `local filesystem upload available (${err instanceof Error ? err.message : "error"})`,
      false,
    );
  }

  console.log("\nLive portal / Vercel Blob boundary");
  const blobConfigured = isVercelBlobStorageConfigured();
  const onVercel = Boolean(process.env.VERCEL || process.env.VERCEL_ENV);
  if (!blobConfigured) {
    check(
      "live blob upload skipped — neither BLOB_READ_WRITE_TOKEN nor BLOB_STORE_ID set in this process",
      true,
    );
    console.log(
      "  → Production already has BLOB_STORE_ID. After deploy, uploads should use vercel-blob via OIDC.",
    );
    console.log(
      "  → Optional hardening: also set BLOB_READ_WRITE_TOKEN on Vercel Production/Preview.",
    );
  } else if (!onVercel && !process.env.BLOB_READ_WRITE_TOKEN?.trim()) {
    check(
      "live blob upload skipped — BLOB_STORE_ID present but OIDC not available locally without BLOB_READ_WRITE_TOKEN",
      true,
    );
  } else {
    try {
      const adapter = getDefaultClientReviewStorageAdapter();
      const keyProbe = await adapter.upload({
        clientId: 9,
        buffer: png,
        mimeType: "image/png",
        originalFilename: `verify-live-${randomUUID()}.png`,
      });
      await adapter.delete(keyProbe.key);
      check("live blob PNG upload+delete succeeded", true);
    } catch (err) {
      check(
        `live blob upload (${err instanceof Error ? err.message : "failed"})`,
        false,
      );
    }
  }

  console.log("\nAuth + isolation contracts (static)");
  check(
    "DELETE checks session.clientId ownership",
    uploadRoute.includes("rowClientId !== session.clientId"),
  );
  check(
    "unauthenticated POST returns 401 Unauthorized",
    uploadRoute.includes('message: "Unauthorized."') &&
      uploadRoute.includes("status: 401"),
  );
  check(
    "cross-client attachment rejected in validateAttachmentIdsForClient",
    attachmentsServer.includes("is not available."),
  );
  check(
    "already-linked attachment rejected before re-associate",
    attachmentsServer.includes("already in use."),
  );
  check(
    "linkAttachmentsToRequest still sets relatedRequest",
    attachmentsServer.includes("relatedRequest: requestId"),
  );

  const tmpMarker = path.join(
    root,
    "private",
    "client-review-media",
    ".verify-tmp",
  );
  try {
    mkdirSync(path.dirname(tmpMarker), { recursive: true });
    writeFileSync(tmpMarker, "ok");
    rmSync(tmpMarker);
    check("private/client-review-media writable for local adapter", true);
  } catch {
    check("private/client-review-media writable for local adapter", false);
  }

  console.log("");
  if (failures > 0) {
    console.error(`verify:website-review-upload failed (${failures} checks)\n`);
    process.exit(1);
  }
  console.log("verify:website-review-upload passed\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
