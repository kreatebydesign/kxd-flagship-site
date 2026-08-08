/**
 * Read-only experience recommendation for any clientId.
 * Does not create/update Payload docs. Does not invite anyone.
 *
 *   npx tsx scripts/compose-client-experience-readonly.ts --client-id=14
 */

import { loadExperienceSignals } from "../lib/client-command/experience/composer/signals.ts";
import { composeExperienceRecommendation } from "../lib/client-command/experience/composer/recommend.ts";
import { loadPayloadEnv, resolveDbTarget, formatDbTarget } from "./lib/payload-db-target.ts";

function parseClientId(argv: string[]): number {
  const flag = argv.find((a) => a.startsWith("--client-id="));
  const value = flag ? flag.slice("--client-id=".length) : argv[2];
  const id = Number(value);
  if (!Number.isFinite(id) || id <= 0) {
    throw new Error("Pass --client-id=<n>");
  }
  return id;
}

async function main() {
  loadPayloadEnv();
  const target = resolveDbTarget();
  console.error(`[read-only] ${formatDbTarget(target)}`);
  const clientId = parseClientId(process.argv.slice(2));
  const signals = await loadExperienceSignals(clientId);
  if (!signals) {
    console.error(JSON.stringify({ ok: false, message: "Client not found", clientId }, null, 2));
    process.exit(1);
  }
  const recommendation = composeExperienceRecommendation(signals);
  console.log(
    JSON.stringify(
      {
        ok: true,
        mutatesProfile: false,
        client: {
          id: signals.clientId,
          name: signals.clientName,
          slug: signals.clientSlug,
          profileStatus: signals.profileStatus,
        },
        signals: {
          websiteUrl: signals.websiteUrl,
          primaryDomain: signals.primaryDomain,
          hasHostingInfra: signals.hasHostingInfra,
          ga4: Boolean(signals.ga4PropertyId),
          searchConsole: Boolean(signals.searchConsoleSiteUrl),
          reportingCapabilities: signals.reportingCapabilities,
          inventoryCount: signals.inventoryCount,
          websiteReviewCount: signals.websiteReviewCount,
          websiteWorkspaceCount: signals.websiteWorkspaceCount,
          projectCount: signals.projectCount,
          openRequestCount: signals.openRequestCount,
          deliverableCount: signals.deliverableCount,
          publishedReportCount: signals.publishedReportCount,
          assetCount: signals.assetCount,
          meetingCount: signals.meetingCount,
          monthlyRetainerAmount: signals.monthlyRetainerAmount,
          hasPortalMembership: signals.hasPortalMembership,
          billingNavAvailable: signals.billingNavAvailable,
          portfolioNavAvailable: signals.portfolioNavAvailable,
          hasEnabledPresentation: signals.hasEnabledPresentation,
          logoHasFile: signals.logoHasFile,
        },
        readiness: recommendation.readiness,
        recommendation,
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
