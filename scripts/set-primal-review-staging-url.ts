/**
 * Urgent: set Primal Motorsports Website Review staging URL.
 *
 * Updates client-infrastructure.stagingUrl only for slug=primal-motorsports.
 * Does not change companyWebsite (production) or other clients.
 *
 * Run: npx tsx scripts/set-primal-review-staging-url.ts
 */

import { getPayload } from "payload";
import config from "../payload.config";

export const PRIMAL_CLIENT_SLUG = "primal-motorsports";
export const PRIMAL_REVIEW_STAGING_URL =
  "https://primal-motorsports-rebuild-ggv0lkpv2-kxd.vercel.app";

async function main() {
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

  const client = clients.docs[0] as {
    id: number;
    name: string;
    companyWebsite?: string | null;
  };
  console.log(`Client: ${client.name} (id=${client.id})`);
  console.log(`companyWebsite (unchanged): ${client.companyWebsite ?? "(none)"}`);

  const infra = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "client-infrastructure" as any,
    where: { client: { equals: client.id } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });

  if (infra.docs.length === 0) {
    const created = await payload.create({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "client-infrastructure" as any,
      data: {
        client: client.id,
        stagingUrl: PRIMAL_REVIEW_STAGING_URL,
        productionUrl: client.companyWebsite ?? undefined,
      },
      overrideAccess: true,
    });
    console.log(`Created client-infrastructure id=${created.id}`);
  } else {
    const doc = infra.docs[0] as { id: number; stagingUrl?: string | null };
    console.log(`Previous stagingUrl: ${doc.stagingUrl ?? "(none)"}`);
    await payload.update({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "client-infrastructure" as any,
      id: doc.id,
      data: { stagingUrl: PRIMAL_REVIEW_STAGING_URL },
      overrideAccess: true,
    });
    console.log(`Updated client-infrastructure id=${doc.id}`);
  }

  const verify = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "client-infrastructure" as any,
    where: { client: { equals: client.id } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  const staging = String(
    (verify.docs[0] as { stagingUrl?: string } | undefined)?.stagingUrl ?? "",
  ).replace(/\/$/, "");

  if (staging !== PRIMAL_REVIEW_STAGING_URL) {
    console.error(`Verify failed. Got: ${staging}`);
    process.exit(1);
  }

  console.log(`Canonical review staging URL: ${staging}`);
  console.log("Done.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
