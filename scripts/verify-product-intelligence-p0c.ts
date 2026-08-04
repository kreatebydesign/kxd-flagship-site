/**
 * KXD Product Intelligence — Phase 0 Batch C
 * System Map & Automatic Platform Inventory.
 *
 * Run: npm run verify:product-intelligence-p0c
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  attachAutomaticInventory,
  createProductIntelligenceIndex,
  PRODUCT_INTELLIGENCE_INVENTORY_VERSION,
  PRODUCT_PURPOSE_REGISTRY,
  runAutomaticInventory,
  verifyInventoryIntegrity,
  verifyProductIntelligenceConsistency,
} from "../lib/product-intelligence/index.ts";

const root = process.cwd();

function check(label: string, pass: boolean, detail?: string) {
  console.log(
    pass ? `  ✔ ${label}` : `  ✘ ${label}${detail ? ` — ${detail}` : ""}`,
  );
  assert.ok(pass, detail ? `${label}: ${detail}` : label);
}

function main() {
  console.log("\nKXD Product Intelligence — P0-C automatic inventory\n");

  check(
    "inventory version is P0-C",
    PRODUCT_INTELLIGENCE_INVENTORY_VERSION === "P0-C",
  );

  const requiredFiles = [
    "lib/product-intelligence/inventory/run.ts",
    "lib/product-intelligence/inventory/discover.ts",
    "lib/product-intelligence/inventory/ownership.ts",
    "lib/product-intelligence/inventory/graph.ts",
    "lib/product-intelligence/inventory/integrity.ts",
    "docs/KXD-PRODUCT-INTELLIGENCE.md",
  ];
  for (const rel of requiredFiles) {
    check(`file exists: ${rel}`, existsSync(path.join(root, rel)));
  }

  const inventory = runAutomaticInventory(root);
  check("automatic inventory succeeds", inventory.schemaVersion === "P0-C");
  check("integrity ok", inventory.integrity.ok, inventory.integrity.unlinkedItems.join(", "));
  check("route inventory non-empty", inventory.coverage.routeCount > 50);
  check("api inventory non-empty", inventory.coverage.apiCount > 50);
  check("collection inventory non-empty", inventory.coverage.collectionCount > 50);
  check("module inventory non-empty", inventory.coverage.moduleCount >= 20);
  check("capability registry non-empty", inventory.coverage.capabilityCount > 20);
  check("integration registry non-empty", inventory.coverage.integrationCount >= 8);
  check("verifier registry non-empty", inventory.coverage.verifierCount > 20);
  check("product purpose registry present", PRODUCT_PURPOSE_REGISTRY.length >= 10);
  check(
    "Today purpose sentence present",
    PRODUCT_PURPOSE_REGISTRY.some(
      (p) =>
        p.productId === "today" &&
        /thirty seconds/i.test(p.purpose),
    ),
  );
  check(
    "ownership complete — every inventory object has ownerSurface",
    inventory.inventoryObjects.every((obj) => Boolean(obj.detail.ownerSurface)),
  );
  check(
    "dependencies linked",
    inventory.dependencies.length > 0 &&
      inventory.dependencies.some((d) => d.kind === "shared_core"),
  );
  check(
    "no orphan routes",
    inventory.integrity.orphanRoutes.length === 0,
  );
  check(
    "no orphan collections",
    inventory.integrity.orphanCollections.length === 0,
  );
  check(
    "no orphan capabilities",
    inventory.integrity.orphanCapabilities.length === 0,
  );
  check(
    "no duplicate ownership",
    inventory.integrity.duplicateOwnership.length === 0,
    inventory.integrity.duplicateOwnership.join("; "),
  );
  check(
    "dependency health computed",
    inventory.dependencyHealth.sharedCoreUsageCount > 0 &&
      Array.isArray(inventory.dependencyHealth.circularDependencies),
  );

  const recheck = verifyInventoryIntegrity({
    systemMap: inventory.systemMap,
    capabilities: inventory.capabilities,
    allItems: [
      ...inventory.systemMap.products,
      ...inventory.systemMap.routes,
      ...inventory.systemMap.collections,
    ],
  });
  check("integrity re-check ok", recheck.ok);

  const attached = attachAutomaticInventory(
    createProductIntelligenceIndex(),
    inventory,
  );
  check(
    "attach populates product inventory store",
    attached.stores.productInventory.length === inventory.inventoryObjects.length,
  );
  check(
    "attach does not populate Hall of Fame / Kill List / Future Bets",
    attached.stores.hallOfFame.length === 0 &&
      attached.stores.productKillList.length === 0 &&
      attached.stores.futureBets.length === 0,
  );

  const contractConsistency = verifyProductIntelligenceConsistency();
  check(
    "P0-A/B contract consistency still ok",
    contractConsistency.ok,
    contractConsistency.issues.map((i) => i.message).join("; "),
  );

  const docs = readFileSync(
    path.join(root, "docs/KXD-PRODUCT-INTELLIGENCE.md"),
    "utf8",
  );
  check("PI doc records P0-C", /P0-C/.test(docs));
  check(
    "PI doc does not claim Hall of Fame populated",
    !/Hall of Fame populated/i.test(docs),
  );

  const currentState = readFileSync(
    path.join(root, "docs/KXD-OS-CURRENT-STATE.md"),
    "utf8",
  );
  check(
    "Current State mentions P0-C",
    /P0-C/i.test(currentState) && /Product Intelligence/i.test(currentState),
  );

  const roadmap = readFileSync(path.join(root, "docs/KXD-OS-ROADMAP.md"), "utf8");
  check("Roadmap mentions P0-C", /P0-C/i.test(roadmap));

  console.log("\nCoverage snapshot:");
  console.log(`  routes: ${inventory.coverage.routeCount}`);
  console.log(`  apis: ${inventory.coverage.apiCount}`);
  console.log(`  collections: ${inventory.coverage.collectionCount}`);
  console.log(`  modules: ${inventory.coverage.moduleCount}`);
  console.log(`  capabilities: ${inventory.coverage.capabilityCount}`);
  console.log(`  integrations: ${inventory.coverage.integrationCount}`);
  console.log(`  verifiers: ${inventory.coverage.verifierCount}`);
  console.log(`  inventory objects: ${inventory.coverage.inventoryObjectCount}`);
  console.log("\nAll P0-C inventory checks passed.\n");
}

main();
