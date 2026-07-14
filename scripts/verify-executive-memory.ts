/**
 * Phase 32A / 32A.1 — Executive Memory + Client Briefing integrity.
 * Run: npm run verify:executive-memory
 */

import assert from "node:assert/strict";
import {
  composeExecutiveClientBriefing,
  composeExecutiveClientSummary,
  isExecutiveClientBriefingAvailable,
} from "../lib/executive-client-summary";
import {
  getExecutiveMemoryLens,
  hasExecutiveMemory,
  listExecutiveMemoryClientSlugs,
  memoryToEvolutionItems,
  memoryToMilestones,
  memoryToPartnershipItems,
  memoryToStoryBeats,
} from "../lib/executive-memory";
import {
  getExecutiveEvolution,
  getExecutivePartnershipValue,
  getExecutivePresentation,
  isExecutivePerformanceAvailable,
  listExecutivePresentationSlugs,
} from "../lib/ces/executive-performance";
import {
  getPartnershipMilestones,
  getPartnershipStoryTimeline,
} from "../lib/ces/partnership";
import { getExecutiveReportingReadiness } from "../lib/reporting/readiness";
import { GOOGLE_ADS_PHASE_32B_SCOPE } from "../lib/reporting/providers/google/ads/phase-32b-scope";
import { GA4_ACTIVATION_CHECKLIST } from "../lib/reporting/providers/google/ga4/activation";
import { readFileSync } from "node:fs";
import { join } from "node:path";

let passed = 0;

function check(label: string, condition: boolean) {
  assert.ok(condition, label);
  passed += 1;
  console.log(`  ✔ ${label}`);
}

function main() {
  console.log("\nExecutive Memory / Phase 32A.1 verification\n");

  const slugs = listExecutiveMemoryClientSlugs();
  check("Multi-client memory registry registered", slugs.length >= 6);
  check("Primal memory authored", hasExecutiveMemory("primal-motorsports"));
  check(
    "Cusick memory stub registered (empty)",
    getExecutiveMemoryLens("cusick-morgan-motorsports")?.items.length === 0,
  );
  check("OTP memory stub registered (empty)", getExecutiveMemoryLens("otp")?.items.length === 0);

  const partnership = memoryToPartnershipItems("primal-motorsports");
  check("Primal partnership projection present", Boolean(partnership && partnership.length >= 6));
  check(
    "EP partnership uses memory",
    getExecutivePartnershipValue("primal-motorsports")[0]?.label === partnership![0]?.label,
  );
  check(
    "EP partnership strip includes landing experiences (presentation bridge)",
    partnership!.some((i) => i.id === "landing-pages" && i.complete),
  );

  const milestones = memoryToMilestones("primal-motorsports");
  check("Primal milestones from memory", Boolean(milestones && milestones.length === 7));
  check(
    "Milestone labels match EP adapter",
    JSON.stringify(getPartnershipMilestones("primal-motorsports")) === JSON.stringify(milestones),
  );

  const story = memoryToStoryBeats("primal-motorsports");
  check("Story beats from memory", Boolean(story && story.length === 6));
  check("Launch remains ahead", Boolean(story?.some((b) => !b.complete)));
  check(
    "Story timeline matches EP adapter",
    JSON.stringify(getPartnershipStoryTimeline("primal-motorsports")) === JSON.stringify(story),
  );

  const evolution = memoryToEvolutionItems("primal-motorsports");
  check("Evolution from memory", Boolean(evolution && evolution.length === 4));
  check(
    "EP evolution uses memory labels",
    getExecutiveEvolution("primal-motorsports")[0]?.label === "Lead Management",
  );

  const lens = getExecutiveMemoryLens("primal-motorsports")!;
  check(
    "Every memory item has evidenceStrength",
    lens.items.every((i) => Boolean(i.evidenceStrength)),
  );
  check(
    "Landing pages marked insufficient for briefing",
    lens.items.find((i) => i.id === "landing-pages")?.evidenceStrength === "insufficient",
  );
  check(
    "Awaiting-client item present",
    lens.items.some((i) => i.awaitingOwner === "client"),
  );
  check(
    "Primal OS is planned platform opportunity",
    lens.items.some(
      (i) =>
        i.id === "platform-primal-os" &&
        i.status === "planned" &&
        i.platformOpportunity?.pricing.mode === "prepared-separately",
    ),
  );
  check(
    "No Tekmetric claims in Primal memory",
    !lens.items.some((i) => /tekmetric/i.test(`${i.label} ${i.statement}`)),
  );

  const briefing = composeExecutiveClientBriefing({
    clientSlug: "primal-motorsports",
    results: {
      live: {
        periodLabel: "June 2026",
        providerLabels: ["Google Search Console"],
        metrics: [
          {
            label: "Clicks",
            value: "10",
            source: "live-reporting-facts",
            sourceLabel: "Google Search Console",
            periodLabel: "June 2026",
          },
        ],
        note: null,
      },
      prepared: {
        title: "Prepared Google Ads partnership report",
        periodLabel: "June 2026",
        sourceLabel: "Prepared monthly report (not live ReportingFacts)",
        outcomes: ["Advertising efficiency remains strong"],
        metrics: [
          {
            label: "Clicks",
            value: "100",
            source: "prepared-report",
            sourceLabel: "Prepared Google Ads report",
            periodLabel: "June 2026",
          },
        ],
        note: "These figures come from a prepared partnership report. They are not live Google Ads ReportingFacts.",
      },
    },
  });
  check("Executive Client Briefing composes for Primal", Boolean(briefing));
  check(
    "Briefing narrative chapters present",
    Boolean(briefing && briefing.chapters.length >= 4),
  );
  check("Briefing separates awaiting client", Boolean(briefing && briefing.awaitingClient.length >= 1));
  check("Briefing separates KXD current work", Boolean(briefing && briefing.currentWork.length >= 1));
  check(
    "Insufficient landing pages excluded from built",
    Boolean(briefing && !briefing.built.some((line) => /landing/i.test(line))),
  );
  check(
    "Prepared Ads metrics are not labeled live",
    Boolean(
      briefing &&
        briefing.results.prepared?.metrics.every((m) => m.source === "prepared-report") &&
        briefing.results.live.metrics.every((m) => m.source === "live-reporting-facts"),
    ),
  );
  check(
    "Pricing without approved amounts stays non-numeric",
    Boolean(
      briefing?.platformOpportunity?.pricing.models.every(
        (m) => m.amountLabel == null || !/\$\d/.test(m.amountLabel),
      ) && /prepared separately/i.test(briefing?.platformOpportunity?.pricing.note ?? ""),
    ),
  );
  check(
    "Empty memory clients do not invent a briefing",
    composeExecutiveClientBriefing({ clientSlug: "otp" }) === null &&
      composeExecutiveClientSummary({ clientSlug: "otp" }) === null,
  );

  check("Primal EP presentation enabled", isExecutivePerformanceAvailable("primal-motorsports"));
  check("Primal briefing enabled via presentation", isExecutiveClientBriefingAvailable("primal-motorsports"));
  check(
    "Future clients registered but briefing disabled",
    listExecutivePresentationSlugs().includes("cusick-morgan-motorsports") &&
      getExecutivePresentation("cusick-morgan-motorsports")?.briefingEnabled === false &&
      !isExecutiveClientBriefingAvailable("cusick-morgan-motorsports"),
  );

  const readiness = getExecutiveReportingReadiness({
    enabledCapabilities: ["seo"],
    ga4PropertyId: "530873364",
    searchConsoleSiteUrl: "https://primalmotorsports.com/",
    googleAdsCustomerId: null,
    hasSearchFacts: true,
    hasWebsiteFacts: false,
    hasAdsFacts: false,
    googleAuthMode: "configured",
    googleAdsDeveloperTokenConfigured: false,
  });
  check("Search Console readiness can be live", readiness.searchConsole.status === "live");
  check(
    "GA4 blocked by entitlement (honest)",
    readiness.websiteAnalytics.status === "pipeline-ready-entitlement-blocked",
  );
  check(
    "Google Ads pipeline-ready config/auth gated (honest)",
    readiness.googleAds.status === "pipeline-ready-auth-blocked" ||
      readiness.googleAds.status === "pipeline-ready-config-blocked" ||
      readiness.googleAds.status === "pipeline-ready-entitlement-blocked",
  );
  check("Google Ads not falsely live", readiness.googleAds.status !== "live");
  check("Google Ads not stuck on not-implemented", readiness.googleAds.status !== "not-implemented");
  check("Ads remaining work documented", readiness.googleAdsRemainingWork.length >= 6);
  check("GA4 activation path documented", GA4_ACTIVATION_CHECKLIST.steps.length >= 5);
  check("Ads Phase 32B scope documented", GOOGLE_ADS_PHASE_32B_SCOPE.workstreams.length >= 8);

  /* No clientSlug component branches in briefing UI */
  const briefingUi = readFileSync(
    join(process.cwd(), "components/ces/executive-briefing/CesExecutiveClientBriefing.tsx"),
    "utf8",
  );
  check(
    "No client-specific component branches in briefing UI",
    !/primal-motorsports|clientSlug\s*===/.test(briefingUi),
  );

  console.log(`\n${passed} checks passed.\n`);
}

main();
