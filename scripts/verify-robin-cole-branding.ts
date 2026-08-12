/**
 * Robin Cole branding — focused verification.
 * Confirms approved campaign assets are present and wired for portal identity.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  isRobinColeClient,
  ROBIN_COLE_FAVICON_SRC,
  ROBIN_COLE_LOGO_SRC,
} from "../lib/ces/profile/robin-cole";

const ROOT = process.cwd();
let checks = 0;

async function check(label: string, fn: () => void) {
  fn();
  checks += 1;
  console.log(`  ✓ ${label}`);
}

function assertFile(rel: string) {
  assert.ok(existsSync(path.join(ROOT, rel)), `missing ${rel}`);
}

function main() {
  console.log("\nverify-robin-cole-branding\n");

  check("approved campaign icon assets exist", () => {
    assertFile("public/migrated-assets/logos/robin-cole/icon.png");
    assertFile("public/migrated-assets/logos/robin-cole/favicon.ico");
    assertFile("public/migrated-assets/logos/robin-cole/apple-touch-icon.png");
    assertFile("public/migrated-assets/logos/robin-cole/logo.png");
  });

  check("assets differ from KXD marketing favicon", () => {
    const robin = readFileSync(
      path.join(ROOT, "public/migrated-assets/logos/robin-cole/favicon.ico"),
    );
    const kxd = readFileSync(
      path.join(ROOT, "public/migrated-assets/favicons/favicon.ico"),
    );
    assert.notEqual(robin.equals(kxd), true);
  });

  check("client detection matches Robin only", () => {
    assert.equal(isRobinColeClient({ clientName: "Robin Cole" }), true);
    assert.equal(isRobinColeClient({ clientSlug: "robin-cole" }), true);
    assert.equal(isRobinColeClient({ clientSlug: "robin-for-tracy" }), true);
    assert.equal(isRobinColeClient({ clientName: "Primal Motorsports" }), false);
    assert.equal(isRobinColeClient({ clientSlug: "otp-carts" }), false);
  });

  check("portal metadata wiring references Robin icons", () => {
    const layout = readFileSync(
      path.join(ROOT, "app/(portal)/portal/(app)/layout.tsx"),
      "utf8",
    );
    assert.ok(layout.includes("ROBIN_COLE_FAVICON_SRC"));
    assert.ok(layout.includes("icons"));
    assert.ok(layout.includes("resolveExperienceProfile"));
  });

  check("CES resolve ensures Robin brand mark", () => {
    const resolve = readFileSync(
      path.join(ROOT, "lib/ces/profile/resolve.ts"),
      "utf8",
    );
    assert.ok(resolve.includes("ensureRobinColeBrand"));
    assert.ok(resolve.includes("ROBIN_COLE_LOGO_SRC"));
  });

  check("constants point at migrated Robin assets", () => {
    assert.equal(ROBIN_COLE_LOGO_SRC, "/migrated-assets/logos/robin-cole/icon.png");
    assert.equal(
      ROBIN_COLE_FAVICON_SRC,
      "/migrated-assets/logos/robin-cole/favicon.ico",
    );
  });

  console.log(`\n${checks} checks passed.\n`);
}

main();
