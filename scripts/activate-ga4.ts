/**
 * Phase 32B — Shared Core GA4 (Website Analytics) activation.
 *
 * Dry-run by default. APPLY=1 only after a successful live probe.
 * Never enables entitlements without verified API access.
 * Never fabricates metrics.
 *
 *   npm run activate:ga4 -- --client-slug=<slug>
 *   npm run activate:ga4:apply -- --client-id=<id>
 */

import { defaultExecutiveReportingPeriod } from "../lib/reporting/ingest/period";
import { syncReportingFacts } from "../lib/reporting/ingest/sync-reporting-facts";
import { loadClientReportingConnection } from "../lib/reporting/providers/connection";
import { getGoogleReportingAuthConfig } from "../lib/reporting/providers/google/auth";
import { GA4_CORE_METRICS, runGa4Report } from "../lib/reporting/providers/google/ga4/client";
import { toProviderDate } from "../lib/reporting/providers/period";
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

  console.log(`\nPhase 32B — GA4 activation (${apply ? "APPLY" : "DRY-RUN"})`);
  console.log(`Client: ${client.clientName} (id=${client.clientId}${client.clientSlug ? `, slug=${client.clientSlug}` : ""})`);

  if (!connection) {
    console.error("Blocking: reporting connection could not be resolved.");
    process.exit(1);
  }

  console.log(`GA4 property: ${connection.ga4PropertyId ?? "(missing)"}`);
  console.log(`Auth mode:    ${getGoogleReportingAuthConfig().mode}`);
  console.log(`Capabilities: ${connection.enabledCapabilities.join(", ") || "(none)"}`);

  if (!connection.ga4PropertyId) {
    console.error("Blocking: ga4PropertyId is not set on Client Infrastructure.");
    process.exit(1);
  }

  const authMode = getGoogleReportingAuthConfig().mode;
  if (authMode === "not-configured" || authMode === "invalid-configuration") {
    console.error(
      `Blocking: Google Reporting credentials are ${authMode}. Use Vercel OIDC (GCP_*) or GOOGLE_REPORTING_SERVICE_ACCOUNT_JSON / OAuth before entitlement.`,
    );
    process.exit(1);
  }

  const period = defaultExecutiveReportingPeriod(new Date());
  console.log(`\nProbing GA4 for ${period.label ?? `${period.start} → ${period.end}`}…`);
  const probe = await runGa4Report({
    propertyId: connection.ga4PropertyId,
    startDate: toProviderDate(period.start),
    endDate: toProviderDate(period.end),
    metrics: [...GA4_CORE_METRICS],
  });

  if (!probe.ok) {
    console.error(`Blocking: GA4 probe failed — ${probe.error.message}`);
    console.error(
      "Grant Viewer on the GA4 property to the reporting service account, then retry. Do not enable website-analytics yet.",
    );
    process.exit(1);
  }

  console.log(`GA4 access verified (${probe.rowCount} row(s)).`);

  const profile = await loadActiveExperienceProfile(client.clientId);
  if (!profile) {
    console.error("Blocking: missing active client-experience-profile.");
    process.exit(1);
  }

  const nextModules = profile.enabledModules.includes("website-analytics")
    ? profile.enabledModules
    : [...profile.enabledModules, "website-analytics"];

  console.log(`\nExperience profile ${profile.id}:`);
  console.log(`  enabledModules now:  ${profile.enabledModules.join(", ") || "(empty)"}`);
  console.log(`  enabledModules next: ${nextModules.join(", ") || "(empty)"}`);

  if (!apply) {
    console.log("\nDry-run only. Re-run with APPLY=1 (npm run activate:ga4:apply) to entitle + ingest.");
    process.exit(0);
  }

  await enableCapabilityModule(profile.id, profile.enabledModules, "website-analytics");
  console.log("Enabled website-analytics entitlement.");

  const sync = await syncReportingFacts({
    clientId: client.clientId,
    provider: "ga4",
    refresh: true,
  });
  console.log(`\nIngest outcome: ${sync.outcome}`);
  console.log(`  factsFetched: ${sync.factsFetched}`);
  console.log(`  factsWritten: ${sync.factsWritten}`);
  console.log(`  message: ${sync.message}`);
  if (!sync.ok) process.exit(1);
  console.log("\nGA4 activation complete.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
