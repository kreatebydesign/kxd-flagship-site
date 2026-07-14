/**
 * Phase 32B — Shared Core GA4 readiness verify (probe optional).
 *
 *   npm run verify:ga4 -- --client-slug=<slug>
 *   npm run verify:ga4 -- --client-id=<id> --live
 *
 * --live runs a read-only GA4 probe. Never persists. Never entitles.
 */

import { defaultExecutiveReportingPeriod } from "../lib/reporting/ingest/period";
import { loadClientReportingConnection } from "../lib/reporting/providers/connection";
import { getGoogleReportingAuthConfig } from "../lib/reporting/providers/google/auth";
import { GA4_CORE_METRICS, runGa4Report } from "../lib/reporting/providers/google/ga4/client";
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

  console.log(`\nPhase 32B — verify:ga4`);
  console.log(`Client: ${client.clientName} (id=${client.clientId})`);

  if (!connection) {
    console.error("FAIL: reporting connection unresolved");
    process.exit(1);
  }

  const auth = getGoogleReportingAuthConfig();
  const readiness = getExecutiveReportingReadiness({
    enabledCapabilities: connection.enabledCapabilities,
    ga4PropertyId: connection.ga4PropertyId,
    searchConsoleSiteUrl: connection.searchConsoleSiteUrl,
    googleAdsCustomerId: connection.googleAdsCustomerId,
    hasWebsiteFacts: false,
    googleAuthMode: auth.mode,
  });

  console.log(`Auth mode:     ${auth.mode}`);
  console.log(`GA4 property:  ${connection.ga4PropertyId ?? "(missing)"}`);
  console.log(`Entitled:      ${connection.enabledCapabilities.includes("website-analytics")}`);
  console.log(`Readiness:     ${readiness.websiteAnalytics.status}`);
  for (const blocker of readiness.websiteAnalytics.blockers) {
    console.log(`  · ${blocker}`);
  }

  if (!live) {
    console.log("\nPass readiness inspection. Add --live to probe the GA4 Data API (no persist).");
    process.exit(0);
  }

  if (!connection.ga4PropertyId) {
    console.error("FAIL: cannot live-probe without ga4PropertyId");
    process.exit(1);
  }
  if (auth.mode === "not-configured" || auth.mode === "invalid-configuration") {
    console.error(`FAIL: cannot live-probe — auth ${auth.mode}`);
    process.exit(1);
  }

  const period = defaultExecutiveReportingPeriod(new Date());
  const probe = await runGa4Report({
    propertyId: connection.ga4PropertyId,
    startDate: toProviderDate(period.start),
    endDate: toProviderDate(period.end),
    metrics: [...GA4_CORE_METRICS],
  });

  if (!probe.ok) {
    console.error(`FAIL: live probe — ${probe.error.message}`);
    process.exit(1);
  }

  console.log(`PASS: live GA4 probe succeeded (${probe.rowCount} row(s) for ${period.label ?? period.start}).`);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
