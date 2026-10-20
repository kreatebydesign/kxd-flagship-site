/**
 * Configure Vercel Preview env vars for the isolated Neon branch `preview-kxd-os`.
 *
 * Usage (secrets never committed):
 *   node scripts/configure-kxd-os-preview-database-env.mjs --config /path/to/preview-db.json
 *
 * preview-db.json shape:
 *   { "pooledUrl": "postgresql://...", "neonProjectId": "mute-violet-81514071" }
 *
 * Optional flags:
 *   --scope-production-only-ids  Comma-separated Vercel env IDs to restrict to production target only
 *   --dry-run
 */

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const projectId = "prj_tYcDk97qXILoxQdiIlo97PTB3VVe";
const vercelScope = "kxd";

function parseArgs(argv) {
  const out = { config: null, dryRun: false, productionOnlyIds: [] };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--config") out.config = argv[++i];
    else if (a === "--dry-run") out.dryRun = true;
    else if (a === "--scope-production-only-ids")
      out.productionOnlyIds = argv[++i].split(",").filter(Boolean);
    else throw new Error(`Unknown arg: ${a}`);
  }
  if (!out.config) throw new Error("--config required");
  return out;
}

function deriveBundle(pooledUrl, neonProjectId) {
  const pooled = new URL(pooledUrl);
  const poolerHost = pooled.hostname;
  const directHost = poolerHost.includes("-pooler.")
    ? poolerHost.replace("-pooler.", ".")
    : poolerHost;
  const user = pooled.username;
  const password = pooled.password;
  const database = pooled.pathname.replace(/^\//, "") || "neondb";
  const qs = pooled.search ? pooled.search : "?sslmode=require";

  const unpooled = new URL(pooledUrl);
  unpooled.hostname = directHost;
  unpooled.search = qs;

  const prisma = new URL(pooledUrl);
  const prismaQs = new URLSearchParams(pooled.searchParams);
  prismaQs.set("pgbouncer", "true");
  prismaQs.set("connect_timeout", "15");
  prisma.search = `?${prismaQs.toString()}`;

  return {
    DATABASE_URI: unpooled.toString(),
    DATABASE_URL: pooled.toString(),
    DATABASE_URL_UNPOOLED: unpooled.toString(),
    POSTGRES_URL: pooled.toString(),
    POSTGRES_URL_NON_POOLING: unpooled.toString(),
    POSTGRES_PRISMA_URL: prisma.toString(),
    POSTGRES_HOST: poolerHost,
    POSTGRES_USER: user,
    POSTGRES_PASSWORD: password,
    POSTGRES_DATABASE: database,
    PGDATABASE: database,
    NEON_PROJECT_ID: neonProjectId,
    KXD_NEON_PREVIEW_BRANCH_ID: "br-small-fire-af71dl63",
    KXD_NEON_PREVIEW_BRANCH_NAME: "preview-kxd-os",
    KXD_NEON_PREVIEW_ENDPOINT_ID: "ep-frosty-bonus-afx8tf8q",
  };
}

function vercelApi(method, endpoint, fields = {}) {
  const args = ["api", endpoint, "--method", method, "--scope", vercelScope];
  for (const [k, v] of Object.entries(fields)) {
    args.push("-F", `${k}=${v}`);
  }
  const res = spawnSync("vercel", args, {
    cwd: repoRoot,
    encoding: "utf8",
    env: { ...process.env, VERCEL_TOKEN: undefined },
  });
  if (res.status !== 0) {
    throw new Error(
      `vercel api ${method} ${endpoint} failed: ${res.stderr || res.stdout}`,
    );
  }
  return res.stdout;
}

function vercelEnvAdd(key, value, dryRun) {
  if (dryRun) {
    console.log(`[dry-run] preview env add ${key}`);
    return;
  }
  const res = spawnSync(
    "vercel",
    [
      "env",
      "add",
      key,
      "preview",
      "--project",
      "kxd-flagship-site",
      "--scope",
      vercelScope,
      "--sensitive",
      "--force",
      "--value",
      value,
      "--yes",
    ],
    {
      cwd: repoRoot,
      encoding: "utf8",
      env: { ...process.env, VERCEL_TOKEN: undefined },
    },
  );
  if (res.status !== 0) {
    throw new Error(`vercel env add ${key} failed: ${res.stderr || res.stdout}`);
  }
  console.log(`[ok] preview env ${key}`);
}

function scopeEnvProductionOnly(envId, dryRun) {
  if (dryRun) {
    console.log(`[dry-run] production-only target for env ${envId}`);
    return;
  }
  vercelApi("PATCH", `/v10/projects/${projectId}/env/${envId}`, {
    target: '["production"]',
  });
  console.log(`[ok] production-only ${envId}`);
}

function main() {
  const args = parseArgs(process.argv);
  const raw = JSON.parse(fs.readFileSync(args.config, "utf8"));
  if (!raw.pooledUrl || !raw.neonProjectId) {
    throw new Error("config requires pooledUrl and neonProjectId");
  }
  const bundle = deriveBundle(raw.pooledUrl, raw.neonProjectId);

  console.log("[KXD] Preview DB fingerprint (no secrets):");
  console.log(
    JSON.stringify(
      {
        branchId: bundle.KXD_NEON_PREVIEW_BRANCH_ID,
        branchName: bundle.KXD_NEON_PREVIEW_BRANCH_NAME,
        endpointId: bundle.KXD_NEON_PREVIEW_ENDPOINT_ID,
        poolerHost: bundle.POSTGRES_HOST,
        database: bundle.POSTGRES_DATABASE,
      },
      null,
      2,
    ),
  );

  for (const id of args.productionOnlyIds) {
    scopeEnvProductionOnly(id, args.dryRun);
  }

  const keys = [
    "DATABASE_URI",
    "DATABASE_URL",
    "DATABASE_URL_UNPOOLED",
    "POSTGRES_URL",
    "POSTGRES_URL_NON_POOLING",
    "POSTGRES_PRISMA_URL",
    "POSTGRES_HOST",
    "POSTGRES_USER",
    "POSTGRES_PASSWORD",
    "POSTGRES_DATABASE",
    "PGDATABASE",
    "NEON_PROJECT_ID",
    "KXD_NEON_PREVIEW_BRANCH_ID",
    "KXD_NEON_PREVIEW_BRANCH_NAME",
    "KXD_NEON_PREVIEW_ENDPOINT_ID",
  ];

  for (const key of keys) {
    vercelEnvAdd(key, bundle[key], args.dryRun);
  }

  console.log("[KXD] Preview database env configuration complete.");
}

main();
