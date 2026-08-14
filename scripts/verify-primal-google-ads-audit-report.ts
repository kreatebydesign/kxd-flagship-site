/**
 * Verify Primal Google Ads audit report id 3 client presentation.
 *
 *   npx tsx scripts/verify-primal-google-ads-audit-report.ts
 */

import { getPayload } from "payload";
import config from "@payload-config";
import { decidePortalReportAccess } from "@/lib/portal/analytics-visibility";
import { composeBrandedReportSnapshot } from "@/lib/reporting/branded-client/compose";
import { buildBrandedReportHtml } from "@/lib/reporting/branded-client/export-html";
import {
  buildManualAuditMetrics,
  isVerifiedAuditTotals,
} from "@/lib/reporting/branded-client/manual-audit-metrics";
import { brandedReportPeriodFromDoc } from "@/lib/reporting/branded-client/presentation";
import {
  GOOGLE_ADS_AUDIT_REPAIR_KIND,
  presentationForReportDoc,
  reportKindFromDoc,
} from "@/lib/reporting/branded-client/presentation";
import { resolveReportScope } from "@/lib/reporting/branded-client/scope";
import {
  LOCAL_PRIMAL_CLIENT_ID,
  REPORT_IDENTITY,
  VERIFIED_TOTALS,
} from "./stage-primal-google-ads-audit-report";

const EXPECTED_REPORT_ID = 3;

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

async function main() {
  const payload = await getPayload({ config });
  const doc = (await payload.findByID({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "monthly-reports" as any,
    id: EXPECTED_REPORT_ID,
    depth: 0,
    overrideAccess: true,
  })) as Record<string, unknown>;

  const provenance =
    doc.dataProvenance && typeof doc.dataProvenance === "object"
      ? (doc.dataProvenance as Record<string, unknown>)
      : {};

  assert(Number(doc.id) === EXPECTED_REPORT_ID, "Report id must remain 3");
  assert(doc.status === "draft", `Expected status=draft, got ${String(doc.status)}`);
  assert(
    doc.approvalStatus === "in-review",
    `Expected approvalStatus=in-review, got ${String(doc.approvalStatus)}`,
  );
  assert(provenance.clientVisible === false, "Expected clientVisible=false");
  assert(
    provenance.reportIdentity === REPORT_IDENTITY,
    `Expected reportIdentity=${REPORT_IDENTITY}`,
  );

  const clientId = LOCAL_PRIMAL_CLIENT_ID;
  assert(doc.status !== "published", "Report must not be published");

  const access = decidePortalReportAccess({
    report: { status: String(doc.status), client: clientId },
    authorizedClientId: clientId,
  });
  assert(access.ok === false && access.reason === "unpublished", "Expected portal access unpublished");

  const timezone = String(doc.reportingTimezone ?? "America/Los_Angeles");
  const period = brandedReportPeriodFromDoc({
    periodStart: String(doc.periodStart),
    periodEnd: String(doc.periodEnd),
    reportingYear: Number(doc.reportingYear) || null,
    reportingMonth: Number(doc.reportingMonth) || null,
    timezone,
  });
  const presentation = presentationForReportDoc(doc);
  const reportKind = reportKindFromDoc(doc);
  const verifiedTotals = provenance.verifiedTotals;
  if (reportKind !== GOOGLE_ADS_AUDIT_REPAIR_KIND || !isVerifiedAuditTotals(verifiedTotals)) {
    throw new Error("Expected verified audit totals in dataProvenance");
  }

  const snapshot = composeBrandedReportSnapshot({
    reportId: EXPECTED_REPORT_ID,
    clientId,
    clientName: "Primal Motorsports",
    version: Number(doc.version ?? 1),
    period,
    scope: resolveReportScope({
      reportingEnabled: true,
      experienceCapabilities: [],
      operatorConfirmedCapabilities: ["google-ads"],
      confirmedBy: null,
      confirmedAt: null,
      notes: null,
    }),
    verifiedMetrics: buildManualAuditMetrics(verifiedTotals, period),
    dataSources: [],
    workItems: [],
    presentation,
    narratives: {
      executiveSummary: String(doc.executiveSummary ?? ""),
      workCompleted: String(doc.workCompleted ?? ""),
      improvementsAndWins: String(doc.improvementsMade ?? ""),
      issuesOrRisks: String(doc.issuesOrRisks ?? ""),
      augustPriorities: String(doc.augustPriorities ?? ""),
      closing: String(doc.closingNote ?? ""),
    },
    internalNotes: String(doc.internalNotes ?? ""),
  });

  assert(
    snapshot.presentation?.documentTitle === "Google Ads Audit & Repair Report",
    "Presentation title must be Google Ads Audit & Repair Report",
  );

  const spend = snapshot.metrics.find((m) => m.key === "ads.spend");
  assert(
    spend?.displayValue === "$9,000.53",
    `Expected total spend display $9,000.53, got ${spend?.displayValue}`,
  );
  assert(
    snapshot.metrics.some((m) => m.label === "Search clicks" && m.displayValue === "763"),
    "Search clicks metric missing",
  );
  assert(
    snapshot.metrics.some(
      (m) => m.label === "Demand Gen clicks" && m.displayValue === "1,876",
    ),
    "Demand Gen clicks metric missing",
  );
  assert(
    !snapshot.metrics.some((m) => m.displayValue === "Unavailable"),
    "Metrics must not show Unavailable",
  );

  const html = buildBrandedReportHtml(snapshot, { includeInternalNotes: false });

  const requiredPhrases = [
    "Google Ads Audit &amp; Repair Report",
    "Verified audit totals — manually reconciled from Google Ads exports",
    "$9,000.53",
    "$7,393.67",
    "$1,606.86",
    "763",
    "1,876",
    "Repairs completed August 13, 2026",
    "Repaired and verified website lead delivery end to end",
    "What the audit found",
    "generate_lead event",
    "What was intentionally not changed",
    "Next measurement window",
    "Cost per confirmed inquiry",
  ];

  for (const phrase of requiredPhrases) {
    assert(html.includes(phrase), `Missing client-facing phrase: ${phrase}`);
  }

  const forbiddenPhrases = [
    "Matt approves",
    "clientVisible=false",
    REPORT_IDENTITY,
    "operator staging",
    "Optional upgrades",
    "premium partnership",
    "SEO upgrade",
    "Internal notes",
    "GOOGLE ADS SPEND — Unavailable",
    "Unavailable",
  ];

  for (const phrase of forbiddenPhrases) {
    assert(!html.includes(phrase), `Forbidden client-facing phrase found: ${phrase}`);
  }

  const count = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "monthly-reports" as any,
    where: {
      and: [
        { client: { equals: clientId } },
        { "dataProvenance.reportIdentity": { equals: REPORT_IDENTITY } },
      ],
    },
    limit: 10,
    depth: 0,
    overrideAccess: true,
  });

  assert(count.totalDocs === 1, `Expected one report with identity, found ${count.totalDocs}`);

  console.log("\nverify:primal-google-ads-audit-report — PASS\n");
  console.log(`  Report id: ${EXPECTED_REPORT_ID}`);
  console.log(`  Client id: ${clientId}`);
  console.log(`  Total spend reviewed: $${VERIFIED_TOTALS.totalSpendReviewed.toFixed(2)}`);
  console.log(
    `  Preview URL: http://localhost:3000/admin/operations/reports/branded/${EXPECTED_REPORT_ID}/preview?clientId=${clientId}`,
  );
  console.log("");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
