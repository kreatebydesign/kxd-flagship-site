/**
 * Urgent / one-shot: set Primal Motorsports Website Review staging URL.
 *
 * Updates client-infrastructure.stagingUrl only for slug=primal-motorsports.
 * Does not change companyWebsite (production) or other clients.
 *
 * Canonical runtime resolution remains:
 *   lib/ces/modules/website-review/target-url.ts → resolveWebsiteReviewTargetUrl
 *
 * Active URL (temporary unique Vercel deployment until the permanent
 * KXD-owned preview domain is configured):
 *   https://primal-motorsports-rebuild-ckdqqopvq-kxd.vercel.app
 *
 * When https://primal.kxdpreview.com is ready, change PRIMAL_REVIEW_STAGING_URL
 * to PRIMAL_STABLE_PREVIEW_URL and re-run this script once. Every Review /
 * Workspace / Visual Review consumer will pick up the new value via
 * client-infrastructure.stagingUrl (field name unchanged; previewUrl migration later).
 *
 * Run: npx tsx scripts/set-primal-review-staging-url.ts
 */

import { getPayload } from "payload";
import config from "../payload.config";

export const PRIMAL_CLIENT_SLUG = "primal-motorsports";

/**
 * Permanent KXD-owned Primal preview domain — switch PRIMAL_REVIEW_STAGING_URL
 * to this when DNS/Vercel alias is ready. Do not use client-owned staging hosts.
 */
export const PRIMAL_STABLE_PREVIEW_URL = "https://primal.kxdpreview.com";

/**
 * Active canonical review/preview URL written to client-infrastructure.stagingUrl.
 * Keep trailing slashes off — resolver normalizes the same way.
 */
export const PRIMAL_REVIEW_STAGING_URL =
  "https://primal-motorsports-rebuild-ckdqqopvq-kxd.vercel.app";

function normalizeUrl(raw: string | null | undefined): string | null {
  const value = raw?.trim();
  if (!value) return null;
  return value.replace(/\/$/, "");
}

async function main() {
  const payload = await getPayload({ config });
  const target = normalizeUrl(PRIMAL_REVIEW_STAGING_URL);
  if (!target) {
    console.error("PRIMAL_REVIEW_STAGING_URL is empty.");
    process.exit(1);
  }

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
  const companyWebsite = normalizeUrl(client.companyWebsite ?? null);

  console.log(`Client: ${client.name} (id=${client.id})`);
  console.log(`companyWebsite (unchanged): ${companyWebsite ?? "(none)"}`);
  console.log(`Target stagingUrl: ${target}`);
  console.log(`Stable KXD preview (future): ${PRIMAL_STABLE_PREVIEW_URL}`);

  if (companyWebsite === target) {
    console.error(
      "Aborting: target staging URL matches companyWebsite. Production must stay separate.",
    );
    process.exit(1);
  }

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
        stagingUrl: target,
        productionUrl: companyWebsite ?? undefined,
      },
      overrideAccess: true,
    });
    console.log(`Created client-infrastructure id=${created.id}`);
  } else {
    const doc = infra.docs[0] as {
      id: number;
      stagingUrl?: string | null;
      productionUrl?: string | null;
    };
    console.log(`Previous stagingUrl: ${normalizeUrl(doc.stagingUrl) ?? "(none)"}`);
    await payload.update({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "client-infrastructure" as any,
      id: doc.id,
      data: {
        stagingUrl: target,
        // Preserve production URL field when empty; never touch clients.companyWebsite.
        ...(doc.productionUrl
          ? {}
          : companyWebsite
            ? { productionUrl: companyWebsite }
            : {}),
      },
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
  const staging = normalizeUrl(
    (verify.docs[0] as { stagingUrl?: string } | undefined)?.stagingUrl ?? null,
  );

  if (staging !== target) {
    console.error(`Verify failed. Got: ${staging}`);
    process.exit(1);
  }

  const reloaded = await payload.findByID({
    collection: "clients",
    id: client.id,
    depth: 0,
    overrideAccess: true,
  });
  const companyAfter = normalizeUrl(
    (reloaded as { companyWebsite?: string | null }).companyWebsite ?? null,
  );
  if (companyAfter !== companyWebsite) {
    console.error(
      `companyWebsite changed unexpectedly: before=${companyWebsite} after=${companyAfter}`,
    );
    process.exit(1);
  }

  console.log(`Canonical review staging URL: ${staging}`);
  console.log(`companyWebsite confirmed unchanged: ${companyAfter ?? "(none)"}`);
  console.log("Done.");
  process.exit(0);
}

const isDirectRun =
  typeof process.argv[1] === "string" &&
  /set-primal-review-staging-url\.(ts|js|mjs|cjs)$/.test(process.argv[1]);

if (isDirectRun) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}