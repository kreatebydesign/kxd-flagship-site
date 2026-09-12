/**
 * Read-only Preview/local Primal portal activation inspect.
 * Never mutates. Prints non-secret identifiers only.
 *
 * Usage:
 *   node --env-file=.env.preview.local --import ./scripts/shims/register-server-only.mjs \
 *     ./node_modules/tsx/dist/cli.mjs scripts/inspect-primal-post-launch-preview-truth.ts
 */

import { getPayload } from "payload";
import config from "../payload.config";
import { defaultExecutiveReportingPeriod } from "../lib/reporting/ingest/period";
import {
  loadReportingFacts,
  summarizeReportingFactProvenance,
} from "../lib/reporting/persistence";

const SLUG = "primal-motorsports";

async function main() {
  const uri = process.env.DATABASE_URI || process.env.DATABASE_URL || "";
  let host = "(unset)";
  try {
    host = new URL(uri).hostname || "(unparsed)";
  } catch {
    host = "(invalid)";
  }
  console.log("\n=== Primal post-launch inspect (read-only) ===");
  console.log(`DB host: ${host}`);

  const payload = await getPayload({ config });
  const clients = await payload.find({
    collection: "clients",
    where: { slug: { equals: SLUG } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  if (clients.docs.length === 0) {
    console.log("No primal-motorsports client in this database.");
    return;
  }

  const client = clients.docs[0] as {
    id: number;
    name: string;
    commercialRelationshipLabel?: string | null;
    status?: string;
  };
  console.log("\nClient:", {
    id: client.id,
    name: client.name,
    status: client.status ?? null,
    commercialRelationshipLabel: client.commercialRelationshipLabel ?? null,
  });

  const infra = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "client-infrastructure" as any,
    where: { client: { equals: client.id } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  const i = infra.docs[0] as
    | {
        id: number;
        deploymentStatus?: string | null;
        ga4PropertyId?: string | null;
        searchConsoleSiteUrl?: string | null;
        googleAdsCustomerId?: string | null;
        googleAdsLoginCustomerId?: string | null;
      }
    | undefined;
  console.log(
    "\nInfrastructure:",
    i
      ? {
          id: i.id,
          deploymentStatus: i.deploymentStatus ?? null,
          ga4PropertyId: i.ga4PropertyId ?? null,
          searchConsoleSiteUrl: i.searchConsoleSiteUrl ?? null,
          googleAdsCustomerId: i.googleAdsCustomerId ?? null,
          googleAdsLoginCustomerId: i.googleAdsLoginCustomerId ?? null,
        }
      : null,
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
  console.log("\nExperience profile modules:", profile?.enabledModules ?? null);

  const reqs = await payload.find({
    collection: "client-requests",
    where: { client: { equals: client.id } },
    limit: 100,
    depth: 0,
    overrideAccess: true,
    sort: "-updatedAt",
  });
  const docs = reqs.docs as Array<{
    id: number;
    title?: string;
    status?: string;
    sourceModule?: string | null;
    completedDate?: string | null;
    updatedAt?: string;
    createdAt?: string;
  }>;
  const wr = docs.filter(
    (d) =>
      String(d.sourceModule || "") === "website-review" ||
      /website|revision|review/i.test(String(d.title || "")),
  );
  console.log(`\nClient requests: ${docs.length}; website-review-ish: ${wr.length}`);
  for (const d of wr) {
    console.log({
      id: d.id,
      title: d.title,
      status: d.status,
      sourceModule: d.sourceModule ?? null,
      completedDate: d.completedDate ?? null,
      updatedAt: d.updatedAt,
      createdAt: d.createdAt,
    });
  }
  const open = wr.filter((d) => !["complete", "declined"].includes(String(d.status)));
  console.log(
    "\nOpen/active website-review-ish (recommend complete + completedDate):",
    open.map((d) => ({ id: d.id, status: d.status, title: d.title })),
  );

  const inquiries = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "client-inquiries" as any,
    where: { client: { equals: client.id } },
    limit: 5,
    depth: 0,
    overrideAccess: true,
  });
  console.log(`\nClientInquiries count (sample limit): ${inquiries.totalDocs}`);

  const period = defaultExecutiveReportingPeriod(new Date("2026-09-11T12:00:00.000Z"));
  console.log("\nDefault EP period on 2026-09-11:", period);
  const facts = await loadReportingFacts({ clientId: Number(client.id), period });
  const provenance = summarizeReportingFactProvenance(facts);
  console.log("Facts for that period:", {
    count: facts.length,
    providers: provenance.providerIds,
    fetchedAt: provenance.fetchedAt,
  });
  const byDomain: Record<string, number> = {};
  for (const f of facts) {
    byDomain[f.domain] = (byDomain[f.domain] || 0) + 1;
  }
  console.log("Facts by domain:", byDomain);
  for (const f of facts.slice(0, 20)) {
    console.log({
      domain: f.domain,
      metricKey: f.metricKey,
      value: f.value,
      unit: f.unit,
      trend: f.trend,
    });
  }
  console.log("");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
