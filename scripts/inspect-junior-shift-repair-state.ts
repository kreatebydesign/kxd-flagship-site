/**
 * Read-only inspection of Harlow/Sasha shift repair readiness.
 * Never mutates. Requires DATABASE_URL / DATABASE_URI in env.
 *
 *   npm run inspect:junior-shift-repair
 *   (load env via --env-file=... when invoking node/tsx)
 */
import { Client } from "pg";

function hostOf(url: string): string {
  try {
    const u = new URL(url.replace(/^postgres(ql)?:\/\//, "https://"));
    return `${u.hostname}${u.pathname}`;
  } catch {
    return "(unparseable)";
  }
}

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.DATABASE_URI;
  if (!url || !url.includes("postgres")) {
    throw new Error("DATABASE_URL / POSTGRES_URL / DATABASE_URI is required.");
  }

  console.log(`Inspect target: ${hostOf(url)}`);
  const c = new Client({
    connectionString: url,
    ssl: url.includes("localhost") || url.includes("127.0.0.1") ? false : { rejectUnauthorized: false },
  });
  await c.connect();

  const cols = await c.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema='public' AND table_name='junior_creator_shifts'
      AND column_name IN (
        'pay_adjustment_cents','correction_audit',
        'last_activity_at','stop_reason','automatic_stop_at'
      )
    ORDER BY 1`);
  const colSet = new Set(cols.rows.map((r) => String(r.column_name)));
  console.log("Correction/safety columns:", [...colSet].join(", ") || "(none)");

  const mig = await c.query(`
    SELECT name, batch, updated_at FROM payload_migrations
    WHERE name ILIKE '%junior_creator_shift_corrections%'
       OR name ILIKE '%junior_creator_timer_safety%'
    ORDER BY id`);
  console.log("Related migrations:", JSON.stringify(mig.rows));

  const juniors = await c.query(`
    SELECT id, display_name, hourly_rate_cents, active
    FROM junior_creator_users
    WHERE display_name ILIKE ANY(ARRAY['%Harlow%','%Sasha%'])
    ORDER BY id`);
  console.log("Juniors:", JSON.stringify(juniors.rows));

  const ids = juniors.rows.map((r) => r.id);
  if (!ids.length) {
    await c.end();
    return;
  }

  const optionalSelects = [
    colSet.has("pay_adjustment_cents") ? "pay_adjustment_cents" : "NULL::numeric AS pay_adjustment_cents",
    colSet.has("stop_reason") ? "stop_reason" : "NULL::varchar AS stop_reason",
    colSet.has("last_activity_at") ? "last_activity_at" : "NULL::timestamptz AS last_activity_at",
    colSet.has("automatic_stop_at") ? "automatic_stop_at" : "NULL::timestamptz AS automatic_stop_at",
    colSet.has("correction_audit")
      ? "CASE WHEN correction_audit IS NULL THEN 0 ELSE jsonb_array_length(correction_audit) END AS audit_len"
      : "0 AS audit_len",
  ];

  const shifts = await c.query(
    `
    SELECT id, junior_creator_user_id, status, week_key, started_at, ended_at,
           total_minutes, hourly_rate_cents,
           ${optionalSelects.join(",\n           ")},
           LEFT(COALESCE(notes,''), 120) AS notes_preview,
           ROUND((EXTRACT(EPOCH FROM (NOW() - started_at))/3600)::numeric, 2) AS hours_since_start
    FROM junior_creator_shifts
    WHERE junior_creator_user_id = ANY($1::int[])
    ORDER BY started_at DESC NULLS LAST, id DESC
  `,
    [ids],
  );

  console.log(`Shifts (${shifts.rows.length}):`);
  for (const row of shifts.rows) {
    console.log(JSON.stringify(row));
  }

  if (colSet.has("correction_audit")) {
    const markers = await c.query(
      `
      SELECT id, junior_creator_user_id, status, week_key, total_minutes
      FROM junior_creator_shifts
      WHERE junior_creator_user_id = ANY($1::int[])
        AND (
          correction_audit::text ILIKE '%scriptResetVoid%'
          OR correction_audit::text ILIKE '%scriptCreditCreate%'
        )
      ORDER BY id
    `,
      [ids],
    );
    console.log("Repair markers:", JSON.stringify(markers.rows));
  } else {
    console.log("Repair markers: (correction_audit column missing)");
  }

  await c.end();
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
