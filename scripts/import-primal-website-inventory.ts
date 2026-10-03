/**
 * Import live primalmotorsports.com inventory into canonical client-inventory-vehicles.
 *
 * Dry-run (default):
 *   npx tsx --import ./scripts/shims/register-server-only.mjs scripts/import-primal-website-inventory.ts
 *
 * Apply after review:
 *   npx tsx --import ./scripts/shims/register-server-only.mjs scripts/import-primal-website-inventory.ts --apply
 *
 * Optional:
 *   --remove-test-listing   delete confirmed "2024 Radical Test" hidden QA row
 *   --status-proof          create/cycle/delete a hidden QA vehicle (never mutates real listings)
 */
import { getPayload } from "payload";
import config from "@payload-config";
import { PRIMAL_CLIENT_SLUG } from "../lib/ces/profile/primal";
import { INVENTORY_COLLECTION } from "../lib/inventory/constants";
import {
  PRIMAL_WEBSITE_INVENTORY_ORIGIN,
  PRIMAL_WEBSITE_INVENTORY_PATH,
  PRIMAL_WEBSITE_SOURCE_SYSTEM,
  mapPrimalWebsiteVehicle,
  parsePrimalWebsiteInventoryHtml,
} from "../lib/inventory/primal-website-source";
import {
  listInventoryForClient,
  listPublicInventory,
  updateInventoryVehicle,
  upsertInventoryVehicleFromSource,
} from "../lib/inventory/server";
import type { InventoryListingStatus, InventoryVehicleInput } from "../lib/inventory/types";
import { sql } from "drizzle-orm";

const APPLY = process.argv.includes("--apply");
const REMOVE_TEST = process.argv.includes("--remove-test-listing");
const STATUS_PROOF = process.argv.includes("--status-proof");
const TEST_TITLE = "2024 Radical Test";
const STATUS_PROOF_SLUG = "kxd-inventory-status-proof";

function fail(message: string): never {
  throw new Error(message);
}

async function fetchListingHtml(): Promise<string> {
  const url = `${PRIMAL_WEBSITE_INVENTORY_ORIGIN}${PRIMAL_WEBSITE_INVENTORY_PATH}`;
  const res = await fetch(url, {
    headers: { "user-agent": "Mozilla/5.0 (compatible; KXD-Inventory-Import/1.0)" },
    cache: "no-store",
  });
  if (!res.ok) fail(`Could not fetch live inventory (${res.status}).`);
  return res.text();
}

function mappedStatus(data: InventoryVehicleInput): InventoryListingStatus {
  return data.listingStatus ?? "draft";
}

async function main() {
  console.log(`\nPrimal website inventory import (${APPLY ? "APPLY" : "DRY-RUN"})`);
  const html = await fetchListingHtml();
  const manifest = parsePrimalWebsiteInventoryHtml(html);
  if (manifest.vehicles.length === 0) {
    fail("Live inventory page parsed zero vehicles.");
  }

  const mapped = manifest.vehicles.map((vehicle, index) => {
    const row = mapPrimalWebsiteVehicle({ vehicle });
    if (!row) fail(`Could not map ${vehicle.id}.`);
    return {
      vehicle,
      ...row,
      data: {
        ...row.data,
        sortOrder: index + 1,
        featured: vehicle.id === "veh_sr3_new_01",
      },
    };
  });

  const ids = mapped.map((row) => row.sourceExternalId);
  const dup = ids.filter((id, i) => ids.indexOf(id) !== i);
  if (dup.length) fail(`Duplicate source ids: ${[...new Set(dup)].join(", ")}`);

  const newCount = mapped.filter((row) => row.data.condition === "new").length;
  const usedCount = mapped.filter((row) => row.data.condition === "used").length;

  console.log(`Live listing: ${manifest.listingUrl}`);
  console.log(`Public detail paths: ${manifest.publicPaths.join(", ") || "(none)"}`);
  console.log(`Vehicles: ${mapped.length} (new ${newCount}, used ${usedCount})`);
  for (const row of mapped) {
    console.log({
      sourceExternalId: row.sourceExternalId,
      title: row.data.title,
      year: row.data.year,
      make: row.data.make,
      model: row.data.model,
      trim: row.data.trim,
      condition: row.data.condition,
      listingStatus: row.data.listingStatus,
      price: row.data.price,
      priceDisplayMode: row.data.priceDisplayMode,
          stockNumber: row.data.stockNumber,
          vin: row.data.vin,
          mileage: row.data.mileage,
          media: row.vehicle.mediaRefs.length,
          referencedPrimary: row.data.referencedMedia?.primary?.url ?? null,
          slug: row.data.slug,
      externalUrl: row.data.externalUrl,
    });
  }

  const payload = await getPayload({ config });
  const drizzle = payload.db.drizzle as { execute: (query: unknown) => Promise<unknown> };
  await drizzle.execute(
    sql`ALTER TABLE "client_inventory_vehicles" ADD COLUMN IF NOT EXISTS "referenced_media" jsonb`,
  );
  const clients = await payload.find({
    collection: "clients",
    where: { slug: { equals: PRIMAL_CLIENT_SLUG } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  const clientId = Number(clients.docs[0]?.id);
  if (!Number.isFinite(clientId)) fail("Primal client not found.");

  const existing = await listInventoryForClient(payload, clientId, { limit: 500 });
  const bySource = new Map(
    existing
      .filter(
        (row) =>
          row.sourceSystem === PRIMAL_WEBSITE_SOURCE_SYSTEM && row.sourceExternalId,
      )
      .map((row) => [row.sourceExternalId as string, row]),
  );
  const testRows = existing.filter(
    (row) =>
      row.title === TEST_TITLE &&
      row.listingStatus === "hidden" &&
      row.sourceSystem == null,
  );

  const plan = mapped.map((row) => {
    const current = bySource.get(row.sourceExternalId);
    return {
      action: current ? "update" : "create",
      sourceExternalId: row.sourceExternalId,
      id: current?.id ?? null,
      preserveStatus: current ? current.listingStatus : mappedStatus(row.data),
    };
  });
  console.log("\nPlan", plan);
  console.log(
    `Test listing "${TEST_TITLE}": ${testRows.length} hidden row(s) without source identity.`,
  );

  if (!APPLY) {
    console.log("\nDry run only. No records written. Re-run with --apply after review.");
    process.exit(0);
    return;
  }

  if (REMOVE_TEST) {
    if (testRows.length === 0) {
      console.log(`No hidden "${TEST_TITLE}" row remaining.`);
    } else if (testRows.length !== 1) {
      fail(
        `Refusing to delete test listing: expected exactly one hidden "${TEST_TITLE}" without source identity, found ${testRows.length}.`,
      );
    } else {
      await payload.delete({
        collection: INVENTORY_COLLECTION as never,
        id: testRows[0]!.id,
        overrideAccess: true,
      });
      console.log(`Removed test listing id=${testRows[0]!.id}`);
    }
  }

  let created = 0;
  let updated = 0;
  for (const row of mapped) {
    const result = await upsertInventoryVehicleFromSource(payload, {
      clientId,
      actor: "inventory-import:primal-website",
      source: {
        sourceSystem: row.sourceSystem,
        sourceExternalId: row.sourceExternalId,
      },
      data: row.data,
    });
    if (!result.ok) fail(`${row.sourceExternalId}: ${result.message}`);
    if (result.action === "created") created += 1;
    else updated += 1;

    if (result.action === "created") {
      const status = mappedStatus(row.data);
      const published = await updateInventoryVehicle(payload, {
        clientId,
        vehicleId: result.vehicle.id,
        actor: "inventory-import:primal-website",
        data: { listingStatus: status },
      });
      if (!published.ok) fail(`${row.sourceExternalId}: ${published.message}`);
    }
  }

  console.log(`Import complete: ${created} created, ${updated} updated.`);

  if (STATUS_PROOF) {
    await runStatusProof(payload, clientId);
  }

  const final = await listInventoryForClient(payload, clientId, { limit: 500 });
  const publicList = await listPublicInventory(payload, PRIMAL_CLIENT_SLUG);
  console.log({
    kxdCount: final.length,
    publicCount: publicList.length,
    statuses: Object.fromEntries(
      [...new Set(final.map((row) => row.listingStatus))].map((status) => [
        status,
        final.filter((row) => row.listingStatus === status).length,
      ]),
    ),
  });
}

async function runStatusProof(
  payload: Awaited<ReturnType<typeof getPayload>>,
  clientId: number,
) {
  const created = await payload.create({
    collection: INVENTORY_COLLECTION as never,
    data: {
      client: clientId,
      title: "KXD Inventory Status Proof",
      slug: STATUS_PROOF_SLUG,
      make: "Radical",
      model: "StatusProof",
      condition: "used",
      listingStatus: "hidden",
      priceDisplayMode: "hidden",
      summary: "Temporary status-flow fixture. Not a sale listing.",
      sourceSystem: "primal-website-qa",
      sourceExternalId: STATUS_PROOF_SLUG,
    } as never,
    overrideAccess: true,
  });
  const id = Number((created as { id?: number }).id);
  const sequence: InventoryListingStatus[] = [
    "coming_soon",
    "available",
    "pending",
    "sold",
    "hidden",
  ];
  const results: Array<{ status: InventoryListingStatus; public: boolean }> = [];
  for (const listingStatus of sequence) {
    const updated = await updateInventoryVehicle(payload, {
      clientId,
      vehicleId: id,
      actor: "inventory-status-proof",
      data: { listingStatus },
    });
    if (!updated.ok) fail(`Status proof failed at ${listingStatus}: ${updated.message}`);
    const publicList = await listPublicInventory(payload, PRIMAL_CLIENT_SLUG);
    results.push({
      status: listingStatus,
      public: publicList.some((row) => row.slug === STATUS_PROOF_SLUG),
    });
  }
  await payload.delete({
    collection: INVENTORY_COLLECTION as never,
    id,
    overrideAccess: true,
  });
  console.log("Status proof (KXD public API only; live Primal website unchanged)", results);
}

void main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
