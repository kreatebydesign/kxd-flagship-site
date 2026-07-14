/**
 * Phase 33A.1 — Lightweight Postgres helper for atomic lease SQL.
 * Avoids racing Payload update-by-id for concurrency control.
 */

import "server-only";

import { readFileSync } from "node:fs";
import pg from "pg";

let envLoaded = false;

function ensureEnvLocal() {
  if (envLoaded) return;
  envLoaded = true;
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
    /* optional in Vercel */
  }
}

export async function withReportingAutomationDb<T>(
  fn: (client: pg.Client) => Promise<T>,
): Promise<T> {
  ensureEnvLocal();
  const url =
    process.env.DATABASE_URI ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL;
  if (!url) {
    throw new Error("DATABASE_URI is required for reporting automation leases.");
  }
  const client = new pg.Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}
