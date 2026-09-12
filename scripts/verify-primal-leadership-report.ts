/**
 * Verify Primal Leadership Report — access gates + verified fact integrity.
 * Run: npx tsx scripts/verify-primal-leadership-report.ts
 */

import assert from "node:assert/strict";
import {
  canAccessPrimalLeadershipReport,
  getPrimalLeadershipReportForClient,
  isPrimalLeadershipReportClient,
  PRIMAL_LEADERSHIP_REPORT,
  PRIMAL_LEADERSHIP_REPORT_HREF,
  PRIMAL_LEADERSHIP_REPORT_ID,
} from "../lib/ces/leadership-report";

function check(label: string, condition: boolean) {
  assert.equal(condition, true, label);
  console.log(`  ✓ ${label}`);
}

console.log("\nPrimal Leadership Report verification\n");

check("report id stable", PRIMAL_LEADERSHIP_REPORT_ID === "primal-september-2026-post-launch");
check("href under partnership", PRIMAL_LEADERSHIP_REPORT_HREF === "/portal/partnership/leadership-report");
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

const report = PRIMAL_LEADERSHIP_REPORT;

check("launch date context present", report.executiveSummary.some((p) => p.includes("September 9")));
check("baseline date", report.reportDateIso === "2026-09-11");
check("organic clicks", report.organicBaseline.clicks === 1219);
check("organic impressions", report.organicBaseline.impressions === 22500);
check("organic ctr display", report.organicBaseline.ctrDisplay === "5.4%");
check("organic avg position", report.organicBaseline.averagePositionDisplay === "9.2");
check("ads spend", report.googleAds.spendDisplay === "$2,613.13");
check("ads clicks", report.googleAds.clicksDisplay === "630");
check("ads impressions", report.googleAds.impressionsDisplay === "25,840");
check("ads primary conversions", report.googleAds.primaryConversionsDisplay === "6");
check("bottom funnel august cpa", report.bottomFunnel.august.cpaDisplay === "$659.89");
check("bottom funnel sept cpa", report.bottomFunnel.september.cpaDisplay === "$288.10");
check(
  "cpa change language",
  report.bottomFunnel.cpaChangeDisplay.includes("56%"),
);
check(
  "cpa caveat present",
  report.bottomFunnel.cpaCaveat.toLowerCase().includes("small sample"),
);
check("ga4 property", report.measurement.ga4PropertyId === "549908814");
check("status items count", report.statusItems.length === 9);
check("remediations count", report.remediations.length === 6);
check(
  "remediations use completed-work framing",
  report.remediations.every((item) => typeof item.completed === "string" && item.completed.length > 20),
);
check(
  "remediations intro present",
  report.remediationsIntro.toLowerCase().includes("verification"),
);
check(
  "remediations close verified",
  report.remediationsClose.includes("VERIFIED"),
);
check(
  "no found/fixed defect framing keys",
  report.remediations.every((item) => !("found" in item) && !("fixed" in item)),
);
check("plan phases", report.plan.length === 3);
check(
  "executive summary moves to growth",
  report.executiveSummary.some((p) => p.includes("focus moves to measurable growth")),
);
check(
  "no rebuild-behind-us phrasing",
  !report.executiveSummary.some((p) => p.includes("rebuild phase is now behind")),
);
check(
  "historical equity preserved",
  report.historicalQueries.length >= 5 &&
    report.historicalBaselineNote.some((p) => p.toLowerCase().includes("not provided")),
);
check(
  "driver portal future only",
  report.futureDirection.some((p) => p.toLowerCase().includes("future")) &&
    report.futureDirection.some((p) => p.toLowerCase().includes("not claimed as delivered")),
);

const banned = [
  "digital ecosystem",
  "leveraging",
  "holistic",
  "robust",
  "synergy",
  "optimized for success",
  "Donnie",
];
const blob = JSON.stringify(report).toLowerCase();
for (const term of banned) {
  check(`no banned term: ${term}`, !blob.includes(term.toLowerCase()));
}

check(
  "does not claim two days proves long-term",
  !blob.includes("proves long-term") && !blob.includes("long-term improvement"),
);
check(
  "cross-launch baseline labeled",
  report.organicBaseline.periodLabel.toLowerCase().includes("cross-launch") ||
    report.organicBaseline.periodLabel.toLowerCase().includes("3-month"),
);
check(
  "organic note does not claim new site only",
  report.organicBaseline.note.toLowerCase().includes("not generated entirely"),
);

// CPA math integrity: (659.89 - 288.10) / 659.89 ≈ 0.5636 → ~56%
const augustCpa = 659.89;
const septCpa = 288.1;
const drop = (augustCpa - septCpa) / augustCpa;
check("cpa drop approximately 56%", drop > 0.55 && drop < 0.57);

console.log("\nAll checks passed.\n");
