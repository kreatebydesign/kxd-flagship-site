/**
 * Guarded Payload migration runner.
 *
 * Usage:
 *   npx tsx scripts/run-payload-migrate.ts status
 *   npx tsx scripts/run-payload-migrate.ts local
 *   npx tsx scripts/run-payload-migrate.ts production
 *
 * Never prints connection secrets — host/db only.
 */

import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  assertSafeWriteTarget,
  formatDbTarget,
  resolveDbTarget,
  type ResolvedDbTarget,
} from "./lib/payload-db-target";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

type Mode = "status" | "local" | "production";

function usage(): never {
  console.error(`Usage:
  npx tsx scripts/run-payload-migrate.ts status
  npx tsx scripts/run-payload-migrate.ts local
  npx tsx scripts/run-payload-migrate.ts production

status      — read-only migrate:status (safe against any configured target)
local      — apply migrations only to local Postgres or SQLite
production — apply migrations to remote Postgres; requires KXD_CONFIRM_PRODUCTION_MIGRATE=1
`);
  process.exit(1);
}

function parseMode(argv: string[]): Mode {
  const mode = argv[2];
  if (mode === "status" || mode === "local" || mode === "production") return mode;
  usage();
}

function printTarget(target: ResolvedDbTarget, mode: Mode): void {
  console.log(`[KXD] Migration mode: ${mode}`);
  console.log(`[KXD] Resolved DB target: ${formatDbTarget(target)}`);
}

async function runPayload(args: string[]): Promise<number> {
  return await new Promise((resolve, reject) => {
    const child = spawn(
      "npx",
      ["cross-env", "NODE_OPTIONS=--no-deprecation", "payload", ...args],
      {
        cwd: repoRoot,
        env: process.env,
        stdio: "inherit",
      },
    );
    child.on("error", reject);
    child.on("exit", (code) => resolve(code ?? 1));
  });
}

async function main(): Promise<void> {
  const mode = parseMode(process.argv);
  const target = resolveDbTarget();
  printTarget(target, mode);

  if (mode === "status") {
    const code = await runPayload(["migrate:status"]);
    process.exit(code);
  }

  assertSafeWriteTarget(target, mode);
  const code = await runPayload(["migrate"]);
  process.exit(code);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
