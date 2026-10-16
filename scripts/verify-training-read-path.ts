/**
 * Training Phase 1 — read paths must not sync catalog to Payload.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function read(rel: string): string {
  return readFileSync(path.join(repoRoot, rel), "utf8");
}

console.log("\nverify:training-read-path\n");

const services = read("lib/training/services.ts");
const summary = read("lib/training/summary.ts");
const staffLoad = read("lib/staff/load.ts");
const seed = read("lib/training/seed.ts");

for (const [name, src] of [
  ["services.ts", services],
  ["summary.ts", summary],
  ["staff/load.ts", staffLoad],
] as const) {
  assert.equal(
    src.includes("ensureTrainingSeeded"),
    false,
    `${name} must not call ensureTrainingSeeded`,
  );
  assert.equal(
    src.includes("seedTrainingCatalog"),
    false,
    `${name} must not call seedTrainingCatalog`,
  );
}

assert.match(
  seed,
  /export async function ensureTrainingSeeded[\s\S]*intentional no-op/,
  "ensureTrainingSeeded must remain a documented no-op",
);

assert.match(services, /readPublishedCatalog/, "services must read catalog in-process");
assert.match(summary, /readPublishedCatalog/, "summary must read catalog in-process");
assert.match(staffLoad, /getTrainingStaffSummary/, "Staff Home must use training summary");
assert.equal(
  staffLoad.includes("getTrainingDashboard"),
  false,
  "Staff Home must not load full training dashboard",
);

console.log("✓ Training read paths do not seed catalog");
console.log("✓ Staff Home uses getTrainingStaffSummary\n");
