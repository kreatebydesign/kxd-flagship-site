/**
 * Verify Primal Leadership Report — access gates + verified fact integrity.
 * Run: npx tsx scripts/verify-primal-leadership-report.ts
 */

import assert from "node:assert/strict";
import {
  canAccessPrimalLeadershipReport,
  getLatestPrimalLeadershipReportEntry,
  getPrimalLeadershipReportEntryById,
  getPrimalLeadershipReportForClient,
  isPrimalLeadershipReportClient,
  listCuratedPrimalLeadershipReportItems,
  listPrimalLeadershipReports,
  PRIMAL_LEADERSHIP_PROGRESS_UPDATE,
  PRIMAL_LEADERSHIP_PROGRESS_UPDATE_ID,
  PRIMAL_LEADERSHIP_REPORT,
  PRIMAL_LEADERSHIP_REPORT_HREF,
  PRIMAL_LEADERSHIP_REPORT_ID,
  PRIMAL_LATEST_LEADERSHIP_REPORT_ID,
} from "../lib/ces/leadership-report";

function check(label: string, condition: boolean) {
  assert.equal(condition, true, label);
  console.log(`  ✓ ${label}`);
}

console.log("\nPrimal Leadership Report verification\n");

check("baseline id stable", PRIMAL_LEADERSHIP_REPORT_ID === "primal-september-2026-post-launch");
check(
  "progress id stable",
  PRIMAL_LEADERSHIP_PROGRESS_UPDATE_ID === "primal-september-2026-performance-update",
);
check("href under partnership", PRIMAL_LEADERSHIP_REPORT_HREF === "/portal/partnership/leadership-report");
check("latest id is progress update", PRIMAL_LATEST_LEADERSHIP_REPORT_ID === PRIMAL_LEADERSHIP_PROGRESS_UPDATE_ID);
check("catalog newest first", listPrimalLeadershipReports()[0]?.id === PRIMAL_LEADERSHIP_PROGRESS_UPDATE_ID);
check(
  "catalog retains baseline",
  listPrimalLeadershipReports().some((r) => r.id === PRIMAL_LEADERSHIP_REPORT_ID),
);
check(
  "baseline archive label neutral",
  listPrimalLeadershipReports().find((r) => r.id === PRIMAL_LEADERSHIP_REPORT_ID)
    ?.archiveTypeLabel === "Previous Leadership Baseline",
);
check(
  "baseline archive period September 11",
  listPrimalLeadershipReports().find((r) => r.id === PRIMAL_LEADERSHIP_REPORT_ID)
    ?.archivePeriodLabel === "September 11, 2026",
);
check("primal slug allowed", isPrimalLeadershipReportClient("primal-motorsports"));
check("alias slug allowed", isPrimalLeadershipReportClient("primal"));
check("other client denied", !isPrimalLeadershipReportClient("otp-carts"));
check(
  "access requires entitlement",
  !canAccessPrimalLeadershipReport({
    clientSlug: "primal-motorsports",
    executivePerformanceEnabled: false,
  }),
);
check(
  "access allows entitled primal",
  canAccessPrimalLeadershipReport({
    clientSlug: "primal-motorsports",
    executivePerformanceEnabled: true,
  }),
);
check(
  "access denies entitled other client",
  !canAccessPrimalLeadershipReport({
    clientSlug: "de-bois-entertainment",
    executivePerformanceEnabled: true,
  }),
);
check(
  "loader returns null for other clients",
  getPrimalLeadershipReportForClient("otp-carts") === null,
);
check(
  "baseline loader still returns archived baseline",
  getPrimalLeadershipReportForClient("primal-motorsports")?.id ===
    PRIMAL_LEADERSHIP_REPORT_ID,
);
check(
  "latest entry is progress update",
  getLatestPrimalLeadershipReportEntry().kind === "progress-update",
);
check(
  "archive id resolves baseline",
  getPrimalLeadershipReportEntryById(PRIMAL_LEADERSHIP_REPORT_ID)?.kind ===
    "baseline",
);
check(
  "curated reports list both",
  listCuratedPrimalLeadershipReportItems().length === 2,
);
check(
  "curated baseline type neutral",
  listCuratedPrimalLeadershipReportItems().some(
    (r) =>
      r.id === PRIMAL_LEADERSHIP_REPORT_ID &&
      r.typeLabel === "Previous Leadership Baseline",
  ),
);

const baseline = PRIMAL_LEADERSHIP_REPORT;

check("baseline launch date context present", baseline.executiveSummary.some((p) => p.includes("September 9")));
check("baseline date", baseline.reportDateIso === "2026-09-11");
check("baseline organic clicks", baseline.organicBaseline.clicks === 1219);
check("baseline organic impressions", baseline.organicBaseline.impressions === 22500);
check("baseline organic ctr display", baseline.organicBaseline.ctrDisplay === "5.4%");
check("baseline organic avg position", baseline.organicBaseline.averagePositionDisplay === "9.2");
check("baseline ads spend", baseline.googleAds.spendDisplay === "$2,613.13");
check("baseline ads clicks", baseline.googleAds.clicksDisplay === "630");
check("baseline ads impressions", baseline.googleAds.impressionsDisplay === "25,840");
check("baseline ads primary conversions", baseline.googleAds.primaryConversionsDisplay === "6");
check("baseline bottom funnel august cpa", baseline.bottomFunnel.august.cpaDisplay === "$659.89");
check("baseline bottom funnel sept cpa", baseline.bottomFunnel.september.cpaDisplay === "$288.10");

const report = PRIMAL_LEADERSHIP_PROGRESS_UPDATE;

check("progress date", report.reportDateIso === "2026-09-26");
check("progress title", report.title === "Digital Performance & Growth Update");
check(
  "progress period label",
  report.periodLabel === "September 2026 · Leadership Performance Review",
);
check(
  "data through label",
  report.dataThroughLabel === "Data through September 26, 2026",
);
check("work highlights count", report.workHighlights.length === 3);
check("atlanta previous", report.heroCallout.previousDisplay === "21.4");
check("atlanta current", report.heroCallout.currentDisplay === "3.1");
check("organic previous clicks", report.organic.previous.clicksDisplay === "218");
check("organic current clicks", report.organic.current.clicksDisplay === "152");
check("organic previous impressions", report.organic.previous.impressionsDisplay === "4,231");
check("organic current impressions", report.organic.current.impressionsDisplay === "2,589");
check("organic previous ctr", report.organic.previous.ctrDisplay === "5.15%");
check("organic current ctr", report.organic.current.ctrDisplay === "5.87%");
check("gbp views", report.localVisibility.metrics.viewsDisplay === "7,401");
check("gbp website clicks", report.localVisibility.metrics.websiteClicksDisplay === "777");
check("gbp calls", report.localVisibility.metrics.callsDisplay === "52");
check("gbp reviews", report.localVisibility.metrics.reviewsDisplay === "87");
check("ads spend", report.googleAds.spendDisplay === "$2,401.20");
check("ads conversions", report.googleAds.conversionsDisplay === "5");
check("ads cpa", report.googleAds.cpaDisplay === "approximately $480");
check("ads budget", report.googleAds.dailyBudgetDisplay === "$90/day");
check(
  "ads conversion distribution broad",
  report.googleAds.conversionDistribution.some((line) => line.includes("4 of 5")),
);
check(
  "ads conversion distribution lessons",
  report.googleAds.conversionDistribution.some((line) =>
    line.toLowerCase().includes("race car lessons"),
  ),
);
check(
  "availability october",
  report.conversionOptimization.availabilityValue === "October 21–22, 2026",
);
check(
  "gbp period labeled apr-sep",
  report.localVisibility.gbpPeriodLabel.toUpperCase().includes("APR") &&
    report.localVisibility.gbpPeriodLabel.toUpperCase().includes("SEP"),
);
check(
  "racing school decline present",
  report.organic.queries.some(
    (q) => q.query === "racing school" && q.movement === "declined",
  ),
);
check(
  "racing school near me not framed as improvement",
  report.organic.queries.some(
    (q) =>
      q.query === "racing school near me" &&
      q.movement === "context" &&
      (q.note ?? "").toLowerCase().includes("not framed as an improvement"),
  ),
);

const removedUncertain = [
  "radical racing school",
  "race car driving school",
  "car racing school near me",
];
for (const q of removedUncertain) {
  check(
    `uncertain query removed from table: ${q}`,
    !report.organic.queries.some((row) => row.query === q),
  );
}
check(
  "uncertain racing schools plural row removed",
  !report.organic.queries.some((row) => row.query === "racing schools"),
);

const bannedNewReport = [
  "new website",
  "website launch",
  "post-launch",
  "rebuild",
  "new platform",
  "digital ecosystem",
  "leveraging",
  "holistic",
  "robust",
  "synergy",
  "optimized for success",
  "Donnie",
  "raised to",
  "gtag",
  "datalayer",
  "generate_lead",
];
const progressBlob = JSON.stringify(report).toLowerCase();
for (const term of bannedNewReport) {
  check(
    `progress report no banned term: ${term}`,
    !progressBlob.includes(term.toLowerCase()),
  );
}
const curatedClientLabels = listCuratedPrimalLeadershipReportItems()
  .map((r) => `${r.typeLabel} ${r.periodLabel} ${r.summary} ${r.title}`)
  .join(" ")
  .toLowerCase();
check(
  "curated archive client labels avoid post-launch wording",
  !curatedClientLabels.includes("post-launch"),
);

check(
  "progress does not claim aggregate click growth",
  !progressBlob.includes("clicks grew") && !progressBlob.includes("impressions grew"),
);
check(
  "progress does not claim ads cpa improvement vs prior report",
  !progressBlob.includes("lower cpa than") && !progressBlob.includes("cpa improved"),
);
check(
  "cro verification uses business language",
  report.conversionOptimization.verification.some((line) =>
    line.toLowerCase().includes("lead measurement remained intact"),
  ),
);

// Baseline immutability spot-checks (historical wording may retain launch language)
check("baseline still mentions September 9", baseline.executiveSummary.some((p) => p.includes("September 9")));
check("baseline remediations unchanged count", baseline.remediations.length === 6);
check(
  "baseline file still uses historical id",
  baseline.id === "primal-september-2026-post-launch",
);

console.log("\nAll checks passed.\n");
