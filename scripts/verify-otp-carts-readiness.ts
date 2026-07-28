/**
 * OTP Carts Launch Readiness — Batch A (Gate Hardening).
 * Static verification only — no DB writes, no production mutation, no migrations.
 *
 * Run: npm run verify:otp-carts-readiness
 */

import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import {
  CLIENT_IMPORT_EXAMPLES,
} from "../lib/client-launch/examples/client-import-examples";
import {
  OTP_CARTS_IMPORT_EXAMPLE,
  getOtpCartsImportExampleJson,
} from "../lib/client-launch/examples/otp-carts-import";
import {
  ON_TRACK_PERFORMANCE_SEED_SLUG,
  OTP_CARTS_EXPECTED_SLUG,
  evaluateOtpCartsImportGate,
  seedClientsDefinesOtpCarts,
} from "../lib/client-launch/otp-carts-readiness";
import { slugifyBusinessName } from "../lib/client-launch/slug";

const root = process.cwd();

function read(rel: string) {
  return readFileSync(path.join(root, rel), "utf8");
}

function walkTsFiles(dir: string, out: string[] = []): string[] {
  let entries: import("node:fs").Dirent[] = [];
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const ent of entries) {
    if (
      ent.name === "node_modules" ||
      ent.name === ".next" ||
      ent.name === ".git" ||
      ent.name === ".tmp"
    ) {
      continue;
    }
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      walkTsFiles(full, out);
    } else if (/\.(ts|tsx)$/.test(ent.name)) {
      out.push(full);
    }
  }
  return out;
}

function main() {
  console.log("\nOTP Carts Launch Readiness — Batch A gate verification\n");

  const gate = evaluateOtpCartsImportGate(OTP_CARTS_IMPORT_EXAMPLE);
  assert.equal(gate.ok, true, gate.errors.join("; ") || "OTP Carts import gate failed");
  assert.equal(gate.expectedSlug, OTP_CARTS_EXPECTED_SLUG);
  assert.equal(slugifyBusinessName("OTP Carts"), OTP_CARTS_EXPECTED_SLUG);
  assert.notEqual(OTP_CARTS_EXPECTED_SLUG, ON_TRACK_PERFORMANCE_SEED_SLUG);
  console.log("  ✔ OTP Carts import example passes gate evaluation");

  if (gate.warnings.length > 0) {
    for (const w of gate.warnings) console.log(`  · warning: ${w}`);
  }

  const exampleEntry = CLIENT_IMPORT_EXAMPLES.find(
    (e) => e.label === "Load OTP Carts Example",
  );
  assert.ok(exampleEntry, "CLIENT_IMPORT_EXAMPLES must include Load OTP Carts Example");
  assert.equal(exampleEntry.getJson(), getOtpCartsImportExampleJson());
  assert.ok(exampleEntry.rawNotes?.includes("OTP Carts") || exampleEntry.rawNotes?.includes("golf cart"));
  console.log("  ✔ OTP Carts registered in CLIENT_IMPORT_EXAMPLES");

  const seed = read("scripts/seed-clients.ts");
  assert.match(seed, /slug:\s*"otp"/);
  assert.equal(
    seedClientsDefinesOtpCarts(seed),
    false,
    "seed-clients must not define slug otp-carts as a production seed identity",
  );
  assert.match(seed, /OTP Carts is a separate client/);
  console.log("  ✔ seed-clients keeps OTP (otp) separate; otp-carts not seeded");

  const packageJson = read("package.json");
  assert.match(packageJson, /"verify:otp-carts-readiness"/);
  console.log("  ✔ package.json registers verify:otp-carts-readiness");

  const readinessLib = read("lib/client-launch/otp-carts-readiness.ts");
  const indexSrc = read("lib/client-launch/index.ts");
  assert.match(indexSrc, /otp-carts-readiness/);
  assert.match(readinessLib, /evaluateOtpCartsImportGate/);
  assert.match(readinessLib, /buildOtpCartsGateChecklist/);
  console.log("  ✔ readiness helpers exported from client-launch");

  const importUi = read("components/admin/operations/client-import/ClientImportTool.tsx");
  const gatePanel = read(
    "components/admin/operations/client-import/OtpCartsReadinessGatePanel.tsx",
  );
  const launchLanding = read("app/admin/operations/clients/launch/page.tsx");
  assert.match(importUi, /OtpCartsReadinessGatePanel/);
  assert.match(gatePanel, /OTP Carts readiness gate/);
  assert.match(launchLanding, /OtpCartsReadinessGatePanel|OTP Carts/);
  console.log("  ✔ operator UI surfaces the OTP Carts readiness gate");

  const phase4 = read("docs/PHASE-4-MULTI-CLIENT-PORTAL.md");
  const currentState = read("docs/KXD-OS-CURRENT-STATE.md");
  assert.match(phase4, /verify:otp-carts-readiness/);
  assert.match(phase4, /migration-independent|independent of.*migration/i);
  assert.match(currentState, /OTP Carts Launch Readiness|verify:otp-carts-readiness/);
  console.log("  ✔ docs note the migration-independent OTP Carts gate");

  // No Batch B / membership linking in gate implementation surfaces.
  // (Exclude this verifier file — it mentions forbidden tokens in assertions.)
  const scanned = [
    ...walkTsFiles(path.join(root, "lib/client-launch")),
    ...walkTsFiles(path.join(root, "components/admin/operations/client-import")),
    ...walkTsFiles(path.join(root, "components/admin/operations/client-launch")),
  ];

  const forbidden = [
    "Account" + "Switcher",
    "/api/portal/" + "switch",
    "switch" + "ActiveClient",
    "Combined" + "Portfolio",
    "portal/" + "portfolio",
  ];

  for (const file of scanned) {
    const src = readFileSync(file, "utf8");
    for (const token of forbidden) {
      assert.ok(
        !src.includes(token),
        `${path.relative(root, file)} must not contain ${token}`,
      );
    }
  }
  console.log("  ✔ no Phase 4 Batch B switcher/portfolio paths in gate surfaces");

  const migrationsDir = path.join(root, "migrations");
  const migrationNames = readdirSync(migrationsDir).filter((n) => n.endsWith(".ts"));
  assert.ok(
    !migrationNames.some((n) => /otp.?carts/i.test(n)),
    "Batch A must not add an OTP Carts migration file",
  );
  console.log("  ✔ no OTP Carts migration file added");

  const readyItems = gate.checklist.filter((i) => i.status === "ready");
  const pendingItems = gate.checklist.filter((i) => i.status === "pending");
  assert.ok(readyItems.length >= 3, "expected import/example checklist items ready");
  assert.ok(
    pendingItems.some((i) => i.id === "membership-linking"),
    "membership linking must remain pending",
  );
  assert.ok(
    pendingItems.some((i) => i.id === "production-launch"),
    "production launch must remain pending",
  );
  console.log("  ✔ checklist keeps production launch and membership linking pending");

  console.log("\nOTP Carts Launch Readiness Batch A verification passed.\n");
}

main();
