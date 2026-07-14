/**
 * Phase 32B — Shared Core Google Ads activation.
 *
 * Dry-run by default. APPLY=1 only after a successful live Ads probe.
 * Never enables google-ads entitlement without verified API access.
 * Never fabricates metrics or Connected states.
 *
 *   npm run activate:google-ads -- --client-slug=<slug>
 *   npm run activate:google-ads:apply -- --client-id=<id>
 *
 * Requires:
 *   - GOOGLE_ADS_DEVELOPER_TOKEN
 *   - Ads-authorized Google Reporting credentials (adwords scope)
 *   - Client Infrastructure.googleAdsCustomerId
 */

import { defaultExecutiveReportingPeriod } from "../lib/reporting/ingest/period";
import { syncReportingFacts } from "../lib/reporting/ingest/sync-reporting-facts";
import { loadClientReportingConnection } from "../lib/reporting/providers/connection";
import {
  getGoogleAdsAuthConfig,
  getGoogleAdsDeveloperToken,
} from "../lib/reporting/providers/google/auth";
import { queryGoogleAdsAggregate } from "../lib/reporting/providers/google/ads/client";
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

  console.log(`\nPhase 32B — Google Ads activation (${apply ? "APPLY" : "DRY-RUN"})`);
  console.log(`Client: ${client.clientName} (id=${client.clientId}${client.clientSlug ? `, slug=${client.clientSlug}` : ""})`);

  if (!connection) {
    console.error("Blocking: reporting connection could not be resolved.");
    process.exit(1);
  }

  const developerToken = getGoogleAdsDeveloperToken();
  const adsAuth = getGoogleAdsAuthConfig();

  console.log(`Ads customer:     ${connection.googleAdsCustomerId ?? "(missing)"}`);
  console.log(`Ads login (MCC):  ${connection.googleAdsLoginCustomerId ?? "(none)"}`);
  console.log(`Developer token:  ${developerToken ? "configured" : "MISSING"}`);
  console.log(`Ads auth mode:    ${adsAuth.mode}`);
  console.log(`Capabilities:     ${connection.enabledCapabilities.join(", ") || "(none)"}`);

  if (!developerToken) {
    console.error(
      "Blocking: GOOGLE_ADS_DEVELOPER_TOKEN is not set. Obtain from Google Ads → Tools & Settings → API Center, store in Vercel/production env (and local .env for operators).",
    );
    process.exit(1);
  }

  if (!connection.googleAdsCustomerId) {
    console.error(
      "Blocking: googleAdsCustomerId is not set on Client Infrastructure. Enter the Ads customer ID in Payload (dashes optional — normalized to digits).",
    );
    process.exit(1);
  }

  if (adsAuth.mode === "not-configured" || adsAuth.mode === "invalid-configuration") {
    console.error(
      `Blocking: Google Ads auth is ${adsAuth.mode}${adsAuth.invalidReason ? ` — ${adsAuth.invalidReason}` : ""}.`,
    );
    console.error(
      "Credentials must include https://www.googleapis.com/auth/adwords (separate Ads token cache from GA4/GSC).",
    );
    process.exit(1);
  }

  const period = defaultExecutiveReportingPeriod(new Date());
  console.log(`\nProbing Google Ads for ${period.label ?? `${period.start} → ${period.end}`}…`);
  const probe = await queryGoogleAdsAggregate({
    customerId: connection.googleAdsCustomerId,
    loginCustomerId: connection.googleAdsLoginCustomerId,
    startDate: toProviderDate(period.start),
    endDate: toProviderDate(period.end),
  });

  if (!probe.ok) {
    console.error(`Blocking: Google Ads probe failed — ${probe.error.message}`);
    console.error(
      "Confirm developer token access level, customer ID, MCC login-customer-id (if needed), and Ads API access for the reporting identity. Do not enable google-ads yet.",
    );
    process.exit(1);
  }

  console.log(
    probe.row
      ? "Google Ads access verified (aggregate row returned)."
      : "Google Ads access verified (no rows for period — still a successful API path).",
  );

  const profile = await loadActiveExperienceProfile(client.clientId);
  if (!profile) {
    console.error("Blocking: missing active client-experience-profile.");
    process.exit(1);
  }

  const nextModules = profile.enabledModules.includes("google-ads")
    ? profile.enabledModules
    : [...profile.enabledModules, "google-ads"];

  console.log(`\nExperience profile ${profile.id}:`);
  console.log(`  enabledModules now:  ${profile.enabledModules.join(", ") || "(empty)"}`);
  console.log(`  enabledModules next: ${nextModules.join(", ") || "(empty)"}`);

  if (!apply) {
    console.log(
      "\nDry-run only. Re-run with APPLY=1 (npm run activate:google-ads:apply) to entitle + ingest.",
    );
    process.exit(0);
  }

  await enableCapabilityModule(profile.id, profile.enabledModules, "google-ads");
  console.log("Enabled google-ads entitlement.");

  const sync = await syncReportingFacts({
    clientId: client.clientId,
    provider: "ads",
    refresh: true,
  });
  console.log(`\nIngest outcome: ${sync.outcome}`);
  console.log(`  factsFetched: ${sync.factsFetched}`);
  console.log(`  factsWritten: ${sync.factsWritten}`);
  console.log(`  message: ${sync.message}`);
  if (!sync.ok) process.exit(1);
  console.log("\nGoogle Ads activation complete.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
