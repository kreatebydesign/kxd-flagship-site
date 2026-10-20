/**
 * Release B migration — static compatibility review (no DB apply).
 *   npx tsx scripts/verify-staff-documents-release-b-migration.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const dir = path.dirname(fileURLToPath(import.meta.url));
const migrationPath = path.join(dir, "../migrations/20261021_staff_documents_release_b_phase1.ts");
const releaseAPath = path.join(dir, "../migrations/20261020_staff_documents_release_a.ts");

console.log("\nverify:staff-documents-release-b-migration\n");

const migration = readFileSync(migrationPath, "utf8");
const releaseA = readFileSync(releaseAPath, "utf8");

assert.ok(releaseA.includes("staff_documents"), "Release A must define staff_documents");
assert.ok(migration.includes("ADD COLUMN IF NOT EXISTS"), "Release B must be additive");
assert.ok(migration.includes("signing_mode"), "signing_mode column required");
assert.ok(migration.includes("employee_signature"), "employee_signature column required");
assert.ok(migration.includes("operator_signature"), "operator_signature column required");
assert.ok(migration.includes("executed_at"), "executed_at column required");
assert.ok(!migration.includes("DROP TABLE"), "Release B must not drop Release A tables");

console.log("  ✓ staff documents release B migration static review passed\n");
