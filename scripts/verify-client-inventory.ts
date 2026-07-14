/**
 * Phase 34B — Client Inventory Platform verification (non-mutating).
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  deriveInventoryGroup,
  isPublicListableStatus,
  toPublicInventoryVehicle,
} from "../lib/inventory/public-map";
import { validateInventoryInput, normalizeInventoryInput } from "../lib/inventory/validate";
import { suggestInventorySlug, normalizeInventorySlug } from "../lib/inventory/slug";
import type { InventoryVehicleRecord } from "../lib/inventory/types";
import { PRIMAL_EXPERIENCE_PROFILE } from "../lib/ces/profile/primal";

const root = process.cwd();

function check(label: string, pass: boolean) {
  console.log(pass ? `  ✔ ${label}` : `  ✗ ${label}`);
  if (!pass) throw new Error(label);
}

function read(rel: string) {
  return readFileSync(path.join(root, rel), "utf8");
}

function fixture(partial: Partial<InventoryVehicleRecord>): InventoryVehicleRecord {
  return {
    id: 1,
    clientId: 9,
    title: "2024 Radical SR3",
    slug: "2024-radical-sr3",
    year: 2024,
    make: "Radical",
    model: "SR3",
    trim: null,
    condition: "new",
    listingStatus: "available",
    featured: true,
    price: 125000,
    priceDisplayMode: "exact",
    mileage: 120,
    vin: "SECRETVIN123456789",
    stockNumber: "PM-100",
    summary: "Track ready",
    description: "Full description",
    specifications: [{ label: "Engine", value: "RPE" }],
    highlights: [{ text: "Fresh service" }],
    primaryImage: { id: 1, url: "/media/car.jpg", alt: "Car" },
    gallery: [],
    sortOrder: 1,
    publishedAt: "2026-07-14T00:00:00.000Z",
    soldAt: null,
    externalUrl: null,
    createdBy: "a@b.com",
    updatedBy: "a@b.com",
    createdAt: null,
    updatedAt: null,
    ...partial,
  };
}

function main() {
  console.log("\nPhase 34B — verify:client-inventory\n");

  const collection = read("payload/collections/ClientInventoryVehicles.ts");
  const migration = read("migrations/20260714_phase34b_client_inventory_vehicles.ts");
  const migrationsIndex = read("migrations/index.ts");
  const payloadConfig = read("payload.config.ts");
  const types = read("lib/ces/types.ts");
  const registry = read("lib/ces/modules/registry.ts");
  const resolve = read("lib/ces/profile/resolve.ts");
  const publicMap = read("lib/inventory/public-map.ts");
  const publicRoute = read("app/api/public/inventory/[clientSlug]/route.ts");
  const portalRoute = read("app/api/portal/inventory/route.ts");
  const launchSafety = read("lib/portal/ces-launch-safety.ts");
  const tabs = read("lib/client-command/tabs.ts");

  check(
    "collection ClientInventoryVehicles exists",
    collection.includes('slug: "client-inventory-vehicles"'),
  );
  check(
    "migration registered",
    migrationsIndex.includes("20260714_phase34b_client_inventory_vehicles") &&
      migration.includes("client_inventory_vehicles"),
  );
  check(
    "payload.config registers collection",
    payloadConfig.includes("ClientInventoryVehicles"),
  );
  check(
    "CES module id includes inventory",
    types.includes('"inventory"') &&
      resolve.includes('"inventory"') &&
      registry.includes('moduleId: "inventory"'),
  );
  check(
    "Primal entitlements include inventory only as intentional enablement",
    (PRIMAL_EXPERIENCE_PROFILE.enabledModules as readonly string[]).includes(
      "inventory",
    ),
  );
  check(
    "portal launch safety allows inventory when enabled",
    launchSafety.includes('navId === "inventory"'),
  );
  check(
    "operations Client Command includes inventory tab",
    tabs.includes('{ id: "inventory", label: "Inventory" }'),
  );
  check(
    "public API routes exist",
    publicRoute.includes("listPublicInventory") &&
      read("app/api/public/inventory/[clientSlug]/[vehicleSlug]/route.ts").includes(
        "getPublicInventoryVehicle",
      ),
  );
  check(
    "portal API is CES gated",
    portalRoute.includes('isCesModuleEnabled(profile, "inventory")'),
  );
  check(
    "no radical_models in inventory platform",
    !collection.includes("radical_models") &&
      !publicMap.includes("radical_models") &&
      !read("lib/inventory/types.ts").includes("radical_models"),
  );
  check(
    "no stored section field",
    !collection.includes('name: "section"') &&
      publicMap.includes("deriveInventoryGroup"),
  );

  check(
    "slug normalization is url-safe",
    normalizeInventorySlug("2024 Radical SR3!!") === "2024-radical-sr3",
  );
  check(
    "slug suggestion from identity fields",
    suggestInventorySlug({
      year: 2024,
      make: "Radical",
      model: "SR3",
    }) === "2024-radical-sr3",
  );

  const invalid = validateInventoryInput({
    title: "",
    make: "",
    model: "",
    condition: "used",
  });
  check("validation requires identity fields", invalid.length >= 3);

  const normalized = normalizeInventoryInput({
    title: "Track Car",
    make: "Radical",
    model: "SR3",
    condition: "new",
  });
  check("normalize supplies slug", Boolean(normalized.slug));

  check(
    "group derivation: coming_soon overrides condition",
    deriveInventoryGroup({
      listingStatus: "coming_soon",
      condition: "used",
    }) === "coming_soon",
  );
  check(
    "group derivation: new condition",
    deriveInventoryGroup({
      listingStatus: "available",
      condition: "new",
    }) === "new",
  );
  check(
    "group derivation: used condition",
    deriveInventoryGroup({
      listingStatus: "pending",
      condition: "used",
    }) === "used",
  );

  check("available is public-listable", isPublicListableStatus("available"));
  check("pending is public-listable", isPublicListableStatus("pending"));
  check("coming_soon is public-listable", isPublicListableStatus("coming_soon"));
  check("draft is not public-listable", !isPublicListableStatus("draft"));
  check("sold is not public-listable", !isPublicListableStatus("sold"));
  check("hidden is not public-listable", !isPublicListableStatus("hidden"));

  const pub = toPublicInventoryVehicle(fixture({}));
  check("public mapper returns vehicle for available", Boolean(pub));
  check("public mapper omits VIN", pub != null && !("vin" in pub));
  check(
    "public mapper includes inventoryGroup",
    pub?.inventoryGroup === "new",
  );
  check(
    "public image URLs are absolute",
    Boolean(pub?.primaryImage?.url?.startsWith("http")),
  );

  const draftPublic = toPublicInventoryVehicle(fixture({ listingStatus: "draft" }));
  check("draft excluded from public mapper", draftPublic === null);

  const soldPublic = toPublicInventoryVehicle(fixture({ listingStatus: "sold" }));
  check("sold excluded from public mapper", soldPublic === null);

  check(
    "media helper uses resolvePublicMediaOrigin / public media collection",
    read("lib/inventory/media.ts").includes("resolvePublicMediaOrigin") &&
      read("lib/inventory/media.ts").includes("localhost:3000") &&
      read("app/api/portal/inventory/upload/route.ts").includes('collection: "media"'),
  );
  check(
    "upload does not use client-review-media",
    !read("app/api/portal/inventory/upload/route.ts").includes("client-review-media"),
  );

  console.log("\nPhase 34B verification passed.\n");
}

main();
