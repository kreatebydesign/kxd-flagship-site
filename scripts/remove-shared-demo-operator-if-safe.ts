/**
 * LOCAL ONLY — remove Batch 1 QA demo operator from the *shared* default SQLite if safe.
 *
 * Uses direct SQLite (no Payload boot) to avoid server-only import chains in scripts.
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const EMAIL = "demo-operator@localhost.invalid";
const DISPLAY = "Demo Operator";

function resolveSqlitePath(): string {
  const configured = process.env.PAYLOAD_SQLITE_PATH?.trim() ?? "";
  if (configured.startsWith("file:")) {
    const rel = configured.replace(/^file:/, "");
    return path.isAbsolute(rel) ? rel : path.join(process.cwd(), rel);
  }
  return path.join(process.cwd(), ".payload/kxd.sqlite");
}

function isSharedDefaultDb(sqlitePath: string): boolean {
  const configured = process.env.PAYLOAD_SQLITE_PATH?.trim() ?? "";
  if (!configured) return sqlitePath.endsWith(".payload/kxd.sqlite");
  return configured.includes(".payload/kxd.sqlite");
}

function sql(sqlitePath: string, statement: string): string {
  return execSync(`sqlite3 ${JSON.stringify(sqlitePath)} ${JSON.stringify(statement)}`, {
    encoding: "utf8",
  }).trim();
}

function main() {
  const sqlitePath = resolveSqlitePath();
  if (!fs.existsSync(sqlitePath)) {
    console.log("[cleanup] Shared SQLite not found — nothing to do.");
    return;
  }
  if (!isSharedDefaultDb(sqlitePath)) {
    console.log("[cleanup] Skipped — not the shared default DB.");
    return;
  }

  const row = sql(
    sqlitePath,
  `SELECT id, display_name, role FROM users WHERE email='${EMAIL.replace(/'/g, "''")}' LIMIT 1;`,
  );
  if (!row) {
    console.log("[cleanup] Demo operator not present in shared DB.");
    return;
  }

  const [id, displayName, role] = row.split("|");
  if (displayName !== DISPLAY || role !== "admin") {
    console.log("[cleanup] Left unchanged — fingerprint does not match Batch 1 seed.");
    return;
  }

  sql(sqlitePath, `DELETE FROM users WHERE id=${Number(id)};`);
  console.log("[cleanup] Removed Batch 1 demo operator from shared local SQLite.");
}

main();