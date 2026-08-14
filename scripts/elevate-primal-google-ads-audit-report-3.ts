/**
 * Elevate and republish Primal Google Ads Audit Report (production report ID 3).
 *
 * Dry-run by default:
 *   npx tsx scripts/elevate-primal-google-ads-audit-report-3.ts
 *   APPLY=1 npx tsx scripts/elevate-primal-google-ads-audit-report-3.ts
 */

import { getPayload } from "payload";
import config from "@payload-config";
import { composeBrandedReportSnapshot } from "@/lib/reporting/branded-client/compose";
import { buildBrandedReportHtml } from "@/lib/reporting/branded-client/export-html";
import { renderBrandedReportPdf } from "@/lib/reporting/branded-client/export-pdf";
import {
  buildManualAuditMetrics,
  isVerifiedAuditTotals,
} from "@/lib/reporting/branded-client/manual-audit-metrics";
import {
  brandedReportPeriodFromDoc,
  GOOGLE_ADS_AUDIT_REPAIR_KIND,
  presentationForReportDoc,
  reportKindFromDoc,
} from "@/lib/reporting/branded-client/presentation";
import { withFingerprint } from "@/lib/reporting/branded-client/snapshot";
import { buildPrimalGoogleAdsAuditNarratives } from "@/lib/reporting/branded-client/primal-audit-content";
import type { BrandedReportSnapshot } from "@/lib/reporting/branded-client/types";
import {
  PRODUCTION_PRIMAL_CLIENT_ID,
  REPORT_IDENTITY,
} from "./stage-primal-google-ads-audit-report";

const REPORT_ID = 3;
const CLIENT_ID = PRODUCTION_PRIMAL_CLIENT_ID;
const OPERATOR = "KXD Operations";
const COLLECTION = "monthly-reports";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

function databaseUri(): string {
  const uri = process.env.DATABASE_URI?.trim() || process.env.DATABASE_URL?.trim() || "";
  if (!uri) throw new Error("DATABASE_URI/DATABASE_URL missing");
  return uri;
}

function clientNameOf(doc: AnyDoc): string {
  const client = doc.client;
  if (client && typeof client === "object" && client.name) return String(client.name);
  return "Client";
}

function composeAuditSnapshotFromDoc(doc: AnyDoc): BrandedReportSnapshot {
  const timezone =
    (typeof doc.reportingTimezone === "string" && doc.reportingTimezone) ||
    "America/Los_Angeles";
  const period = brandedReportPeriodFromDoc({
    periodStart: String(doc.periodStart),
    periodEnd: String(doc.periodEnd),
    reportingYear: Number(doc.reportingYear) || null,
    reportingMonth: Number(doc.reportingMonth) || null,
    timezone,
  });
  const presentation = presentationForReportDoc(doc);
  const provenance =
    doc.dataProvenance && typeof doc.dataProvenance === "object"
      ? (doc.dataProvenance as Record<string, unknown>)
      : null;
  const verifiedTotals = provenance?.verifiedTotals;
  const metrics =
    reportKindFromDoc(doc) === GOOGLE_ADS_AUDIT_REPAIR_KIND &&
    isVerifiedAuditTotals(verifiedTotals)
      ? buildManualAuditMetrics(verifiedTotals, period)
      : [];

  const snapshotBase = composeBrandedReportSnapshot({
    reportId: Number(doc.id),
    clientId: CLIENT_ID,
    clientName: clientNameOf(doc),
    version: Number(doc.version ?? 1),
    period,
    scope: {
      includedCapabilities: ["google-ads"],
      source: "operator-confirmed",
      confirmedBy: OPERATOR,
      confirmedAt: new Date().toISOString(),
      notes: null,
    },
    verifiedMetrics: metrics,
    dataSources: [],
    workItems: [],
    presentation,
    narratives: {
      executiveSummary: String(doc.executiveSummary ?? ""),
      workCompleted: String(doc.workCompleted ?? ""),
      improvementsAndWins: String(doc.improvementsMade ?? ""),
      issuesOrRisks: String(doc.issuesOrRisks ?? ""),
      augustPriorities: String(doc.augustPriorities ?? ""),
      googleAds: String(doc.googleAdsNarrative ?? ""),
      closing: String(doc.closingNote ?? ""),
    },
    internalNotes: String(doc.internalNotes ?? ""),
  });

  return withFingerprint(snapshotBase);
}

async function main() {
  const apply = process.env.APPLY === "1";
  process.env.DATABASE_URI = databaseUri();

  const payload = await getPayload({ config });
  const existing = (await payload.findByID({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: COLLECTION as any,
    id: REPORT_ID,
    depth: 1,
    overrideAccess: true,
  })) as AnyDoc;

  const provenance = (existing.dataProvenance ?? {}) as Record<string, unknown>;
  if (provenance.reportIdentity !== REPORT_IDENTITY) {
    throw new Error(
      `Report ${REPORT_ID} identity mismatch (expected ${REPORT_IDENTITY}).`,
    );
  }

  const client =
    typeof existing.client === "object" && existing.client
      ? Number((existing.client as { id?: number }).id)
      : Number(existing.client);
  if (client !== CLIENT_ID) {
    throw new Error(`Report ${REPORT_ID} client mismatch (expected ${CLIENT_ID}).`);
  }

  const narratives = buildPrimalGoogleAdsAuditNarratives();
  const preservedPublishedAt = existing.publishedAt
    ? String(existing.publishedAt)
    : null;
  const preservedViewCount = Number(existing.viewCount ?? 0);

  console.log(
    JSON.stringify(
      {
        apply,
        reportId: REPORT_ID,
        clientId: CLIENT_ID,
        currentStatus: existing.status,
        currentApproval: existing.approvalStatus,
        preservedPublishedAt,
        preservedViewCount,
      },
      null,
      2,
    ),
  );

  if (!apply) {
    console.log("Dry run only. Set APPLY=1 to revise, reapprove, and republish.");
    return;
  }

  // Contain during revision — preserve publishedAt, viewCount, and event 215.
  await payload.update({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: COLLECTION as any,
    id: REPORT_ID,
    data: {
      status: "ready",
      dataProvenance: {
        ...provenance,
        clientVisible: false,
      },
    },
    overrideAccess: true,
  });

  const nextVersion =
    existing.approvalStatus === "approved" ||
    existing.approvalStatus === "ready-for-manual-delivery"
      ? Number(existing.version ?? 1) + 1
      : Number(existing.version ?? 1);

  let doc = (await payload.update({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: COLLECTION as any,
    id: REPORT_ID,
    data: {
      approvalStatus: "draft",
      status: "draft",
      version: nextVersion,
      approvedSnapshot: null,
      approvedFingerprint: null,
      reportApprovedAt: null,
      reportApprovedBy: null,
      executiveSummary: narratives.executiveSummary,
      workCompleted: narratives.workCompleted,
      improvementsMade: narratives.improvementsMade,
      issuesOrRisks: narratives.issuesOrRisks,
      augustPriorities: narratives.augustPriorities,
      googleAdsNarrative: narratives.googleAdsNarrative,
      closingNote: narratives.closingNote,
    },
    depth: 1,
    overrideAccess: true,
  })) as AnyDoc;

  doc = (await payload.update({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: COLLECTION as any,
    id: REPORT_ID,
    data: {
      approvalStatus: "in-review",
      status: "ready",
    },
    depth: 1,
    overrideAccess: true,
  })) as AnyDoc;

  const snapshot = composeAuditSnapshotFromDoc(doc);
  const htmlExport = buildBrandedReportHtml(snapshot, { includeInternalNotes: false });
  const { buffer: pdfBuffer, filename: pdfFilename } = await renderBrandedReportPdf(snapshot);

  doc = (await payload.update({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: COLLECTION as any,
    id: REPORT_ID,
    data: {
      approvalStatus: "approved",
      status: "ready",
      approvedSnapshot: snapshot,
      approvedFingerprint: snapshot.fingerprint,
      reportApprovedAt: new Date().toISOString(),
      reportApprovedBy: OPERATOR,
      approvedBy: OPERATOR,
      reportData: snapshot,
      htmlExport,
      pdfGeneratedAt: new Date().toISOString(),
      deliveryMode: "manual",
    },
    depth: 1,
    overrideAccess: true,
  })) as AnyDoc;

  await payload.update({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: COLLECTION as any,
    id: REPORT_ID,
    data: {
      status: "published",
      publishedAt: preservedPublishedAt ?? new Date().toISOString(),
      viewCount: preservedViewCount,
      dataProvenance: {
        ...provenance,
        clientVisible: true,
        operatorOnly: false,
        deliverableVersion: 3,
      },
    },
    overrideAccess: true,
  });

  console.log(
    JSON.stringify(
      {
        ok: true,
        reportId: REPORT_ID,
        fingerprint: snapshot.fingerprint,
        version: snapshot.version,
        pdfFilename,
        pdfBytes: pdfBuffer.length,
        status: "published",
        clientVisible: true,
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
