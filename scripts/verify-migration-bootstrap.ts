/**
 * Verify empty-database bootstrap via the guarded ordered migrate path.
 *
 * Usage (disposable local Postgres only):
 *   DATABASE_URI=postgres://…@127.0.0.1:5432/empty_db \
 *     npm run verify:migration-bootstrap
 *
 * Requires:
 * - Local Postgres target (remote refused)
 * - Database must have no user tables yet (or only empty payload_migrations)
 * - KXD_BOOTSTRAP_VERIFY=1
 *
 * Never prints credentials. Never targets production.
 */

import { Client } from "pg";
import {
  assertSafeWriteTarget,
  formatDbTarget,
  resolveDbTarget,
} from "./lib/payload-db-target";
import {
  applyOrderedMigrations,
  listOrderedMigrationNames,
} from "./lib/payload-migrate-ordered";

const CRITICAL_TABLES = [
  "payload_migrations",
  "clients",
  "reporting_sync_states",
  "reporting_facts",
  "client_launch_drafts",
  "client_inventory_vehicles",
  "client_requests",
  "work",
  "work_schedule_links",
] as const;

const CRITICAL_CLIENT_COLUMNS = [
  "commercial_agreement_id",
  "commercial_add_ons",
  "plan_key",
  "plan_status",
] as const;

function fail(message: string): never {
  console.error(`FAIL: ${message}`);
  process.exit(1);
}

async function assertDatabaseNearlyEmpty(connectionString: string): Promise<void> {
  const client = new Client({ connectionString });
  await client.connect();
  try {
    const { rows } = await client.query<{ table_name: string }>(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    const tables = rows.map((r) => r.table_name);
    const unexpected = tables.filter((t) => t !== "payload_migrations");
    if (unexpected.length > 0) {
      fail(
        `Database is not empty for bootstrap verify. Found tables: ${unexpected.slice(0, 12).join(", ")}${unexpected.length > 12 ? "…" : ""}`,
      );
    }
    if (tables.includes("payload_migrations")) {
      const count = await client.query<{ n: number }>(
        `SELECT count(*)::int AS n FROM payload_migrations`,
      );
      if (count.rows[0]?.n > 0) {
        fail("payload_migrations already has rows — use a fresh empty database");
      }
    }
    console.log("OK empty database (no user tables)");
  } finally {
    await client.end();
  }
}

async function verifySchema(connectionString: string): Promise<void> {
  const client = new Client({ connectionString });
  await client.connect();
  try {
    const ordered = listOrderedMigrationNames();
    const applied = await client.query<{ name: string }>(
      `SELECT name FROM payload_migrations ORDER BY name`,
    );
    const appliedNames = new Set(applied.rows.map((r) => r.name));
    const missing = ordered.filter((n) => !appliedNames.has(n));
    const extra = [...appliedNames].filter((n) => !ordered.includes(n));

    if (missing.length) {
      fail(`Missing applied migrations (${missing.length}): ${missing.slice(0, 5).join(", ")}`);
    }
    if (extra.length) {
      console.warn(`WARN extra migration rows not in index.ts: ${extra.join(", ")}`);
    }
    console.log(`OK applied migrations: ${applied.rows.length}/${ordered.length}`);

    for (const table of CRITICAL_TABLES) {
      const exists = await client.query<{ exists: boolean }>(
        `SELECT to_regclass($1) IS NOT NULL AS exists`,
        [`public.${table}`],
      );
      if (!exists.rows[0]?.exists) fail(`Missing table: ${table}`);
    }
    console.log(`OK critical tables (${CRITICAL_TABLES.length})`);

    for (const column of CRITICAL_CLIENT_COLUMNS) {
      const col = await client.query<{ exists: boolean }>(
        `
        SELECT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'clients'
            AND column_name = $1
        ) AS exists
        `,
        [column],
      );
      if (!col.rows[0]?.exists) fail(`Missing clients.${column}`);
    }
    console.log(`OK clients commercial/plan columns`);

    const syncCols = await client.query<{ column_name: string }>(
      `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'reporting_sync_states'
      ORDER BY column_name
      `,
    );
    const syncSet = new Set(syncCols.rows.map((r) => r.column_name));
    for (const required of [
      "client_id",
      "provider",
      "execution_status",
      "lease_expires_at",
      "last_completed_window_id",
      "integration_status",
    ]) {
      if (!syncSet.has(required)) {
        fail(`reporting_sync_states missing column ${required}`);
      }
    }
    console.log("OK reporting_sync_states reliability columns");
  } finally {
    await client.end();
  }
}

async function main(): Promise<void> {
  if (process.env.KXD_BOOTSTRAP_VERIFY?.trim() !== "1") {
    fail("Set KXD_BOOTSTRAP_VERIFY=1 to run empty-database bootstrap verification");
  }

  const target = resolveDbTarget();
  console.log(`[KXD] Bootstrap verify target: ${formatDbTarget(target)}`);
  assertSafeWriteTarget(target, "local");

  if (target.kind !== "local-postgres") {
    fail("verify:migration-bootstrap requires local Postgres (not SQLite)");
  }

  const uri =
    process.env.DATABASE_URI?.trim() || process.env.DATABASE_URL?.trim() || "";
  if (!uri) fail("DATABASE_URI / DATABASE_URL required");

  await assertDatabaseNearlyEmpty(uri);
  await applyOrderedMigrations();
  await verifySchema(uri);

  console.log("\nAll migration bootstrap checks passed.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
