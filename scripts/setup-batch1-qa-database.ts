/**
 * LOCAL ONLY — disposable SQLite for Batch 1 browser QA.
 *
 * Copies the primary local Payload DB snapshot into storage/qa/, seeds the demo operator
 * into the copy only, and records a representative client id for Playwright.
 *
 * Run from Batch 1 worktree:
 *   npx tsx scripts/setup-batch1-qa-database.ts
 *
 * Start dev with:
 *   PAYLOAD_SQLITE_PATH=file:./storage/qa/batch1-nav.sqlite npm run dev -- -p 3013
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const root = process.cwd();
const qaDir = path.join(root, "storage/qa");
const qaDb = path.join(qaDir, "batch1-nav.sqlite");
const metaPath = path.join(qaDir, "batch1-qa-meta.json");

const SHARED_CANDIDATES = [
  path.join(root, ".payload/kxd.sqlite"),
  path.join(root, "../.payload/kxd.sqlite"),
  path.join(root, "../../.payload/kxd.sqlite"),
];

function resolveSourceSqlite(): string | null {
  const fromEnv = process.env.KXD_QA_COPY_SQLITE?.trim();
  if (fromEnv && fs.existsSync(fromEnv)) return fromEnv;
  for (const candidate of SHARED_CANDIDATES) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

async function main() {
  fs.mkdirSync(qaDir, { recursive: true });

  if (!fs.existsSync(qaDb)) {
    const source = resolveSourceSqlite();
    if (!source) {
      console.error(
        "[batch1-qa] No source SQLite found. Set KXD_QA_COPY_SQLITE or link .payload/kxd.sqlite.",
      );
      process.exit(1);
    }
    fs.copyFileSync(source, qaDb);
    console.log(`[batch1-qa] Copied ${source} → ${qaDb}`);
  } else {
    console.log("[batch1-qa] Reusing existing QA SQLite.");
  }

  const sqliteUrl = `file:${qaDb}`;
  process.env.PAYLOAD_SQLITE_PATH = sqliteUrl;

  execSync("npx tsx scripts/seed-batch1-qa-sqlite-fixtures.ts", {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, KXD_QA_SQLITE_ABSPATH: qaDb },
  });

  const meta = JSON.parse(fs.readFileSync(metaPath, "utf8")) as {
    clientId: number;
    payloadSqlitePath: string;
  };
  console.log(
    `[batch1-qa] Use PAYLOAD_SQLITE_PATH=${meta.payloadSqlitePath} and KXD_BATCH1_QA_CLIENT_ID=${meta.clientId}`,
  );
}

main().catch((err) => {
  console.error("[batch1-qa] Failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});