/**
 * Elevate and republish Primal Google Ads Audit Report (production report ID 3).
 *
 * Dry-run by default:
 *   npx tsx scripts/elevate-primal-google-ads-audit-report-3.ts
 *   APPLY=1 npx tsx scripts/elevate-primal-google-ads-audit-report-3.ts
 */

import { getPayload } from "payload";
import config from "@payload-config";
import {
  approveBrandedReport,
  generateBrandedReportPdf,
  reopenBrandedReportToDraft,
  saveBrandedReportDraft,
  submitBrandedReportForReview,
} from "@/lib/reporting/branded-client/lifecycle";
import { buildPrimalGoogleAdsAuditNarratives } from "@/lib/reporting/branded-client/primal-audit-content";
import {
  PRODUCTION_PRIMAL_CLIENT_ID,
  REPORT_IDENTITY,
} from "./stage-primal-google-ads-audit-report";

const REPORT_ID = 3;
const CLIENT_ID = PRODUCTION_PRIMAL_CLIENT_ID;
const OPERATOR = "KXD Operations";

function databaseUri(): string {
  const uri = process.env.DATABASE_URI?.trim() || process.env.DATABASE_URL?.trim() || "";
  if (!uri) throw new Error("DATABASE_URI/DATABASE_URL missing");
  return uri;
}

async function main() {
  const apply = process.env.APPLY === "1";
  const uri = databaseUri();
  process.env.DATABASE_URI = uri;

  const payload = await getPayload({ config });
  const existing = await payload.findByID({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "monthly-reports" as any,
    id: REPORT_ID,
    depth: 0,
    overrideAccess: true,
  });

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
        narrativeKeys: Object.keys(narratives),
      },
      null,
      2,
    ),
  );

  if (!apply) {
    console.log("Dry run only. Set APPLY=1 to revise, reapprove, and republish.");
    return;
  }

  await reopenBrandedReportToDraft(REPORT_ID, CLIENT_ID);
  await saveBrandedReportDraft(REPORT_ID, CLIENT_ID, narratives);
  await submitBrandedReportForReview(REPORT_ID, CLIENT_ID);
  const { snapshot: approvedSnapshot } = await approveBrandedReport(
    REPORT_ID,
    CLIENT_ID,
    OPERATOR,
  );
  await generateBrandedReportPdf(REPORT_ID, CLIENT_ID, OPERATOR);

  await payload.update({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "monthly-reports" as any,
    id: REPORT_ID,
    data: {
      status: "published",
      publishedAt: preservedPublishedAt ?? new Date().toISOString(),
      viewCount: preservedViewCount,
      dataProvenance: {
        ...provenance,
        clientVisible: true,
        operatorOnly: false,
        deliverableVersion: 2,
      },
    },
    overrideAccess: true,
  });

  console.log(
    JSON.stringify(
      {
        ok: true,
        reportId: REPORT_ID,
        fingerprint: approvedSnapshot.fingerprint,
        version: approvedSnapshot.version,
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
