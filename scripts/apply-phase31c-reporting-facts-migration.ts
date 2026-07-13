/**
 * Apply Phase 31C reporting_facts migration when `payload migrate` prompts interactively.
 * Additive only. Run: npx tsx scripts/apply-phase31c-reporting-facts-migration.ts
 */
import { loadEnv } from "payload/node";
import path from "path";
import { fileURLToPath } from "url";
import pg from "pg";
import fs from "fs";

const dirname = path.dirname(fileURLToPath(import.meta.url));
loadEnv(path.resolve(dirname, ".."));

const MIGRATION_NAME = "20260713_phase31c_reporting_facts";

const uri = process.env.DATABASE_URI?.trim() || process.env.DATABASE_URL?.trim();
if (!uri) {
  console.error("No DATABASE_URI / DATABASE_URL");
  process.exit(1);
}

const client = new pg.Client({ connectionString: uri });

function extractSqlBlocks(source: string): string[] {
  const blocks: string[] = [];
  const re = /await db\.execute\(sql`([\s\S]*?)`\);/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(source)) != null) {
    blocks.push(match[1].trim());
  }
  return blocks;
}

async function main() {
  await client.connect();

  const existing = await client.query(
    "SELECT name FROM payload_migrations WHERE name = $1",
    [MIGRATION_NAME],
  );
  if (existing.rows.length > 0) {
    console.log(`${MIGRATION_NAME} already registered.`);
    const table = await client.query(
      "SELECT to_regclass('public.reporting_facts') AS name",
    );
    console.log("reporting_facts:", table.rows[0]?.name);
    await client.end();
    return;
  }

  const migrationPath = path.resolve(
    dirname,
    "../migrations/20260713_phase31c_reporting_facts.ts",
  );
  const source = fs.readFileSync(migrationPath, "utf8");
  const upSource = source.split("export async function down")[0] ?? source;
  const blocks = extractSqlBlocks(upSource);
  if (blocks.length === 0) {
    throw new Error("No SQL blocks found in migration file.");
  }

  console.log(`Executing ${blocks.length} SQL statements…`);
  for (const block of blocks) {
    await client.query(block);
  }

  const batchRes = await client.query(
    "SELECT COALESCE(MAX(batch), 0) + 1 AS next FROM payload_migrations",
  );
  const batch = batchRes.rows[0].next as number;
  await client.query(
    "INSERT INTO payload_migrations (name, batch, updated_at, created_at) VALUES ($1, $2, NOW(), NOW())",
    [MIGRATION_NAME, batch],
  );

  const table = await client.query(
    "SELECT to_regclass('public.reporting_facts') AS name",
  );
  const idx = await client.query(`
    SELECT indexname FROM pg_indexes
    WHERE tablename = 'reporting_facts'
    ORDER BY indexname
  `);

  console.log("Applied", MIGRATION_NAME, "batch", batch);
  console.log("reporting_facts:", table.rows[0]?.name);
  console.log(
    "indexes:",
    idx.rows.map((r) => r.indexname).join(", "),
  );

  await client.end();
}

main().catch(async (err) => {
  console.error(err);
  try {
    await client.end();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
