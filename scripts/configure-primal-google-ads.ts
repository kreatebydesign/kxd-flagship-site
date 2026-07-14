/**
 * Phase 32B — Idempotent Primal Google Ads customer mapping.
 *
 * Updates ONLY client slug=primal-motorsports Client Infrastructure:
 *   googleAdsCustomerId      = 7431689593  (Primal)
 *   googleAdsLoginCustomerId = 1813033246  (KXD Manager / MCC)
 *
 * Does NOT:
 *   - enable google-ads entitlement
 *   - ingest ReportingFacts
 *   - claim Connected
 *
 * Default: dry-run. Apply: APPLY=1
 *
 *   npm run configure:primal-google-ads
 *   npm run configure:primal-google-ads:apply
 */

import { getPayload } from "payload";
import config from "../payload.config";

export const PRIMAL_CLIENT_SLUG = "primal-motorsports";
export const PRIMAL_GOOGLE_ADS_CUSTOMER_ID = "7431689593";
export const PRIMAL_GOOGLE_ADS_LOGIN_CUSTOMER_ID = "1813033246";

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
  console.log(`\nPhase 32B — Primal Google Ads mapping (${apply ? "APPLY" : "DRY-RUN"})`);
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
        googleAdsCustomerId?: string | null;
        googleAdsLoginCustomerId?: string | null;
      }
    | undefined;

  if (!infraDoc) {
    console.error("Missing client-infrastructure row for Primal.");
    process.exit(1);
  }

  const currentCustomer = infraDoc.googleAdsCustomerId ?? null;
  const currentLogin = infraDoc.googleAdsLoginCustomerId ?? null;

  console.log(`\nClient Infrastructure (id ${infraDoc.id}):`);
  console.log(`  googleAdsCustomerId:      ${currentCustomer ?? "(empty)"} → ${PRIMAL_GOOGLE_ADS_CUSTOMER_ID}`);
  console.log(`  googleAdsLoginCustomerId: ${currentLogin ?? "(empty)"} → ${PRIMAL_GOOGLE_ADS_LOGIN_CUSTOMER_ID}`);
  console.log("\nEntitlement: google-ads remains unchanged (not enabled by this script).");
  console.log("ReportingFacts: none persisted by this script.");

  if (!apply) {
    console.log("\nDry-run only. Re-run with APPLY=1 to write these values.");
    process.exit(0);
  }

  await payload.update({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "client-infrastructure" as any,
    id: infraDoc.id,
    data: {
      googleAdsCustomerId: PRIMAL_GOOGLE_ADS_CUSTOMER_ID,
      googleAdsLoginCustomerId: PRIMAL_GOOGLE_ADS_LOGIN_CUSTOMER_ID,
    },
    overrideAccess: true,
  });

  console.log("\n✔ Applied Primal Google Ads customer mapping.");
  console.log("  google-ads entitlement was not enabled.");
  console.log("  No reporting facts were persisted.");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
