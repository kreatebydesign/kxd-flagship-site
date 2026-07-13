/**
 * Phase 31B — Idempotent Primal reporting connection + Search Console entitlement.
 *
 * Updates ONLY client slug=primal-motorsports:
 * - Client Infrastructure: ga4PropertyId, searchConsoleSiteUrl
 * - Experience Profile enabledModules: ensure "seo" (Search Console)
 *   Does NOT add website-analytics until GA4 property access is granted.
 *
 * Default: dry-run (prints planned changes).
 * Apply: APPLY=1 npx tsx --import ./scripts/shims/register-server-only.mjs scripts/configure-primal-reporting-connection.ts
 *
 * Never persists reporting facts. Never enables Google Ads. Never touches other clients.
 */

import { getPayload } from "payload";
import config from "../payload.config";

export const PRIMAL_CLIENT_SLUG = "primal-motorsports";
export const PRIMAL_GA4_PROPERTY_ID = "530873364";
export const PRIMAL_SEARCH_CONSOLE_SITE = "sc-domain:primalmotorsports.com";
/** Entitlement to enable now — Search Console only. */
export const PRIMAL_REPORTING_MODULE_TO_ADD = "seo" as const;
/** Explicitly do not enable until GA4 Viewer access exists. */
export const PRIMAL_REPORTING_MODULE_HELD = "website-analytics" as const;

function asModules(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

async function main() {
  const apply = process.env.APPLY === "1";
  const payload = await getPayload({ config });

  const clients = await payload.find({
    collection: "clients",
    where: { slug: { equals: PRIMAL_CLIENT_SLUG } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });

  if (clients.docs.length === 0) {
    console.error(`Client not found: ${PRIMAL_CLIENT_SLUG}`);
    process.exit(1);
  }

  const client = clients.docs[0] as { id: number; name: string };
  console.log(`\nPhase 31B — Primal reporting connection ${apply ? "APPLY" : "DRY-RUN"}`);
  console.log(`Client: ${client.name} (id=${client.id})`);

  const infra = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "client-infrastructure" as any,
    where: { client: { equals: client.id } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });

  const infraDoc = infra.docs[0] as
    | {
        id: number;
        ga4PropertyId?: string | null;
        searchConsoleSiteUrl?: string | null;
      }
    | undefined;

  const currentGa4 = infraDoc?.ga4PropertyId ?? null;
  const currentGsc = infraDoc?.searchConsoleSiteUrl ?? null;
  console.log(`\nClient Infrastructure (${infraDoc ? `id ${infraDoc.id}` : "missing"}):`);
  console.log(`  ga4PropertyId:         ${currentGa4 ?? "(empty)"} → ${PRIMAL_GA4_PROPERTY_ID}`);
  console.log(`  searchConsoleSiteUrl:  ${currentGsc ?? "(empty)"} → ${PRIMAL_SEARCH_CONSOLE_SITE}`);
  console.log(
    `  Note: GA4 property ID is stored for readiness, but website-analytics entitlement stays OFF until Viewer access is granted.`,
  );

  const profiles = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "client-experience-profiles" as any,
    where: {
      and: [
        { client: { equals: client.id } },
        { status: { equals: "active" } },
      ],
    },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });

  const profile = profiles.docs[0] as
    | { id: number; enabledModules?: unknown }
    | undefined;

  const currentModules = asModules(profile?.enabledModules);
  const nextModules = currentModules.includes(PRIMAL_REPORTING_MODULE_TO_ADD)
    ? currentModules
    : [...currentModules, PRIMAL_REPORTING_MODULE_TO_ADD];

  console.log(`\nExperience Profile (${profile ? `id ${profile.id}` : "missing"}):`);
  console.log(`  enabledModules now:    ${currentModules.join(", ") || "(empty)"}`);
  console.log(`  enabledModules next:   ${nextModules.join(", ") || "(empty)"}`);
  console.log(`  add "${PRIMAL_REPORTING_MODULE_TO_ADD}": ${currentModules.includes(PRIMAL_REPORTING_MODULE_TO_ADD) ? "already present" : "will add"}`);
  console.log(
    `  hold "${PRIMAL_REPORTING_MODULE_HELD}": ${currentModules.includes(PRIMAL_REPORTING_MODULE_HELD) ? "PRESENT (unexpected — leave as-is; do not remove)" : "absent (correct until GA4 access)"}`,
  );

  if (!apply) {
    console.log("\nDry-run only. Re-run with APPLY=1 to write these values.");
    process.exit(0);
  }

  if (!infraDoc) {
    console.error("Missing client-infrastructure row — create infrastructure for Primal first.");
    process.exit(1);
  }
  if (!profile) {
    console.error("Missing active client-experience-profile — seed Primal experience first.");
    process.exit(1);
  }

  await payload.update({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "client-infrastructure" as any,
    id: infraDoc.id,
    data: {
      ga4PropertyId: PRIMAL_GA4_PROPERTY_ID,
      searchConsoleSiteUrl: PRIMAL_SEARCH_CONSOLE_SITE,
    },
    overrideAccess: true,
  });

  await payload.update({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "client-experience-profiles" as any,
    id: profile.id,
    data: {
      enabledModules: nextModules,
    },
    overrideAccess: true,
  });

  console.log("\n✔ Applied Primal reporting connection + seo entitlement.");
  console.log("  website-analytics remains unchanged (held until GA4 Viewer access).");
  console.log("  No reporting facts were persisted.");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
