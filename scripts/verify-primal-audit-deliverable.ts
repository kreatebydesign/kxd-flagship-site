/**
 * Verify Primal audit deliverable model, portal PDF auth wiring, and duplicate headings.
 *
 *   npx tsx scripts/verify-primal-audit-deliverable.ts
 */

import fs from "node:fs";
import path from "node:path";
import { decidePortalReportAccess } from "../lib/portal/analytics-visibility/report-access";
import {
  auditDeliverableHasDuplicateHeadings,
  auditDeliverableHeroContrastReport,
  buildAuditDeliverableViewModel,
  buildPrimalGoogleAdsAuditNarratives,
  composeBrandedReportSnapshot,
  primalAuditContentHasRejectedPhrases,
  PRIMAL_VERIFIED_TOTALS,
} from "../lib/reporting/branded-client";
import { parseNarrativeBody } from "../lib/reporting/branded-client/audit-deliverable";
import { buildManualAuditMetrics } from "../lib/reporting/branded-client/manual-audit-metrics";
import {
  brandedReportPeriodFromDoc,
  GOOGLE_ADS_AUDIT_REPAIR_KIND,
  presentationForReportDoc,
} from "../lib/reporting/branded-client/presentation";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function read(relPath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relPath), "utf8");
}

function buildFixtureSnapshot() {
  const period = brandedReportPeriodFromDoc({
    periodStart: "2026-05-15T00:00:00.000Z",
    periodEnd: "2026-08-12T23:59:59.999Z",
    reportingYear: 2026,
    reportingMonth: 8,
    timezone: "America/Los_Angeles",
  });
  const narratives = buildPrimalGoogleAdsAuditNarratives();
  const presentation = presentationForReportDoc({
    dataProvenance: { reportKind: GOOGLE_ADS_AUDIT_REPAIR_KIND },
    title: "Google Ads Audit & Repair Report — Primal Motorsports",
  });

  return composeBrandedReportSnapshot({
    reportId: 3,
    clientId: 1,
    clientName: "Primal Motorsports",
    version: 2,
    period,
    scope: {
      includedCapabilities: ["google-ads"],
      source: "operator-confirmed",
      confirmedBy: "KXD Operations",
      confirmedAt: new Date().toISOString(),
      notes: null,
    },
    verifiedMetrics: buildManualAuditMetrics(PRIMAL_VERIFIED_TOTALS, period),
    dataSources: [],
    workItems: [],
    presentation,
    narratives: {
      executiveSummary: narratives.executiveSummary,
      workCompleted: narratives.workCompleted,
      improvementsAndWins: narratives.improvementsMade,
      issuesOrRisks: narratives.issuesOrRisks,
      augustPriorities: narratives.augustPriorities,
      googleAds: narratives.googleAdsNarrative,
      closing: narratives.closingNote,
    },
    internalNotes: "operator-only",
  });
}

async function main() {
  const snapshot = buildFixtureSnapshot();
  const model = buildAuditDeliverableViewModel(snapshot, {
    auditPeriodLabel: "May 15–August 12, 2026",
    repairDateLabel: "August 13, 2026",
  });

  assert(model.metrics.length === 8, "Expected 8 audit metrics");
  assert(model.sections.length === 5, `Expected 5 narrative sections, got ${model.sections.length}`);
  assert(
    model.sections.some((section) => section.title.includes("Growth rebuild")),
    "Missing growth rebuild section",
  );

  const duplicateProblems = auditDeliverableHasDuplicateHeadings(model);
  assert(duplicateProblems.length === 0, duplicateProblems.join("; "));

  const parsed = parseNarrativeBody(narrativesWithHeading());
  assert(parsed.bullets.length === 2, "Bullet parser failed");
  assert(parsed.paragraphs.length === 1, "Paragraph parser failed");

  const pdfRoute = read("app/api/portal/reports/[id]/pdf/route.ts");
  assert(pdfRoute.includes("getPortalBrandedReportPdf"), "Portal PDF route missing helper");
  assert(pdfRoute.includes("decidePortalReportAccess"), "Portal PDF route missing access gate");
  assert(pdfRoute.includes("getPortalSession"), "Portal PDF route missing session");

  const reportPage = read("app/(portal)/portal/(app)/reports/[id]/page.tsx");
  assert(
    reportPage.includes("buildPortalAuditDeliverableViewModel"),
    "Portal report page missing audit deliverable builder",
  );

  const crossClient = decidePortalReportAccess({
    report: { status: "published", client: 2 },
    authorizedClientId: 1,
  });
  assert(!crossClient.ok, "Cross-client access should be denied");

  const unpublished = decidePortalReportAccess({
    report: { status: "ready", client: 1 },
    authorizedClientId: 1,
  });
  assert(!unpublished.ok, "Unpublished access should be denied");

  const allowed = decidePortalReportAccess({
    report: { status: "published", client: 1 },
    authorizedClientId: 1,
  });
  assert(allowed.ok, "Published Primal access should be allowed");

  const narratives = buildPrimalGoogleAdsAuditNarratives();
  const rejected = [
    ...primalAuditContentHasRejectedPhrases(narratives.issuesOrRisks),
    ...primalAuditContentHasRejectedPhrases(JSON.stringify(model)),
  ];
  assert(rejected.length === 0, `Rejected phrases present: ${rejected.join("; ")}`);

  const heroCss = read("components/client-hq/audit-deliverable-report.css");
  assert(
    !heroCss.includes("--kxd-os-text-primary"),
    "Hero CSS must not inherit portal text-primary tokens",
  );
  assert(
    heroCss.includes("--kxd-audit-hero-title: #f7f3eb"),
    "Hero title color must be explicitly scoped",
  );
  assert(
    heroCss.includes("background: var(--kxd-audit-accent) !important"),
    "Download button must use Primal accent explicitly",
  );

  const contrast = auditDeliverableHeroContrastReport();
  const contrastFailures = contrast.filter((row) => !row.passesAa);
  assert(
    contrastFailures.length === 0,
    `Hero contrast failures: ${contrastFailures.map((row) => row.element).join(", ")}`,
  );

  console.log(
    JSON.stringify(
      {
        ok: true,
        metrics: model.metrics.length,
        sections: model.sections.map((section) => section.title),
        pdfFilename: model.pdfFilename,
        heroContrast: contrast,
      },
      null,
      2,
    ),
  );
}

function narrativesWithHeading(): string {
  return `Intro paragraph.

• First item
• Second item`;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
