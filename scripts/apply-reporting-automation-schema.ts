/**
 * Optional one-shot schema apply for Phase 33A / 33A.1 when migrate hangs.
 * Production should prefer `npm run migrate` — this mirrors the migrations fully.
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

  await client.query(`
    ALTER TABLE client_infrastructure
      ADD COLUMN IF NOT EXISTS reporting_automation_enabled boolean DEFAULT true,
      ADD COLUMN IF NOT EXISTS reporting_sync_hour_pacific numeric DEFAULT 5
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS reporting_sync_states (
      id serial PRIMARY KEY,
      state_key varchar NOT NULL,
      client_id integer,
      provider varchar,
      automation_enabled boolean DEFAULT true,
      integration_status varchar DEFAULT 'idle',
      last_successful_sync_at timestamptz,
      last_failed_sync_at timestamptz,
      failure_reason varchar,
      consecutive_failures numeric DEFAULT 0,
      next_scheduled_sync_at timestamptz,
      last_completed_window_id varchar,
      last_outcome varchar,
      last_facts_written numeric DEFAULT 0,
      execution_status varchar DEFAULT 'idle',
      execution_run_id varchar,
      execution_started_at timestamptz,
      lease_expires_at timestamptz,
      updated_at timestamptz DEFAULT now() NOT NULL,
      created_at timestamptz DEFAULT now() NOT NULL
    )
  `);

  await client.query(`
    ALTER TABLE reporting_sync_states
      ADD COLUMN IF NOT EXISTS integration_status varchar DEFAULT 'idle',
      ADD COLUMN IF NOT EXISTS last_completed_window_id varchar,
      ADD COLUMN IF NOT EXISTS execution_status varchar DEFAULT 'idle',
      ADD COLUMN IF NOT EXISTS execution_run_id varchar,
      ADD COLUMN IF NOT EXISTS execution_started_at timestamptz,
      ADD COLUMN IF NOT EXISTS lease_expires_at timestamptz
  `);

  await client.query(
    `CREATE UNIQUE INDEX IF NOT EXISTS reporting_sync_states_state_key_idx ON reporting_sync_states (state_key)`,
  );
  await client.query(
    `CREATE UNIQUE INDEX IF NOT EXISTS reporting_sync_states_client_provider_uidx ON reporting_sync_states (client_id, provider)`,
  );
  await client.query(
    `CREATE INDEX IF NOT EXISTS reporting_sync_states_client_idx ON reporting_sync_states (client_id)`,
  );
  await client.query(
    `CREATE INDEX IF NOT EXISTS reporting_sync_states_provider_idx ON reporting_sync_states (provider)`,
  );
  await client.query(
    `CREATE INDEX IF NOT EXISTS reporting_sync_states_window_idx ON reporting_sync_states (last_completed_window_id)`,
  );
  await client.query(
    `CREATE INDEX IF NOT EXISTS reporting_sync_states_lease_idx ON reporting_sync_states (execution_status, lease_expires_at)`,
  );

  for (const name of [
    "20260714_phase33a_reporting_automation",
    "20260714_phase33a1_reporting_scheduler_reliability",
  ]) {
    try {
      await client.query(
        `
        INSERT INTO payload_migrations (name, batch, updated_at, created_at)
        SELECT $1, COALESCE(MAX(batch), 0) + 1, NOW(), NOW()
        FROM payload_migrations
        WHERE NOT EXISTS (
          SELECT 1 FROM payload_migrations WHERE name = $1
        )
      `,
        [name],
      );
    } catch (error) {
      console.log(
        "Migration registry note:",
        error instanceof Error ? error.message.slice(0, 160) : error,
      );
    }
  }

  const cols = await client.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'reporting_sync_states'
    ORDER BY column_name
  `);
  console.log(
    "reporting_sync_states columns:",
    cols.rows.map((r) => r.column_name),
  );
  console.log("Done.");
  await client.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
