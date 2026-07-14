/**
 * Phase 32B — Shared Core Google Ads readiness verify (probe optional).
 *
 *   npm run verify:google-ads -- --client-slug=<slug>
 *   npm run verify:google-ads -- --client-id=<id> --live
 *
 * --live runs a read-only Ads aggregate probe. Never persists. Never entitles.
 */

import { defaultExecutiveReportingPeriod } from "../lib/reporting/ingest/period";
import { loadClientReportingConnection } from "../lib/reporting/providers/connection";
import {
  getGoogleAdsAuthConfig,
  getGoogleAdsDeveloperToken,
  getGoogleReportingAuthConfig,
} from "../lib/reporting/providers/google/auth";
import { queryGoogleAdsAggregate } from "../lib/reporting/providers/google/ads/client";
import { getGoogleAdsRemainingWork } from "../lib/reporting/providers/google/ads/remaining-work";
import { toProviderDate } from "../lib/reporting/providers/period";
import { getExecutiveReportingReadiness } from "../lib/reporting/readiness";
import {
  parseActivationTarget,
  resolveActivationClient,
} from "./lib/reporting-activation";

async function main() {
  const argv = process.argv.slice(2);
  const live = argv.includes("--live");
  const target = parseActivationTarget(argv);
  const client = await resolveActivationClient(target);
  const connection = await loadClientReportingConnection(client.clientId);

  console.log(`\nPhase 32B — verify:google-ads`);
  console.log(`Client: ${client.clientName} (id=${client.clientId})`);

  if (!connection) {
    console.error("FAIL: reporting connection unresolved");
    process.exit(1);
  }

  const developerTokenConfigured = Boolean(getGoogleAdsDeveloperToken());
  const adsAuth = getGoogleAdsAuthConfig();
  const reportingAuth = getGoogleReportingAuthConfig();
  const readiness = getExecutiveReportingReadiness({
    enabledCapabilities: connection.enabledCapabilities,
    ga4PropertyId: connection.ga4PropertyId,
    searchConsoleSiteUrl: connection.searchConsoleSiteUrl,
    googleAdsCustomerId: connection.googleAdsCustomerId,
    hasAdsFacts: false,
    googleAuthMode: reportingAuth.mode,
    googleAdsDeveloperTokenConfigured: developerTokenConfigured,
  });

  console.log(`Developer token: ${developerTokenConfigured ? "configured" : "MISSING"}`);
  console.log(`Ads auth mode:   ${adsAuth.mode}`);
  console.log(`Ads customer:    ${connection.googleAdsCustomerId ?? "(missing)"}`);
  console.log(`Ads login MCC:   ${connection.googleAdsLoginCustomerId ?? "(none)"}`);
  console.log(`Entitled:        ${connection.enabledCapabilities.includes("google-ads")}`);
  console.log(`Readiness:       ${readiness.googleAds.status}`);
  for (const blocker of readiness.googleAds.blockers) {
    console.log(`  · ${blocker}`);
  }

  console.log("\nRemaining work items:");
  for (const item of getGoogleAdsRemainingWork()) {
    console.log(`  [${item.status}] ${item.label}${item.blocking ? " (blocking)" : ""}`);
  }

  if (!live) {
    console.log("\nReadiness inspection complete (blockers listed above). Add --live to probe the Ads API (no persist).");
    process.exit(0);
  }

  if (!developerTokenConfigured || !connection.googleAdsCustomerId) {
    console.error("FAIL: cannot live-probe without developer token + googleAdsCustomerId");
    process.exit(1);
  }
  if (adsAuth.mode === "not-configured" || adsAuth.mode === "invalid-configuration") {
    console.error(`FAIL: cannot live-probe — ads auth ${adsAuth.mode}`);
    process.exit(1);
  }

  const period = defaultExecutiveReportingPeriod(new Date());
  const probe = await queryGoogleAdsAggregate({
    customerId: connection.googleAdsCustomerId,
    loginCustomerId: connection.googleAdsLoginCustomerId,
    startDate: toProviderDate(period.start),
    endDate: toProviderDate(period.end),
  });

  if (!probe.ok) {
    console.error(`FAIL: live probe — ${probe.error.message}`);
    process.exit(1);
  }

  console.log(
    `PASS: live Ads probe succeeded (${probe.row ? "row returned" : "no rows"} for ${period.label ?? period.start}).`,
  );
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
