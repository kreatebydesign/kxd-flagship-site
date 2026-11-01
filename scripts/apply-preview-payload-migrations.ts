/**
 * Apply ordered Payload migrations to preview-kxd-os only.
 * Requires NEON_PREVIEW_URI (full connection string) in environment — never logged.
 */
import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  formatDbTarget,
  loadPayloadEnv,
  resolveDbTarget,
} from "./lib/payload-db-target.ts";
import { isPreviewKxdOsTarget } from "./lib/preview-kxd-os-db.ts";

const PREVIEW_HOST = "ep-frosty-bonus-afx8tf8q";

function main() {
  const uri = process.env.NEON_PREVIEW_URI?.trim();
  if (!uri) {
    console.error("NEON_PREVIEW_URI is required (preview-kxd-os connection string).");
    process.exit(2);
  }
  if (!uri.includes(PREVIEW_HOST)) {
    console.error(`Refusing: NEON_PREVIEW_URI must include preview host ${PREVIEW_HOST}.`);
    process.exit(2);
  }
  if (uri.includes("ep-twilight-math")) {
    console.error("Refusing: production Neon endpoint detected in NEON_PREVIEW_URI.");
    process.exit(2);
  }

  const envPath = resolve("/tmp/kxd-preview-db.env");
  writeFileSync(
    envPath,
    `DATABASE_URI=${uri}\nDATABASE_URL=${uri}\nPOSTGRES_URL=${uri}\n`,
    { mode: 0o600 },
  );

  loadPayloadEnv();
  process.env.DATABASE_URI = uri;
  process.env.DATABASE_URL = uri;
  process.env.POSTGRES_URL = uri;

  const target = resolveDbTarget();
  if (!isPreviewKxdOsTarget(target)) {
    console.error(`Refusing: resolved target is not preview-kxd-os: ${formatDbTarget(target)}`);
    process.exit(2);
  }

  console.log("\npreview migrate:status");
  console.log(`target: ${formatDbTarget(target)}\n`);

  execSync("npm run migrate:status", {
    stdio: "inherit",
    env: { ...process.env, KXD_CONFIRM_PRODUCTION_MIGRATE: "" },
  });

  if (process.env.KXD_CONFIRM_PRODUCTION_MIGRATE?.trim() !== "1") {
    console.error("\nSet KXD_CONFIRM_PRODUCTION_MIGRATE=1 to apply pending migrations to preview.\n");
    process.exit(2);
  }

  console.log("\npreview migrate:apply (ordered index.ts)\n");
  execSync("npm run migrate:production", { stdio: "inherit", env: process.env });
  console.log("\npreview migrate:apply — done\n");
}

main();
