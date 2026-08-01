/**
 * Phase 4 Batch J.2B — Search Console (seo) activation.
 *
 * Dry-run by default. APPLY=1 only after a successful live probe.
 *
 *   npm run activate:search-console -- --client-slug=primal-motorsports
 *   npm run activate:search-console:apply -- --client-slug=primal-motorsports
 */

import { syncReportingFacts } from "../lib/reporting/ingest/sync-reporting-facts";
import { loadClientReportingConnection } from "../lib/reporting/providers/connection";
import { getGoogleReportingAuthConfig } from "../lib/reporting/providers/google/auth";
import { probeReportingProvider } from "../lib/reporting/providers/probe";
import {
  enableCapabilityModule,
  loadActiveExperienceProfile,
  parseActivationTarget,
  resolveActivationClient,
} from "./lib/reporting-activation";

async function main() {
  const apply = process.env.APPLY === "1";
  const target = parseActivationTarget(process.argv.slice(2));
  const client = await resolveActivationClient(target);
  const connection = await loadClientReportingConnection(client.clientId);

  console.log(`\nBatch J.2B — Search Console activation (${apply ? "APPLY" : "DRY-RUN"})`);
  console.log(
    `Client: ${client.clientName} (id=${client.clientId}${client.clientSlug ? `, slug=${client.clientSlug}` : ""})`,
  );

  if (!connection) {
    console.error("Blocking: reporting connection could not be resolved.");
    process.exit(1);
  }

  console.log(`GSC site:  ${connection.searchConsoleSiteUrl ?? "(missing)"}`);
  console.log(`Auth mode: ${getGoogleReportingAuthConfig().mode}`);
  console.log(`Capabilities: ${connection.enabledCapabilities.join(", ") || "(none)"}`);

  const probe = await probeReportingProvider({
    clientId: client.clientId,
    provider: "search-console",
  });
  if (!probe.ok) {
    console.error(`Blocking: Search Console probe failed — ${probe.message}`);
    process.exit(1);
  }
  console.log(probe.message);

  const profile = await loadActiveExperienceProfile(client.clientId);
  if (!profile) {
    console.error("Blocking: missing active client-experience-profile.");
    process.exit(1);
  }

  const nextModules = profile.enabledModules.includes("seo")
    ? profile.enabledModules
    : [...profile.enabledModules, "seo"];

  console.log(`\nExperience profile ${profile.id}:`);
  console.log(`  enabledModules now:  ${profile.enabledModules.join(", ") || "(empty)"}`);
  console.log(`  enabledModules next: ${nextModules.join(", ") || "(empty)"}`);

  if (!apply) {
    console.log(
      "\nDry-run only. Re-run with APPLY=1 (npm run activate:search-console:apply) to entitle + ingest.",
    );
    process.exit(0);
  }

  await enableCapabilityModule(profile.id, profile.enabledModules, "seo");
  console.log("Enabled seo entitlement.");

  const sync = await syncReportingFacts({
    clientId: client.clientId,
    provider: "search-console",
    refresh: true,
  });
  console.log(
    `Sync: ok=${sync.ok} status=${sync.providerStatus} written=${sync.factsWritten} message=${sync.message}`,
  );
  if (!sync.ok) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
