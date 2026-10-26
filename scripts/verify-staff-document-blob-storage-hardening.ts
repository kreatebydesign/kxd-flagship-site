/**
 * Regression gate for staff/commercial Vercel Blob storage hardening (no DB).
 *   npm run verify:staff-document-blob-storage-hardening
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");

function read(rel: string): string {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

console.log("\nverify:staff-document-blob-storage-hardening\n");

const vercelBlob = read("lib/proposal-lifecycle/documents/storage/vercel-blob.ts");
assert.match(vercelBlob, /isPlaceholderEnvValue/);
assert.match(vercelBlob, /describeCommercialBlobCredentialState/);
assert.match(vercelBlob, /assertUsableCommercialBlobCredentials/);
assert.match(vercelBlob, /uploadCommercialDocumentBlobRepair/);
assert.match(vercelBlob, /allowOverwrite: true/);
assert.match(vercelBlob, /\^vercel_blob_rw_/i);

const resolveCommercial = read("lib/proposal-lifecycle/documents/storage/resolve.ts");
assert.match(resolveCommercial, /isCommercialDocumentBlobConfiguredForRuntime/);

const staffResolve = read("lib/staff-documents/storage/resolve.ts");
assert.match(staffResolve, /getStaffDocumentStorageAdapter/);
assert.match(staffResolve, /provider recorded on the staff_document_files row/);

const dataTs = read("lib/staff-documents/data.ts");
assert.match(dataTs, /getStaffDocumentStorageAdapter\(provider\)/);

const repairScript = read("scripts/repair-staff-policy-blob-pdfs.ts");
assert.match(repairScript, /TARGET_FILE_IDS = \[3, 4\]/);
assert.match(repairScript, /KXD_CONFIRM_PRODUCTION_STAFF_BLOB_REPAIR/);
assert.match(repairScript, /sanitizeBlobCredentialsInEnv/);
assert.match(repairScript, /uploadCommercialDocumentBlobRepair/);
assert.doesNotMatch(repairScript, /collection:\s*"staff-documents"/);

const prevToken = process.env.BLOB_READ_WRITE_TOKEN;
const prevStore = process.env.BLOB_STORE_ID;
const prevOidc = process.env.VERCEL_OIDC_TOKEN;

try {
  process.env.BLOB_READ_WRITE_TOKEN = "[SENSITIVE]";
  process.env.BLOB_STORE_ID = "store_real_id";
  delete process.env.VERCEL_OIDC_TOKEN;
  const { describeCommercialBlobCredentialState } = await import(
    "../lib/proposal-lifecycle/documents/storage/vercel-blob.ts"
  );
  const placeholder = describeCommercialBlobCredentialState();
  assert.equal(placeholder.readWriteTokenRejected, true);
  assert.equal(placeholder.canAuthenticate, false);

  process.env.BLOB_READ_WRITE_TOKEN = "vercel_blob_rw_test_token_value";
  const valid = describeCommercialBlobCredentialState();
  assert.equal(valid.readWriteTokenFormatValid, true);
  assert.equal(valid.canAuthenticate, true);
} finally {
  if (prevToken === undefined) delete process.env.BLOB_READ_WRITE_TOKEN;
  else process.env.BLOB_READ_WRITE_TOKEN = prevToken;
  if (prevStore === undefined) delete process.env.BLOB_STORE_ID;
  else process.env.BLOB_STORE_ID = prevStore;
  if (prevOidc === undefined) delete process.env.VERCEL_OIDC_TOKEN;
  else process.env.VERCEL_OIDC_TOKEN = prevOidc;
}

console.log("  ✓ staff document blob storage hardening passed\n");
