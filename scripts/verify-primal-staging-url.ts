/**
 * Verify Primal staging URL resolution for review/workspace surfaces.
 * Run after: npx tsx scripts/set-primal-review-staging-url.ts
 *
 * Run: npx tsx scripts/verify-primal-staging-url.ts
 */
import { getPayload } from "payload";
import config from "../payload.config";
import {
  PRIMAL_CLIENT_SLUG,
  PRIMAL_REVIEW_STAGING_URL,
  PRIMAL_STABLE_PREVIEW_URL,
} from "./set-primal-review-staging-url";

function normalizeUrl(raw: string | null | undefined): string | null {
  const value = raw?.trim();
  if (!value) return null;
  return value.replace(/\/$/, "");
}

async function resolveTarget(clientId: number): Promise<string | null> {
  const payload = await getPayload({ config });
  const infra = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "client-infrastructure" as any,
    where: { client: { equals: clientId } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  const staging = normalizeUrl(
    (infra.docs[0] as { stagingUrl?: string } | undefined)?.stagingUrl ?? null,
  );
  if (staging) return staging;

  const client = await payload.findByID({
    collection: "clients",
    id: clientId,
    depth: 0,
    overrideAccess: true,
  });
  return normalizeUrl(
    (client as { companyWebsite?: string | null }).companyWebsite ?? null,
  );
}

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
    throw new Error(`Missing client ${PRIMAL_CLIENT_SLUG}`);
  }
  const client = clients.docs[0] as {
    id: number;
    companyWebsite?: string | null;
  };
  const companyWebsite = normalizeUrl(client.companyWebsite);
  const expected = normalizeUrl(PRIMAL_REVIEW_STAGING_URL);
  const resolved = await resolveTarget(client.id);

  console.log({
    clientId: client.id,
    companyWebsite,
    expectedStaging: expected,
    resolvedTargetUrl: resolved,
    stablePreview: PRIMAL_STABLE_PREVIEW_URL,
    companyWebsitePreserved: companyWebsite === "https://primalmotorsports.com",
    stagingMatchesExpected: resolved === expected,
    activeEqualsStable: expected === normalizeUrl(PRIMAL_STABLE_PREVIEW_URL),
  });

  if (companyWebsite !== "https://primalmotorsports.com") {
    throw new Error(`Unexpected companyWebsite: ${companyWebsite}`);
  }
  if (resolved !== expected) {
    throw new Error(`Resolved URL mismatch. got=${resolved} expected=${expected}`);
  }

  console.log("OK — Website Review / Workspace / Visual Review will resolve stagingUrl.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
