/**
 * Repair staff document PDFs recorded as `local` but required on Vercel Blob in production.
 *
 * Targets staff-document-files rows #2, #3, and #4 (Tyler employment agreement + policies).
 * Uploads exact bytes from workspace `storage/staff-documents/` after content-hash verification.
 * Does not mutate staff-documents rows, snapshots, acknowledgments, or signatures.
 *
 * Dry-run (default):
 *   npm run repair:staff-policy-blob-pdfs
 *
 * Apply (production writes — requires explicit confirmation):
 *   npm run repair:staff-policy-blob-pdfs:apply
 *
 * Optional: load Neon URL from sibling env files (DATABASE_URL only; blob token sanitized).
 */

process.env.KXD_SERVER_ONLY_SHIM = process.env.KXD_SERVER_ONLY_SHIM ?? "1";

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadEnv } from "payload/node";
import {
  assertUsableCommercialBlobCredentials,
  commercialDocumentBlobPath,
  describeCommercialBlobCredentialState,
  uploadCommercialDocumentBlobRepair,
  vercelBlobCommercialDocumentStorageAdapter,
} from "../lib/proposal-lifecycle/documents/storage/vercel-blob.ts";
import { hashStaffDocumentPdfBytes } from "../lib/staff-documents/hash.ts";
import { verifyStaffDocumentIntegrity } from "../lib/staff-documents/integrity.ts";
import { getStaffDocumentsLocalRoot } from "../lib/staff-documents/storage/local.ts";
import {
  formatDbTarget,
  resolveDbTarget,
} from "./lib/payload-db-target.ts";
import {
  STAFF_PDF_BLOB_REPAIR_MANIFEST,
  TARGET_FILE_IDS,
  type StaffPdfBlobRepairFileId,
} from "./lib/staff-pdf-blob-repair-manifest.ts";

const APPLY = process.env.APPLY === "1";
const CONFIRM_ENV = "KXD_CONFIRM_PRODUCTION_STAFF_BLOB_REPAIR";
const CONFIRM_VALUE = "STAFF_POLICY_BLOB_REPAIR_PRODUCTION";
const EXPECTED_NEON_HOST_FRAGMENT = "neon.tech";
const FILES = "staff-document-files";

function applyEnvFile(relativePath: string): boolean {
  const full = resolve(process.cwd(), relativePath);
  if (!existsSync(full)) return false;
  const text = readFileSync(full, "utf8");
  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env) || !process.env[key]?.trim()) {
      process.env[key] = value;
    }
  }
  return true;
}

function sanitizeBlobCredentialsInEnv(): void {
  const state = describeCommercialBlobCredentialState();
  if (state.readWriteTokenRejected) {
    delete process.env.BLOB_READ_WRITE_TOKEN;
  }
  if (state.storeIdRejected) {
    delete process.env.BLOB_STORE_ID;
  }
}

function loadRepairEnv(): void {
  const repoRoot = resolve(import.meta.dirname, "..");
  loadEnv(repoRoot);
  applyEnvFile(".env.vercel.local");
  applyEnvFile("../kxd-rebuild/.env.vercel.local");
  applyEnvFile(".env.production.local");
  sanitizeBlobCredentialsInEnv();
  if (!process.env.PAYLOAD_SECRET?.trim() || process.env.PAYLOAD_SECRET === "[SENSITIVE]") {
    applyEnvFile(".env.local");
    if (!process.env.PAYLOAD_SECRET?.trim()) {
      process.env.PAYLOAD_SECRET = "kxd-dev-secret-change-in-production";
    }
  }
}

function assertProductionDatabaseTarget(): void {
  const target = resolveDbTarget();
  if (target.kind !== "remote-postgres" || !target.isRemote) {
    throw new Error(
      `Repair requires remote production Postgres. Resolved: ${formatDbTarget(target)}`,
    );
  }
  if (!target.host.includes(EXPECTED_NEON_HOST_FRAGMENT)) {
    throw new Error(
      `Expected Neon host (${EXPECTED_NEON_HOST_FRAGMENT}). Resolved: ${formatDbTarget(target)}`,
    );
  }
  console.log(`Database target: ${formatDbTarget(target)}`);
}

function assertProductionRepairAuthorized(): void {
  if (!APPLY) return;
  if (process.env[CONFIRM_ENV] !== CONFIRM_VALUE) {
    throw new Error(
      `Refusing APPLY without ${CONFIRM_ENV}=${CONFIRM_VALUE}`,
    );
  }
}

function maskStoreId(storeId: string | undefined): string {
  const id = storeId?.trim() ?? "";
  if (!id) return "(unset)";
  if (id.length <= 8) return `${id.slice(0, 2)}…`;
  return `${id.slice(0, 8)}…`;
}

function assertExpectedBlobStore(): void {
  const expected = process.env.KXD_EXPECT_BLOB_STORE_ID?.trim();
  const actual = process.env.BLOB_STORE_ID?.trim() ?? "";
  if (expected && actual && actual !== expected) {
    throw new Error(
      "BLOB_STORE_ID does not match KXD_EXPECT_BLOB_STORE_ID (prefix check failed).",
    );
  }
  const state = describeCommercialBlobCredentialState();
  console.log(
    [
      "Blob credentials:",
      `rwTokenPresent=${state.readWriteTokenPresent}`,
      `rwTokenUsable=${state.readWriteTokenFormatValid}`,
      `rwTokenRejected=${state.readWriteTokenRejected}`,
      `storeId=${maskStoreId(actual)}`,
      `oidcPresent=${state.oidcTokenPresent}`,
      `canAuthenticate=${state.canAuthenticate}`,
    ].join(" "),
  );
  if (APPLY) {
    assertUsableCommercialBlobCredentials("repair-staff-policy-blob-pdfs:apply");
    assertExpectedBlobStore();
  }
}

type AnyDoc = Record<string, unknown>;

function relId(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "object" && value !== null && "id" in value) {
    const id = Number((value as { id: unknown }).id);
    return Number.isFinite(id) ? id : null;
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function localPdfPath(storageKey: string): string {
  return resolve(getStaffDocumentsLocalRoot(), storageKey);
}

function readVerifiedLocalBytes(input: {
  storageKey: string;
  contentHash: string;
  label: string;
}): Buffer {
  const abs = localPdfPath(input.storageKey);
  if (!existsSync(abs)) {
    throw new Error(`${input.label}: local PDF missing at ${abs}`);
  }
  const buffer = readFileSync(abs);
  const byteHash = hashStaffDocumentPdfBytes(buffer);
  if (byteHash !== input.contentHash) {
    throw new Error(
      `${input.label}: local PDF hash mismatch (expected ${input.contentHash}, got ${byteHash})`,
    );
  }
  const integrity = verifyStaffDocumentIntegrity({
    buffer,
    contentHash: input.contentHash,
    mimeType: "application/pdf",
  });
  if (!integrity.ok) {
    throw new Error(`${input.label}: integrity verification failed.`);
  }
  return buffer;
}

async function probeBlobAccessibility(input: {
  storageKey: string;
  contentHash: string;
  label: string;
}): Promise<{ accessible: boolean; detail: string }> {
  const state = describeCommercialBlobCredentialState();
  if (!state.canAuthenticate) {
    return {
      accessible: false,
      detail: "Blob credentials not usable from this environment (dry-run probe skipped).",
    };
  }
  try {
    const opened = await vercelBlobCommercialDocumentStorageAdapter.open(input.storageKey);
    const integrity = verifyStaffDocumentIntegrity({
      buffer: opened.body,
      contentHash: input.contentHash,
      mimeType: "application/pdf",
    });
    if (!integrity.ok) {
      return { accessible: false, detail: "Blob object present but hash mismatch." };
    }
    return {
      accessible: true,
      detail: `Blob readable (${opened.byteLength} bytes, hash OK).`,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { accessible: false, detail: `Blob open failed: ${message}` };
  }
}

async function repairOneFile(input: {
  payload: Awaited<ReturnType<(typeof import("payload"))["getPayload"]>>;
  fileId: number;
}): Promise<void> {
  const file = (await input.payload.findByID({
    collection: FILES as never,
    id: input.fileId,
    depth: 0,
    overrideAccess: true,
  })) as AnyDoc;

  if (!TARGET_FILE_IDS.includes(input.fileId as StaffPdfBlobRepairFileId)) {
    throw new Error(`Refusing unexpected file id ${input.fileId}`);
  }

  const manifest = STAFF_PDF_BLOB_REPAIR_MANIFEST.find((r) => r.fileId === input.fileId);
  if (!manifest) {
    throw new Error(`Missing manifest entry for file #${input.fileId}`);
  }

  const staffDocumentId = relId(file.staffDocument);
  const kind = String(file.kind ?? "");
  const provider = String(file.storageProvider ?? file.storage_provider ?? "local");
  const storageKey = String(file.storageKey ?? "");
  const contentHash = String(file.contentHash ?? "");
  const byteLength = Number(file.byteLength ?? 0);

  if (storageKey !== manifest.storageKey || contentHash !== manifest.contentHash) {
    throw new Error(
      `File #${input.fileId}: production record drift (storageKey or contentHash differs from repair manifest). Aborting.`,
    );
  }

  console.log(`\n── File #${input.fileId} (staff-document ${staffDocumentId}) ──`);
  console.log(
    `kind=${kind} provider=${provider} storageKey=${storageKey} byteLength=${byteLength}`,
  );
  console.log(`contentHash=${contentHash}`);

  if (kind !== "policy-pdf") {
    throw new Error(`File #${input.fileId}: expected kind policy-pdf, got ${kind}`);
  }

  const buffer = readVerifiedLocalBytes({
    storageKey,
    contentHash,
    label: `file#${input.fileId}`,
  });
  console.log(`local bytes verified: ${buffer.byteLength} bytes, hash matches DB`);

  const blobKey = commercialDocumentBlobPath(storageKey);
  console.log(`blob path: ${blobKey}`);

  if (provider === "vercel-blob") {
    const probe = await probeBlobAccessibility({
      storageKey,
      contentHash,
      label: `file#${input.fileId}`,
    });
    console.log(`existing blob probe: ${probe.detail}`);
    if (probe.accessible) {
      console.log("  no DB update required (already vercel-blob + readable + hash OK)");
      return;
    }
  }

  if (!APPLY) {
    console.log("  DRY-RUN: would upload exact bytes to vercel-blob (private)");
    console.log("  DRY-RUN: would update staff-document-files row storage_provider=vercel-blob only");
    return;
  }

  const uploaded = await uploadCommercialDocumentBlobRepair({
    key: storageKey,
    buffer,
    mimeType: "application/pdf",
  });

  const opened = await vercelBlobCommercialDocumentStorageAdapter.open(uploaded.key);
  const postIntegrity = verifyStaffDocumentIntegrity({
    buffer: opened.body,
    contentHash,
    mimeType: "application/pdf",
  });
  if (!postIntegrity.ok || opened.body.byteLength !== buffer.byteLength) {
    throw new Error(
      `File #${input.fileId}: post-upload integrity failed — DB not updated. Re-run APPLY to retry upload.`,
    );
  }

  await input.payload.update({
    collection: FILES as never,
    id: input.fileId,
    data: {
      storageProvider: "vercel-blob",
      storageKey: uploaded.key,
      byteLength: buffer.byteLength,
    } as never,
    overrideAccess: true,
  });

  console.log("  APPLY: upload verified; file record updated (provider + key + byteLength only)");
}

async function main(): Promise<void> {
  loadRepairEnv();
  assertProductionDatabaseTarget();
  assertProductionRepairAuthorized();
  assertExpectedBlobStore();

  console.log("Staff document PDF blob repair (files #2, #3, #4)");
  console.log(`Mode: ${APPLY ? "APPLY" : "DRY-RUN"}`);
  console.log(`Target file records: ${TARGET_FILE_IDS.join(", ")}`);

  const { getPayload } = await import("payload");
  const config = (await import("@payload-config")).default;
  const payload = await getPayload({ config });

  for (const fileId of TARGET_FILE_IDS) {
    await repairOneFile({ payload, fileId });
  }

  console.log("\nDone.");
  if (!APPLY) {
    console.log(
      `To apply after Matt authorization: npm run repair:staff-policy-blob-pdfs:apply (requires ${CONFIRM_ENV}=${CONFIRM_VALUE} and valid BLOB_READ_WRITE_TOKEN).`,
    );
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
