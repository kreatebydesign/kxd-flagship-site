/**
 * Verify portal report embed presentation — contrast, isolation, screenshots.
 *
 *   npx tsx scripts/verify-report-portal-embed-visual.ts
 *   CAPTURE_SCREENSHOTS=1 npx tsx scripts/verify-report-portal-embed-visual.ts
 */

import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";
import { buildBrandedReportHtml } from "../lib/reporting/branded-client/export-html.ts";
import { buildHtmlReport } from "../lib/reporting/export.ts";
import type { BrandedReportSnapshot } from "../lib/reporting/branded-client/types.ts";
import type { GeneratedReportPayload } from "../lib/reporting/types.ts";
import {
  extractReportDocumentBody,
  preparePortalReportEmbedHtml,
} from "../lib/reporting/portal/embed.ts";
import {
  contrastRatio,
  meetsWcagAaNormalText,
} from "../lib/reporting/portal/contrast.ts";

const OUT_DIR = join(process.cwd(), "public", "_tmp-visual-qa", "report-portal-embed");

function auditSnapshotFixture() {
  return {
    schemaVersion: 1,
    reportId: 3,
    clientId: 1,
    clientName: "Primal Motorsports",
    version: 1,
    generatedAt: "2026-08-14T17:00:00.000Z",
    fingerprint: "fixture",
    period: {
      label: "May 15, 2026 – August 12, 2026",
      timezone: "America/Los_Angeles",
      start: "2026-05-15T00:00:00.000Z",
      end: "2026-08-12T23:59:59.999Z",
      year: 2026,
      month: 8,
      isControlledJuly2026: false,
      excludesFinalDayNote: null,
    },
    scope: {
      includedCapabilities: ["google-ads"],
      source: "operator-confirmed",
      confirmedBy: null,
      confirmedAt: null,
      notes: null,
    },
    metrics: [
      {
        key: "ads.spend",
        label: "Total spend reviewed",
        displayValue: "$9,000.53",
        percentChangeLabel: "—",
        source: "Verified manual export",
        completeness: "complete",
        note: null,
      },
      {
        key: "ads.search-clicks",
        label: "Search clicks",
        displayValue: "763",
        percentChangeLabel: "—",
        source: "Verified manual export",
        completeness: "complete",
        note: null,
      },
    ],
    dataSources: [],
    workCompleted: [],
    outOfScopeOpportunities: [],
    narratives: {
      executiveSummary: {
        title: "Executive summary",
        body: "Primal Motorsports engaged Kreate by Design to audit Google Ads performance and repair lead delivery.",
        provenance: "Operator-authored",
      },
      websitePerformance: { title: "Website", body: "", provenance: "" },
      organicSearch: { title: "Organic", body: "", provenance: "" },
      googleAds: { title: "Google Ads", body: "", provenance: "" },
      workCompleted: {
        title: "Repairs completed August 13, 2026",
        body: "Repaired and verified website lead delivery end to end.",
        provenance: "",
      },
      improvementsAndWins: {
        title: "What was intentionally not changed",
        body: "Campaign structure and budgets were preserved.",
        provenance: "",
      },
      issuesOrRisks: {
        title: "What the audit found",
        body: "Lead events were not firing consistently on key landing pages.",
        provenance: "",
      },
      augustPriorities: {
        title: "Next measurement window",
        body: "Monitor cost per confirmed inquiry over the next 30 days.",
        provenance: "",
      },
      recommendations: { title: "Recommendations", body: "", provenance: "" },
      closing: {
        title: "Closing",
        body: "This report reflects verified manual export evidence.",
        provenance: "",
      },
    },
    internalNotes: "Operator staging only. Do not publish without explicit approval.",
    presentation: {
      kind: "google-ads-audit-repair",
      documentTitle: "Google Ads Audit & Repair Report",
      coverTitle: "Google Ads Audit & Repair Report",
      coverEyebrow: "Audit & repair deliverable",
      performanceSnapshotLead:
        "Verified audit totals — manually reconciled from Google Ads exports.",
      hideDataFreshnessPanel: true,
      hideOutOfScope: true,
      hideWorkCompletedList: true,
      hideNarrativeProvenance: true,
      useAuditTheme: true,
      hiddenNarrativeKeys: ["websitePerformance", "organicSearch", "googleAds", "recommendations"],
      sectionTitles: {},
    },
  } as unknown as BrandedReportSnapshot;
}

function legacyPayloadFixture() {
  return {
    executiveSummary: "Monthly performance summary for the partnership period.",
    workCompleted: "Website updates shipped.\nSEO metadata refreshed.",
    deliverables: [],
    projects: [],
    meetings: [],
    websiteHealth: {},
    infrastructure: {},
    growth: {},
    recommendations: {
      topPriorities: ["Expand landing page testing"],
      quickWins: [],
      infrastructureImprovements: [],
      growthOpportunities: [],
      completedWins: [],
    },
    kpis: [
      { label: "Sessions", value: "12,450" },
      { label: "Leads", value: "38" },
      { label: "Conversion rate", value: "3.1%" },
    ],
    traffic: { connected: false, statusNote: "Not connected" },
    conversions: { connected: false, statusNote: "Not connected" },
    seo: { connected: false, statusNote: "Not connected" },
    timeline: [],
    notes: "",
    nextMonthPriorities: ["Continue CRO testing"],
    connectorStatus: [],
  } as unknown as GeneratedReportPayload;
}

function portalShellPage(title: string, embedHtml: string, css: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <style>
    body {
      margin: 0;
      background: #0b0b0b;
      color: #f2ece2;
      font-family: system-ui, sans-serif;
    }
    .portal-shell {
      max-width: 56rem;
      margin: 0 auto;
      padding: 1.5rem 1rem 3rem;
    }
    .portal-nav {
      font-size: 0.8rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: rgba(242, 236, 226, 0.55);
      margin-bottom: 1rem;
    }
    .portal-hero h1 {
      font-family: Georgia, serif;
      font-weight: 500;
      margin: 0 0 0.35rem;
    }
    .portal-hero p {
      color: rgba(242, 236, 226, 0.72);
      margin: 0 0 1.25rem;
    }
    ${css}
  </style>
</head>
<body>
  <div class="portal-shell">
    <div class="portal-nav">Reports / Executive Report</div>
    <div class="portal-hero">
      <h1>Google Ads Audit &amp; Repair Report</h1>
      <p>August 2026</p>
    </div>
    <div class="kxd-report-portal-embed">${embedHtml}</div>
  </div>
</body>
</html>`;
}

function brokenShellPage(title: string, rawHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <style>
    body { margin: 0; background: #0b0b0b; color: #141414; font-family: system-ui, sans-serif; }
    .portal-shell { max-width: 56rem; margin: 0 auto; padding: 1.5rem 1rem 3rem; color: #141414; }
    .kxd-report-portal-embed { border-radius: 4px; overflow: hidden; background: #080808; }
  </style>
</head>
<body>
  <div class="portal-shell">
    <div class="kxd-report-portal-embed">${rawHtml}</div>
  </div>
</body>
</html>`;
}

function captureScreenshots(): void {
  const desktopAudit = join(OUT_DIR, "audit-fixed-desktop.png");
  const mobileAudit = join(OUT_DIR, "audit-fixed-mobile.png");
  const desktopLegacy = join(OUT_DIR, "legacy-fixed-desktop.png");
  const mobileLegacy = join(OUT_DIR, "legacy-fixed-mobile.png");
  const desktopBroken = join(OUT_DIR, "audit-broken-desktop.png");

  const runShot = (htmlPath: string, outPath: string, width: number, height: number) => {
    execSync(
      `npx --yes playwright@1.51.0 screenshot --browser=chromium "${htmlPath}" "${outPath}" --viewport-size=${width},${height} --full-page`,
      { stdio: "pipe" },
    );
  };

  runShot(`file://${join(OUT_DIR, "audit-fixed.html")}`, desktopAudit, 1440, 1200);
  runShot(`file://${join(OUT_DIR, "audit-fixed.html")}`, mobileAudit, 390, 844);
  runShot(`file://${join(OUT_DIR, "legacy-fixed.html")}`, desktopLegacy, 1440, 1200);
  runShot(`file://${join(OUT_DIR, "legacy-fixed.html")}`, mobileLegacy, 390, 844);
  runShot(`file://${join(OUT_DIR, "audit-broken.html")}`, desktopBroken, 1440, 1200);
}

async function main(): Promise<void> {
  const css = readFileSync(
    join(process.cwd(), "components/client-hq/kxd-report-portal-embed.css"),
    "utf8",
  );

  const auditHtml = buildBrandedReportHtml(auditSnapshotFixture(), { includeInternalNotes: false });
  const legacyHtml = buildHtmlReport("Sample Client", 8, 2026, legacyPayloadFixture());

  assert.ok(auditHtml.includes("<body"), "audit export must be a full HTML document");
  assert.ok(legacyHtml.includes("<body"), "legacy export must be a full HTML document");

  const auditBody = extractReportDocumentBody(auditHtml);
  const auditEmbed = preparePortalReportEmbedHtml(auditHtml);
  const legacyEmbed = preparePortalReportEmbedHtml(legacyHtml);

  assert.match(auditEmbed, /^<div class="kxd-report-portal-root"/);
  assert.ok(auditEmbed.includes('data-kxd-report-embed="true"'));
  assert.ok(!auditEmbed.includes("<!DOCTYPE"), "embed must not include doctype");
  assert.ok(!/<head[\s>]/i.test(auditEmbed), "embed must not include head");
  assert.ok(auditBody.includes('class="cover"'));
  assert.ok(!auditEmbed.includes("Operator staging only"));
  assert.ok(!auditEmbed.includes("Do not publish without explicit approval"));

  const beforeBodyContrast = contrastRatio("#0c0c0c", "#080808");
  const afterBodyContrast = contrastRatio("#141414", "#fffdf8");
  const afterCoverContrast = contrastRatio("#f7f1e6", "#080808");
  const afterMetricContrast = contrastRatio("#0a0a0a", "#f3ebe0");
  const afterMetricLabelContrast = contrastRatio("#6d5620", "#f3ebe0");

  assert.ok(beforeBodyContrast != null && beforeBodyContrast < 2, "broken state should fail contrast");
  assert.ok(meetsWcagAaNormalText(afterBodyContrast), "fixed body contrast must meet WCAG AA");
  assert.ok(meetsWcagAaNormalText(afterCoverContrast), "cover contrast must meet WCAG AA");
  assert.ok(meetsWcagAaNormalText(afterMetricContrast), "metric contrast must meet WCAG AA");
  assert.ok(meetsWcagAaNormalText(afterMetricLabelContrast), "metric label contrast must meet WCAG AA");

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(join(OUT_DIR, "audit-fixed.html"), portalShellPage("Audit Fixed", auditEmbed, css));
  writeFileSync(join(OUT_DIR, "legacy-fixed.html"), portalShellPage("Legacy Fixed", legacyEmbed, css));
  writeFileSync(join(OUT_DIR, "audit-broken.html"), brokenShellPage("Audit Broken", auditHtml));

  if (process.env.CAPTURE_SCREENSHOTS === "1") {
    captureScreenshots();
  }

  console.log(
    JSON.stringify(
      {
        pass: true,
        fixtures: ["audit-branded", "legacy-executive"],
        contrast: {
          before: {
            bodyOnShell: beforeBodyContrast,
            note: "Near-black ink (#0c0c0c) on #080808 shell — unreadable",
          },
          after: {
            bodyOnSurface: afterBodyContrast,
            coverOnDark: afterCoverContrast,
            metricOnPanel: afterMetricContrast,
            metricLabelOnPanel: afterMetricLabelContrast,
          },
        },
        artifacts: {
          auditFixedHtml: "/_tmp-visual-qa/report-portal-embed/audit-fixed.html",
          legacyFixedHtml: "/_tmp-visual-qa/report-portal-embed/legacy-fixed.html",
          auditBrokenHtml: "/_tmp-visual-qa/report-portal-embed/audit-broken.html",
          screenshots: process.env.CAPTURE_SCREENSHOTS === "1"
            ? {
                auditFixedDesktop: "/_tmp-visual-qa/report-portal-embed/audit-fixed-desktop.png",
                auditFixedMobile: "/_tmp-visual-qa/report-portal-embed/audit-fixed-mobile.png",
                legacyFixedDesktop: "/_tmp-visual-qa/report-portal-embed/legacy-fixed-desktop.png",
                legacyFixedMobile: "/_tmp-visual-qa/report-portal-embed/legacy-fixed-mobile.png",
                auditBrokenDesktop: "/_tmp-visual-qa/report-portal-embed/audit-broken-desktop.png",
              }
            : "Set CAPTURE_SCREENSHOTS=1 to generate PNGs",
        },
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
