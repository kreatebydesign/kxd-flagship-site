import "server-only";

import { existsSync } from "node:fs";
import path from "node:path";
import {
  DON_ACCOUNTABILITY_STORAGE_DIR,
  DON_EVIDENCE_ZIP_FILENAME,
  DON_REPORT_PDF_FILENAME,
  DON_WIX_SCREENSHOTS_EXPECTED,
} from "./constants";
import { getDonDeliverableStorageAdapter } from "./storage/resolve";
import { localDonDeliverableExists } from "./storage/local";
import { DON_DELIVERABLE_MANIFEST_KEY, donDeliverableBlobKey } from "./storage/keys";

export type DonDeliverableArtifact = "report-pdf" | "supporting-zip";

const LOCAL_MANIFEST = "deliverable-manifest.json";

export type DonDeliverableManifest = {
  stagedAt: string;
  source: string;
  reportPdf: boolean;
  supportingZip: boolean;
  wixScreenshots: string[];
  wixScreenshotsComplete: boolean;
  storageProvider?: "local" | "vercel-blob";
};

function localWixState(): { wixPresent: string[]; wixComplete: boolean } {
  const root = path.join(process.cwd(), DON_ACCOUNTABILITY_STORAGE_DIR, "ownership-verification");
  const wixPresent: string[] = [];
  for (const name of DON_WIX_SCREENSHOTS_EXPECTED) {
    if (existsSync(path.join(root, name))) {
      wixPresent.push(name);
    }
  }
  return {
    wixPresent,
    wixComplete: DON_WIX_SCREENSHOTS_EXPECTED.every((n) => wixPresent.includes(n)),
  };
}

function mergeManifestWithLocalFiles(
  parsed: DonDeliverableManifest | null,
): DonDeliverableManifest | null {
  const adapter = getDonDeliverableStorageAdapter();
  if (adapter.provider === "vercel-blob") {
    return parsed;
  }

  const report = localDonDeliverableExists(DON_REPORT_PDF_FILENAME);
  const zip = localDonDeliverableExists(DON_EVIDENCE_ZIP_FILENAME);
  const { wixPresent, wixComplete } = localWixState();

  if (!parsed) {
    if (!report && !zip) return null;
    return {
      stagedAt: new Date().toISOString(),
      source: "local-staging",
      reportPdf: report,
      supportingZip: zip,
      wixScreenshots: wixPresent,
      wixScreenshotsComplete: wixComplete,
      storageProvider: "local",
    };
  }

  return {
    ...parsed,
    reportPdf: report,
    supportingZip: zip,
    wixScreenshots: wixPresent,
    wixScreenshotsComplete: wixComplete,
    storageProvider: "local",
  };
}

export async function resolveDonDeliverableManifest(): Promise<DonDeliverableManifest | null> {
  const adapter = getDonDeliverableStorageAdapter();

  if (adapter.provider === "vercel-blob") {
    try {
      const opened = await adapter.open(DON_DELIVERABLE_MANIFEST_KEY);
      const body = opened.body;
      const raw = Buffer.isBuffer(body) ? body.toString("utf-8") : "";
      if (!raw) return null;
      const parsed = JSON.parse(raw) as DonDeliverableManifest;
      return { ...parsed, storageProvider: "vercel-blob" };
    } catch {
      return null;
    }
  }

  if (localDonDeliverableExists(LOCAL_MANIFEST)) {
    try {
      const opened = await adapter.open(LOCAL_MANIFEST);
      const body = opened.body;
      const raw = Buffer.isBuffer(body) ? body.toString("utf-8") : "";
      const parsed = JSON.parse(raw) as DonDeliverableManifest;
      return mergeManifestWithLocalFiles(parsed);
    } catch {
      return mergeManifestWithLocalFiles(null);
    }
  }

  return mergeManifestWithLocalFiles(null);
}

export async function isDonDeliverableReadyForClient(): Promise<{
  ok: boolean;
  missing: string[];
}> {
  const m = await resolveDonDeliverableManifest();
  const missing: string[] = [];
  if (!m?.reportPdf) missing.push(DON_REPORT_PDF_FILENAME);
  if (!m?.supportingZip) missing.push(DON_EVIDENCE_ZIP_FILENAME);
  if (!m?.wixScreenshotsComplete) {
    missing.push(
      "Three Wix Roles screenshots (Cusick Morgan Motorsports, On Track Performance, OTP Carts)",
    );
  }
  return { ok: missing.length === 0, missing };
}

export async function openDonDeliverableArtifact(artifact: DonDeliverableArtifact): Promise<{
  body: Buffer;
  filename: string;
  contentType: string;
  size: number;
} | null> {
  const filename =
    artifact === "report-pdf" ? DON_REPORT_PDF_FILENAME : DON_EVIDENCE_ZIP_FILENAME;
  const adapter = getDonDeliverableStorageAdapter();
  const key =
    adapter.provider === "vercel-blob"
      ? donDeliverableBlobKey(filename)
      : filename;

  try {
    const opened = await adapter.open(key);
    const buffer = Buffer.isBuffer(opened.body)
      ? opened.body
      : Buffer.alloc(0);
    if (!buffer.length) return null;
    return {
      body: buffer,
      filename,
      contentType:
        artifact === "report-pdf" ? "application/pdf" : "application/zip",
      size: buffer.byteLength,
    };
  } catch {
    return null;
  }
}