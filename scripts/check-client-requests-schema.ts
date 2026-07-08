/**
 * One-off schema diagnostic — checks client_requests Website Review columns.
 * Run: npx tsx scripts/check-client-requests-schema.ts
 */
import { loadEnv } from "payload/node";
import path from "path";
import { fileURLToPath } from "url";
import pg from "pg";

const dirname = path.dirname(fileURLToPath(import.meta.url));
loadEnv(path.resolve(dirname, ".."));

const uri = process.env.DATABASE_URI?.trim() || process.env.DATABASE_URL?.trim();
if (!uri) {
  console.error("No DATABASE_URI / DATABASE_URL");
  process.exit(1);
}

const client = new pg.Client({ connectionString: uri });

async function main() {
  await client.connect();

  const cols = await client.query(`
    SELECT column_name, data_type, udt_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'client_requests'
    ORDER BY ordinal_position;
  `);

  console.log("client_requests columns:");
  for (const row of cols.rows) {
    console.log(`  - ${row.column_name} (${row.data_type}${row.udt_name ? ` / ${row.udt_name}` : ""})`);
  }

  const needed = ["experience_module", "page_context", "review_context"];
  const present = new Set(cols.rows.map((r) => r.column_name));
  const missing = needed.filter((c) => !present.has(c));
  console.log("\nWebsite Review columns missing:", missing.length ? missing.join(", ") : "none");

  const migrations = await client.query(`
    SELECT name, batch, created_at
    FROM payload_migrations
    WHERE name LIKE '%website_review%' OR name LIKE '%12c%'
    ORDER BY created_at;
  `);
  console.log("\nRelated payload_migrations:");
  if (migrations.rows.length === 0) {
    console.log("  (none found)");
  } else {
    for (const row of migrations.rows) {
      console.log(`  - ${row.name} (batch ${row.batch})`);
    }
  }

  const lastFive = await client.query(`
    SELECT name FROM payload_migrations ORDER BY created_at DESC LIMIT 8;
  `);
  console.log("\nLast applied migrations:");
  for (const row of lastFive.rows) {
    console.log(`  - ${row.name}`);
  }

  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
