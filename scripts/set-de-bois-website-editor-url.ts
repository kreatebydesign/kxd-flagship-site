/**
 * Set de Bois Entertainment website editor URL on client-infrastructure.
 *
 * Dry-run:
 *   npx tsx scripts/set-de-bois-website-editor-url.ts
 *
 * Write to production Neon:
 *   CONFIRM_DE_BOIS_WEBSITE_EDITOR=de-bois-editor \
 *   npx tsx scripts/set-de-bois-website-editor-url.ts
 */

import { existsSync, readFileSync } from "fs";
import { join } from "path";
import pg from "pg";

const CONFIRM = "de-bois-editor";
const WEBSITE_EDITOR_URL = "https://debois.kreatebydesign.com/admin";
const DE_BOIS_CLIENT_ID = 19;

function applyEnvFile(relativePath: string): boolean {
  const path = join(process.cwd(), relativePath);
  if (!existsSync(path)) return false;
  const text = readFileSync(path, "utf8");
  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
  return true;
}

function loadProductionEnv(): void {
  applyEnvFile(".env.vercel.local");
  const vercelUri =
    process.env.DATABASE_URI?.trim() ||
    process.env.DATABASE_URL?.trim() ||
    process.env.POSTGRES_URL?.trim() ||
    "";

  applyEnvFile(".env.production.local");

  const currentUri =
    process.env.DATABASE_URI?.trim() ||
    process.env.DATABASE_URL?.trim() ||
    process.env.POSTGRES_URL?.trim() ||
    "";

  const parseable = (value: string) => {
    if (!value) return false;
    try {
      new URL(value.replace(/^["']|["']$/g, ""));
      return true;
    } catch {
      return false;
    }
  };

  if (!parseable(currentUri) && parseable(vercelUri)) {
    process.env.DATABASE_URI = vercelUri.replace(/^["']|["']$/g, "");
    if (process.env.DATABASE_URL) process.env.DATABASE_URL = process.env.DATABASE_URI;
  }

  delete process.env.VERCEL;
  delete process.env.VERCEL_ENV;
  delete process.env.MEDIA_BLOB_READ_WRITE_TOKEN;
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN?.trim() ?? "";
  if (blobToken && !/^vercel_blob_rw_[a-z0-9]+_[a-z0-9]+$/i.test(blobToken)) {
    delete process.env.BLOB_READ_WRITE_TOKEN;
  }
}

function assertProductionTarget(dryRun: boolean): void {
  const uri =
    process.env.DATABASE_URI?.trim() ||
    process.env.DATABASE_URL?.trim() ||
    process.env.POSTGRES_URL?.trim() ||
    "";
  if (!uri) throw new Error("DATABASE_URI / DATABASE_URL required");

  const cleaned = uri.replace(/^["']|["']$/g, "");
  process.env.DATABASE_URI = cleaned;
  if (process.env.DATABASE_URL) process.env.DATABASE_URL = cleaned;

  let host = "";
  try {
    host = new URL(cleaned).hostname;
  } catch {
    throw new Error("DATABASE_URI is not a valid URL.");
  }

  if (host === "127.0.0.1" || host === "localhost") {
    throw new Error("Refusing localhost — this script targets Neon production for de Bois client #19.");
  }
  if (!host.endsWith(".neon.tech")) {
    throw new Error(`Refusing unexpected DB host "${host}" — expected Neon production.`);
  }

  console.log(`[de-bois-editor] neon host=${host} dryRun=${dryRun}`);
}

async function ensureWebsiteEditorColumn(): Promise<void> {
  const uri =
    process.env.DATABASE_URI?.trim() ||
    process.env.DATABASE_URL?.trim() ||
    "";
  const client = new pg.Client({ connectionString: uri.replace(/^["']|["']$/g, "") });
  await client.connect();
  await client.query(
    'ALTER TABLE "client_infrastructure" ADD COLUMN IF NOT EXISTS "website_editor_url" varchar',
  );
  await client.end();
}

async function main() {
  loadProductionEnv();
  const dryRun = process.env.CONFIRM_DE_BOIS_WEBSITE_EDITOR !== CONFIRM;
  assertProductionTarget(dryRun);
  await ensureWebsiteEditorColumn();

  const { getPayload } = await import("payload");
  const { default: config } = await import("@payload-config");
  const { validatePreviewWebsiteUrl } = await import("../lib/infrastructure/preview-domain.ts");

  const payload = await getPayload({ config });

  const client = await payload.findByID({
    collection: "clients",
    id: DE_BOIS_CLIENT_ID,
    depth: 0,
    overrideAccess: true,
  });

  const clientName = String(client.name ?? "");
  if (!clientName.toLowerCase().includes("de bois")) {
    throw new Error(`Safety stop: client #${DE_BOIS_CLIENT_ID} is not de Bois (${clientName}).`);
  }

  const infra = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "client-infrastructure" as any,
    where: { client: { equals: DE_BOIS_CLIENT_ID } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });

  console.log(`Client: ${clientName} (id=${DE_BOIS_CLIENT_ID})`);
  console.log(`Target websiteEditorUrl: ${WEBSITE_EDITOR_URL}`);

  if (dryRun) {
    const existing = (infra.docs[0] as { websiteEditorUrl?: string | null } | undefined)
      ?.websiteEditorUrl;
    console.log(`Current websiteEditorUrl: ${existing ?? "(null)"}`);
    console.log("[de-bois-editor] DRY RUN — no database write");
    console.log(
      `\nTo write: CONFIRM_DE_BOIS_WEBSITE_EDITOR=${CONFIRM} npx tsx scripts/set-de-bois-website-editor-url.ts`,
    );
    return;
  }

  if (infra.docs.length === 0) {
    const created = await payload.create({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "client-infrastructure" as any,
      data: {
        client: DE_BOIS_CLIENT_ID,
        status: "unknown",
        websiteEditorUrl: WEBSITE_EDITOR_URL,
      },
      overrideAccess: true,
    });
    console.log(`Created client-infrastructure id=${created.id}`);
  } else {
    const doc = infra.docs[0] as { id: number; websiteEditorUrl?: string | null };
    const updated = await payload.update({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "client-infrastructure" as any,
      id: doc.id,
      data: { websiteEditorUrl: WEBSITE_EDITOR_URL },
      overrideAccess: true,
    });
    console.log(`Updated client-infrastructure id=${updated.id}`);
  }

  const verify = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "client-infrastructure" as any,
    where: { client: { equals: DE_BOIS_CLIENT_ID } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  const persisted = (verify.docs[0] as { websiteEditorUrl?: string | null } | undefined)
    ?.websiteEditorUrl;
  console.log(`Read-back websiteEditorUrl: ${persisted ?? "(null)"}`);
  if (persisted !== WEBSITE_EDITOR_URL) {
    throw new Error(
      `Read-back mismatch: expected ${WEBSITE_EDITOR_URL}, got ${persisted ?? "(null)"}`,
    );
  }

  const resolved = validatePreviewWebsiteUrl(persisted);
  const portalUrl = resolved.ok && resolved.url ? resolved.url : null;
  console.log(`Portal resolution URL: ${portalUrl ?? "(null)"}`);
  if (portalUrl !== WEBSITE_EDITOR_URL) {
    throw new Error(
      `Portal resolution mismatch: expected ${WEBSITE_EDITOR_URL}, got ${portalUrl ?? "(null)"}`,
    );
  }

  console.log("Read-back verification: OK");
  console.log("Portal resolution verification: OK");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
