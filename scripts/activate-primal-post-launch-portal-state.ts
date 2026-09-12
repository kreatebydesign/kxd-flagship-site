/**
 * Activate Primal post-launch client state in Payload (local / operator APPLY).
 *
 * Updates ONLY client slug=primal-motorsports:
 * - clients.commercialRelationshipLabel → Growth & Optimization
 * - client-infrastructure.deploymentStatus → live (when infra row exists)
 *
 * Does NOT:
 * - create Alan's portal account
 * - enable website-analytics / google-ads entitlements
 * - invent ReportingFacts
 * - touch other clients
 *
 * Default: dry-run.
 * Apply: APPLY=1 npx tsx --import ./scripts/shims/register-server-only.mjs scripts/activate-primal-post-launch-portal-state.ts
 */

import { getPayload } from "payload";
import config from "../payload.config";
import {
  PRIMAL_POST_LAUNCH_OPERATING,
  PRIMAL_WEBSITE_LAUNCH_DATE,
  PRIMAL_POST_LAUNCH_BASELINE_DATE,
} from "../lib/ces/profile/primal-post-launch";

export const PRIMAL_CLIENT_SLUG = "primal-motorsports";

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

  const client = clients.docs[0] as {
    id: number;
    name: string;
    commercialRelationshipLabel?: string | null;
  };

  console.log(
    `\nPrimal post-launch portal state ${apply ? "APPLY" : "DRY-RUN"}`,
  );
  console.log(`Client: ${client.name} (id=${client.id})`);
  console.log(`Launch date: ${PRIMAL_WEBSITE_LAUNCH_DATE}`);
  console.log(`Baseline date: ${PRIMAL_POST_LAUNCH_BASELINE_DATE}`);

  const nextLabel = PRIMAL_POST_LAUNCH_OPERATING.currentPhase;
  console.log(
    `\nclients.commercialRelationshipLabel: ${
      client.commercialRelationshipLabel ?? "(empty)"
    } → ${nextLabel}`,
  );

  if (apply) {
    await payload.update({
      collection: "clients",
      id: client.id,
      data: { commercialRelationshipLabel: nextLabel },
      overrideAccess: true,
    });
    console.log("  updated clients.commercialRelationshipLabel");
  }

  const infra = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "client-infrastructure" as any,
    where: { client: { equals: client.id } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });

  const infraDoc = infra.docs[0] as
    | { id: number; deploymentStatus?: string | null }
    | undefined;

  console.log(
    `\nclient-infrastructure (${infraDoc ? `id ${infraDoc.id}` : "missing"}):`,
  );
  console.log(
    `  deploymentStatus: ${infraDoc?.deploymentStatus ?? "(empty)"} → live`,
  );

  if (apply && infraDoc) {
    await payload.update({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "client-infrastructure" as any,
      id: infraDoc.id,
      data: { deploymentStatus: "live" },
      overrideAccess: true,
    });
    console.log("  updated client-infrastructure.deploymentStatus");
  } else if (apply && !infraDoc) {
    console.log("  skipped — no infrastructure row to update");
  }

  console.log(`\nManual connections still required (not changed by this script):`);
  console.log(`  - Confirm Search Console ReportingFacts sync for current period`);
  console.log(`  - Enable website-analytics only after GA4 Viewer access verified on 549908814`);
  console.log(`  - Enable google-ads only after Ads API connection verifies`);
  console.log(`  - Wire confirmed ClientInquiries into client-facing lead counts`);
  console.log(`  - Close/archive stale pre-launch Website Review records if still active`);
  console.log(`  - Invite Alan via portal-client-memberships (least privilege) when email supplied`);
  console.log("");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
