/**
 * LOCAL ONLY — minimal Client Command fixtures in disposable QA SQLite (no Payload boot).
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const root = process.cwd();
const qaDb =
  process.env.KXD_QA_SQLITE_ABSPATH?.trim() ||
  path.join(root, "storage/qa/batch1-nav.sqlite");

function sql(statement: string): string {
  return execSync(`sqlite3 ${JSON.stringify(qaDb)} ${JSON.stringify(statement)}`, {
    encoding: "utf8",
  }).trim();
}

function main() {
  if (!fs.existsSync(qaDb)) {
    console.error(`[batch1-qa-fixtures] Missing ${qaDb}`);
    process.exit(1);
  }

  const existing = sql("SELECT COUNT(*) FROM clients;");
  if (existing !== "0") {
    const id = sql("SELECT id FROM clients ORDER BY updated_at DESC LIMIT 1;");
    console.log(`[batch1-qa-fixtures] Clients present — using id=${id}`);
    writeMeta(Number(id));
    return;
  }

  sql(
    "INSERT INTO clients (name, slug, status, relationship_status, primary_contact_name, primary_contact_email, monthly_retainer_amount) VALUES ('Batch 1 QA Client', 'batch1-qa-client', 'active', 'healthy', 'QA Contact', 'qa-contact@localhost.invalid', 2500);",
  );
  const clientId = Number(sql("SELECT id FROM clients WHERE slug='batch1-qa-client' LIMIT 1;"));

  sql(
    `INSERT INTO executive_client_profiles (client_id, profile_title, relationship_status, current_monthly_revenue, estimated_annual_value) VALUES (${clientId}, 'Batch 1 QA Profile', 'active', 2500, 30000);`,
  );

  sql(
    `INSERT INTO client_projects (client_id, project_name, status) VALUES (${clientId}, 'QA Active Project', 'active');`,
  );

  sql(
    `INSERT INTO retainers (client_id, retainer_name, billing_status, monthly_amount) VALUES (${clientId}, 'QA Retainer', 'active', 2500);`,
  );

  sql(
    `INSERT INTO client_requests (client_id, request_title, status) VALUES (${clientId}, 'QA Open Request', 'in-progress');`,
  );

  console.log(`[batch1-qa-fixtures] Seeded client id=${clientId}`);
  writeMeta(clientId);
}

function writeMeta(clientId: number) {
  const metaPath = path.join(root, "storage/qa/batch1-qa-meta.json");
  fs.mkdirSync(path.dirname(metaPath), { recursive: true });
  const meta = {
    sqlitePath: qaDb,
    payloadSqlitePath: `file:${qaDb}`,
    demoOperatorEmail: "demo-operator@localhost.invalid",
    clientId,
    preparedAt: new Date().toISOString(),
  };
  fs.writeFileSync(metaPath, `${JSON.stringify(meta, null, 2)}\n`);
  console.log(`[batch1-qa-fixtures] Wrote ${metaPath}`);
}

main();