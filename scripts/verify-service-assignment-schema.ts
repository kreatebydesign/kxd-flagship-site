/**
 * Read-only local schema + Payload boot check for client-service-assignments.
 * Refuses remote/production databases.
 * Run: npm run verify:service-assignment-schema
 */
import { Client } from "pg";
import { getPayload } from "payload";
import config from "../payload.config.ts";
import {
  assertSafeWriteTarget,
  formatDbTarget,
  resolveDbTarget,
} from "./lib/payload-db-target.ts";

async function main() {
  const target = resolveDbTarget();
  console.log(`[KXD] Schema verify target: ${formatDbTarget(target)}`);
  assertSafeWriteTarget(target, "local");

  const connectionString = process.env.DATABASE_URI?.trim() || process.env.DATABASE_URL?.trim();
  if (!connectionString) {
    throw new Error("Local DATABASE_URI / DATABASE_URL is required.");
  }

  const client = new Client({ connectionString });
  await client.connect();
  try {
    // confdeltype: a=no action, r=restrict, c=cascade, n=set null, d=set default
    const delTypes = await client.query<{
      constraint_name: string;
      confdeltype: string;
      confupdtype: string;
    }>(`
      SELECT c.conname AS constraint_name, c.confdeltype, c.confupdtype
      FROM pg_constraint c
      JOIN pg_class t ON t.oid = c.conrelid
      WHERE t.relname = 'client_service_assignments' AND c.contype = 'f'
    `);

    const clientFk = delTypes.rows.find((row) => row.constraint_name.includes("client_id"));
    const contractFk = delTypes.rows.find((row) =>
      row.constraint_name.includes("related_contract"),
    );
    if (!clientFk || clientFk.confdeltype !== "r") {
      throw new Error(
        `Client FK must be RESTRICT. Found ${clientFk?.constraint_name ?? "none"} del=${clientFk?.confdeltype ?? "?"}`,
      );
    }
    if (!contractFk || contractFk.confdeltype !== "n") {
      throw new Error(
        `Contract FK must be SET NULL. Found ${contractFk?.constraint_name ?? "none"} del=${contractFk?.confdeltype ?? "?"}`,
      );
    }

    const indexes = await client.query<{ indexname: string }>(`
      SELECT indexname FROM pg_indexes
      WHERE tablename = 'client_service_assignments'
    `);
    const names = indexes.rows.map((row) => row.indexname);
    for (const required of [
      "client_service_assignments_client_status_idx",
      "client_service_assignments_client_capability_status_idx",
      "client_service_assignments_related_contract_idx",
    ]) {
      if (!names.includes(required)) {
        throw new Error(`Missing index ${required}. Have: ${names.join(", ")}`);
      }
    }

    const column = await client.query(`
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'clients' AND column_name = 'commercial_relationship_label'
    `);
    if (!column.rowCount) {
      throw new Error("clients.commercial_relationship_label is missing.");
    }

    console.log("  ✔ local table, RESTRICT client FK, SET NULL contract FK, indexes present");
  } finally {
    await client.end();
  }

  const payload = await getPayload({ config });
  const found = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "client-service-assignments" as any,
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  console.log(
    `  ✔ Payload boot + collection readable (docs=${found.totalDocs}, limit check only)`,
  );
  if (typeof payload.destroy === "function") {
    await payload.destroy();
  }
  console.log("\nService assignment schema verification passed.\n");
  process.exit(0);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
