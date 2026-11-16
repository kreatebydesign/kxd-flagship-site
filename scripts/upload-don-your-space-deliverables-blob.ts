#!/usr/bin/env node
/**
 * Upload Don accountability PDF + ZIP + manifest to private Vercel Blob.
 * Requires BLOB_READ_WRITE_TOKEN or OIDC + BLOB_STORE_ID.
 *
 * Usage:
 *   npx tsx scripts/stage-don-cusick-accountability-portal-artifacts.ts
 *   KXD_CONFIRM_DON_DELIVERABLE_BLOB_UPLOAD=1 npx tsx scripts/upload-don-your-space-deliverables-blob.ts
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DON_WIX_SCREENSHOTS_EXPECTED } from "../lib/portal/don-your-space/constants";
import {
  DON_DELIVERABLE_MANIFEST_KEY,
  donDeliverableBlobKey,
} from "../lib/portal/don-your-space/storage/keys";
import {
  assertUsableCommercialBlobCredentials,
} from "../lib/proposal-lifecycle/documents/storage/vercel-blob";
import { vercelBlobDonDeliverableStorageAdapter } from "../lib/portal/don-your-space/storage/vercel-blob";

const CONFIRM = "KXD_CONFIRM_DON_DELIVERABLE_BLOB_UPLOAD";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LOCAL = path.join(ROOT, "storage/don-your-space-deliverables");

const FILES = [
  {
    name: "don-cusick-final-accountability-report.pdf",
    mime: "application/pdf",
  },
  {
    name: "don-cusick-accountability-final.zip",
    mime: "application/zip",
  },
] as const;

async function main() {
  if (process.env[CONFIRM] !== "1") {
    console.error(`Set ${CONFIRM}=1 to upload private deliverables to Vercel Blob.`);
    process.exit(1);
  }

  assertUsableCommercialBlobCredentials("upload-don-your-space-deliverables-blob");
  const adapter = vercelBlobDonDeliverableStorageAdapter;

  const wixDir = path.join(LOCAL, "ownership-verification");
  const wixPresent = DON_WIX_SCREENSHOTS_EXPECTED.filter((n) =>
    existsSync(path.join(wixDir, n)),
  );
  const wixComplete = wixPresent.length === DON_WIX_SCREENSHOTS_EXPECTED.length;

  for (const { name, mime } of FILES) {
    const src = path.join(LOCAL, name);
    if (!existsSync(src)) {
      console.error("Missing local staged file:", src);
      process.exit(1);
    }
    const buffer = readFileSync(src);
    await adapter.upload(name, buffer, mime);
    console.log("Uploaded", donDeliverableBlobKey(name), `(${buffer.byteLength} bytes)`);
  }

  const manifest = {
    stagedAt: new Date().toISOString(),
    source: LOCAL,
    reportPdf: true,
    supportingZip: true,
    wixScreenshots: wixPresent,
    wixScreenshotsComplete: wixComplete,
    storageProvider: "vercel-blob" as const,
  };

  if (!wixComplete) {
    console.error("Wix screenshot set incomplete; fix staging before production upload.");
    process.exit(1);
  }

  await adapter.upload(
    DON_DELIVERABLE_MANIFEST_KEY,
    Buffer.from(JSON.stringify(manifest, null, 2)),
    "application/json",
  );
  console.log("Uploaded manifest", DON_DELIVERABLE_MANIFEST_KEY);
  console.log("\nDone. Downloads use server-side get() — no public URLs.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});