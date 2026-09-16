/**
 * Portal sidebar logo contrast — presentation registry + shell wiring.
 *
 *   npx tsx scripts/verify-portal-logo-contrast.ts
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  isDarkWordmarkClient,
  resolveLogoOnDarkTreatment,
} from "../lib/ces/profile/logo-contrast";

const root = process.cwd();
let passed = 0;

function check(label: string, fn: () => void) {
  try {
    fn();
    passed += 1;
    console.log(`  ✓ ${label}`);
  } catch (error) {
    console.error(`  ✗ ${label}`);
    throw error;
  }
}

console.log("\nPortal logo contrast\n");

check("de Bois resolves to light-panel", () => {
  assert.equal(
    resolveLogoOnDarkTreatment({
      clientSlug: "de-bois-entertainment",
      clientName: "de Bois Entertainment",
    }),
    "light-panel",
  );
  assert.equal(
    isDarkWordmarkClient({ clientName: "de Bois Entertainment" }),
    true,
  );
});

check("configured default wins over dark-wordmark heuristic", () => {
  assert.equal(
    resolveLogoOnDarkTreatment({
      clientSlug: "de-bois-entertainment",
      clientName: "de Bois Entertainment",
      configured: "default",
    }),
    "default",
  );
});

check("light logos stay on default (Robin Cole / Platinum-shaped)", () => {
  assert.equal(
    resolveLogoOnDarkTreatment({
      clientSlug: "robin-cole",
      clientName: "Robin Cole",
    }),
    "default",
  );
  assert.equal(
    resolveLogoOnDarkTreatment({
      clientSlug: "platinum-film-workz",
      clientName: "Platinum Film Workz",
    }),
    "default",
  );
});

check("shell + CSS wire light-panel without global invert", () => {
  const shell = readFileSync(
    join(root, "components/client-hq/ClientHqShell.tsx"),
    "utf8",
  );
  const css = readFileSync(
    join(root, "design-system/ces/styles/kxd-ces.css"),
    "utf8",
  );
  const resolve = readFileSync(
    join(root, "lib/ces/profile/resolve.ts"),
    "utf8",
  );
  assert.match(shell, /logo-light-panel/);
  assert.match(shell, /logoOnDarkTreatment/);
  assert.match(css, /kxd-ces-identity--logo-light-panel/);
  assert.equal(/filter:\s*invert/i.test(css), false);
  assert.match(resolve, /resolveLogoOnDarkTreatment/);
});

console.log(`\n${passed} checks passed\n`);
