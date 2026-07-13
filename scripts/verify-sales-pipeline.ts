/**
 * Sales pipeline schema / loader verification.
 * Confirms Payload-mapped column estimated_m_r_r exists (not legacy estimated_mrr).
 *
 * Run: npm run verify:sales-pipeline
 */

import pg from "pg";

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string): void {
  if (condition) {
    passed += 1;
    console.log(`  ✓ ${label}`);
  } else {
    failed += 1;
    console.error(`  ✗ ${label}`);
  }
}

async function main(): Promise<void> {
  console.log("\nSales pipeline — schema alignment\n");

  const url =
    process.env.DATABASE_URI || process.env.POSTGRES_URL || process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URI required");
    process.exit(1);
  }

  const client = new pg.Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  try {
    const table = await client.query(
      `SELECT to_regclass('public.sales_leads') AS reg`,
    );
    assert(table.rows[0]?.reg === "sales_leads", "sales_leads table exists");

    const cols = await client.query<{ column_name: string }>(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'sales_leads'
      ORDER BY ordinal_position
    `);
    const names = new Set(cols.rows.map((r) => r.column_name));

    assert(names.has("estimated_m_r_r"), "Payload column estimated_m_r_r exists");
    assert(!names.has("estimated_mrr"), "Legacy column estimated_mrr removed/renamed");

    const required = [
      "id",
      "status",
      "source",
      "assigned_to",
      "company_name",
      "contact_name",
      "email",
      "phone",
      "website",
      "industry",
      "tags",
      "notes",
      "estimated_value",
      "estimated_m_r_r",
      "probability",
      "next_follow_up",
      "updated_at",
      "created_at",
    ];
    for (const col of required) {
      assert(names.has(col), `column ${col} present`);
    }

    // Smoke SELECT matching Payload query shape
    const smoke = await client.query(`
      SELECT "id", "status", "source", "assigned_to", "company_name",
        "contact_name", "email", "phone", "website", "industry", "tags",
        "notes", "estimated_value", "estimated_m_r_r", "probability",
        "next_follow_up", "updated_at", "created_at"
      FROM "sales_leads"
      LIMIT 1
    `);
    assert(Array.isArray(smoke.rows), "Payload-shaped SELECT succeeds");
  } finally {
    await client.end();
  }

  console.log(`\n${passed} passed, ${failed} failed\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
