/**
 * One-shot additive column apply for Google Ads infra fields.
 * Prefer `npm run migrate` in normal ops; this unblocks when migrate hangs.
 */
import { readFileSync } from "node:fs";
import pg from "pg";

function loadEnvLocal() {
  try {
    const raw = readFileSync(".env.local", "utf8");
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    /* optional */
  }
}

async function main() {
  loadEnvLocal();
  const url =
    process.env.DATABASE_URI || process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url) {
    console.error("No DATABASE_URI / DATABASE_URL / POSTGRES_URL");
    process.exit(1);
  }

  const client = new pg.Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  await client.query(
    `ALTER TABLE client_infrastructure ADD COLUMN IF NOT EXISTS google_ads_customer_id varchar`,
  );
  await client.query(
    `ALTER TABLE client_infrastructure ADD COLUMN IF NOT EXISTS google_ads_login_customer_id varchar`,
  );

  const rows = await client.query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_name = 'client_infrastructure'
       AND column_name LIKE 'google_ads%'
     ORDER BY column_name`,
  );
  console.log("Ads columns present:", rows.rows.map((r) => r.column_name));

  try {
    await client.query(
      `INSERT INTO payload_migrations (name, batch, updated_at, created_at)
       SELECT '20260713_phase32b_google_ads_customer_fields', COALESCE(MAX(batch), 0) + 1, NOW(), NOW()
       FROM payload_migrations
       WHERE NOT EXISTS (
         SELECT 1 FROM payload_migrations
         WHERE name = '20260713_phase32b_google_ads_customer_fields'
       )`,
    );
  } catch (error) {
    console.log(
      "Migration registry note:",
      error instanceof Error ? error.message.slice(0, 160) : error,
    );
  }

  await client.end();
  console.log("Done.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
