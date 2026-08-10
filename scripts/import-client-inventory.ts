/**
 * Reviewed, repeatable inventory import.
 *
 * Dry-run is the default:
 *   npx tsx scripts/import-client-inventory.ts --client 14 --source dealer-feed --file ./verified.json
 *
 * Add --apply only after the real unit-level records have been reviewed.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { getPayload } from "payload";
import config from "@payload-config";
import {
  normalizeInventorySourceIdentity,
  type InventorySourceVehicleInput,
  type InventoryVehicleInput,
  validateInventoryInput,
} from "@/lib/inventory";
import { upsertInventoryVehicleFromSource } from "@/lib/inventory/server";

type JsonRow = {
  sourceExternalId?: unknown;
  data?: unknown;
};

function option(name: string): string | null {
  const index = process.argv.indexOf(name);
  return index >= 0 ? (process.argv[index + 1] ?? null) : null;
}

function fail(message: string): never {
  throw new Error(message);
}

async function main() {
  const clientId = Number(option("--client"));
  const sourceSystem = option("--source")?.trim() ?? "";
  const file = option("--file")?.trim() ?? "";
  const apply = process.argv.includes("--apply");

  if (!Number.isInteger(clientId) || clientId <= 0) {
    fail("Provide a positive integer with --client.");
  }
  if (!file) fail("Provide the reviewed JSON file with --file.");
  const sourceCheck = normalizeInventorySourceIdentity({
    sourceSystem,
    sourceExternalId: "validation",
  });
  if (!sourceCheck) fail("Provide a stable source name with --source.");

  const raw = JSON.parse(await readFile(path.resolve(file), "utf8")) as unknown;
  if (!Array.isArray(raw) || raw.length === 0) {
    fail("The import file must contain a non-empty JSON array.");
  }

  const seen = new Set<string>();
  const rows: InventorySourceVehicleInput[] = raw.map((value, index) => {
    const row = value as JsonRow;
    const sourceExternalId = String(row?.sourceExternalId ?? "").trim();
    const source = normalizeInventorySourceIdentity({
      sourceSystem: sourceCheck.sourceSystem,
      sourceExternalId,
    });
    if (!source) fail(`Row ${index + 1}: sourceExternalId is required.`);
    if (seen.has(source.sourceExternalId)) {
      fail(`Row ${index + 1}: duplicate sourceExternalId ${source.sourceExternalId}.`);
    }
    seen.add(source.sourceExternalId);

    const data = row?.data as InventoryVehicleInput;
    if (!data || typeof data !== "object") {
      fail(`Row ${index + 1}: data must be an inventory vehicle object.`);
    }
    const issues = validateInventoryInput({ ...data, listingStatus: "draft" });
    if (issues.length > 0) {
      fail(`Row ${index + 1}: ${issues.map((issue) => issue.message).join(" ")}`);
    }
    return { source, data: { ...data, listingStatus: "draft" } };
  });

  console.log(
    `${apply ? "Applying" : "Dry run validated"} ${rows.length} reviewed inventory record${
      rows.length === 1 ? "" : "s"
    } for client ${clientId} from ${sourceCheck.sourceSystem}.`,
  );
  if (!apply) {
    console.log("No records were written. Re-run with --apply after review.");
    return;
  }

  const payload = await getPayload({ config });
  let created = 0;
  let updated = 0;
  for (const row of rows) {
    const result = await upsertInventoryVehicleFromSource(payload, {
      clientId,
      source: row.source,
      data: row.data,
      actor: `inventory-import:${sourceCheck.sourceSystem}`,
    });
    if (!result.ok) fail(`${row.source.sourceExternalId}: ${result.message}`);
    if (result.action === "created") created += 1;
    else updated += 1;
  }
  console.log(`Inventory import complete: ${created} created, ${updated} updated.`);
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
