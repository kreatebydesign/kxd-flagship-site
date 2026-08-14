/**
 * Stage the Primal Motorsports Google Ads Audit & Repair Report
 * in monthly-reports (Phase 10A performance report infrastructure).
 *
 * Operator-only defaults (never changed by this script):
 *   status: draft
 *   approvalStatus: in-review
 *   dataProvenance.clientVisible: false
 *
 * Dry-run by default — no database writes without APPLY=1.
 *
 *   npx tsx scripts/stage-primal-google-ads-audit-report.ts
 *   APPLY=1 npx tsx scripts/stage-primal-google-ads-audit-report.ts
 */

import { getPayload } from "payload";
import config from "@payload-config";
import {
  buildPrimalGoogleAdsAuditNarratives,
  PRIMAL_VERIFIED_TOTALS,
} from "@/lib/reporting/branded-client/primal-audit-content";

export const PRIMAL_CLIENT_SLUG = "primal-motorsports";
export const PRODUCTION_PRIMAL_CLIENT_ID = 1;
export const LOCAL_PRIMAL_CLIENT_ID = 13;

export const REPORT_IDENTITY = "primal-google-ads-audit-2026-08-13";
export const REPORT_TITLE =
  "Google Ads Audit & Repair Report — Primal Motorsports";

const AUDIT_PERIOD_LABEL = "May 15, 2026 – August 12, 2026";
const REPAIR_DATE_LABEL = "August 13, 2026";
const PERIOD_START = "2026-05-15T00:00:00.000Z";
const PERIOD_END = "2026-08-12T23:59:59.999Z";

/** Verified 90-day totals — task brief only. */
export const VERIFIED_TOTALS = PRIMAL_VERIFIED_TOTALS;

type RuntimeEnvironment = "production" | "non-production";

function databaseUri(): string {
  const uri = process.env.DATABASE_URI?.trim() || process.env.DATABASE_URL?.trim() || "";
  if (!uri) throw new Error("DATABASE_URI/DATABASE_URL missing");
  return uri;
}

function resolveRuntimeEnvironment(uri: string): RuntimeEnvironment {
  const host = new URL(uri).hostname;
  if (host === "127.0.0.1" || host === "localhost") {
    return "non-production";
  }
  if (
    process.env.VERCEL_ENV === "production" ||
    /neon\.tech/i.test(uri) ||
    process.env.NODE_ENV === "production"
  ) {
    return "production";
  }
  return "non-production";
}

function expectedClientId(env: RuntimeEnvironment): number {
  return env === "production" ? PRODUCTION_PRIMAL_CLIENT_ID : LOCAL_PRIMAL_CLIENT_ID;
}

function buildReportPayload() {
  const narratives = buildPrimalGoogleAdsAuditNarratives();
  return {
    title: REPORT_TITLE,
    status: "draft" as const,
    approvalStatus: "in-review" as const,
    reportType: "google_ads" as const,
    reportingMonth: 8,
    reportingYear: 2026,
    reportingTimezone: "America/Los_Angeles",
    includedCapabilities: ["google-ads"],
    periodStart: PERIOD_START,
    periodEnd: PERIOD_END,
    preparedBy: "Kreate by Design",
    executiveSummary: narratives.executiveSummary,
    workCompleted: narratives.workCompleted,
    improvementsMade: narratives.improvementsMade,
    issuesOrRisks: narratives.issuesOrRisks,
    augustPriorities: narratives.augustPriorities,
    googleAdsNarrative: narratives.googleAdsNarrative,
    closingNote: narratives.closingNote,
    internalNotes: `Report identity: ${REPORT_IDENTITY}. Operator staging only. clientVisible=false in dataProvenance. Do not publish without explicit approval.`,
    clientFacingNotes: null,
    dataProvenance: {
      reportIdentity: REPORT_IDENTITY,
      clientVisible: false,
      operatorOnly: true,
      reportKind: "google-ads-audit-repair",
      auditPeriodLabel: AUDIT_PERIOD_LABEL,
      repairDate: REPAIR_DATE_LABEL,
      verifiedTotals: VERIFIED_TOTALS,
      stagedBy: "scripts/stage-primal-google-ads-audit-report.ts",
    },
  };
}

async function resolvePrimalClient(
  payload: Awaited<ReturnType<typeof getPayload>>,
  env: RuntimeEnvironment,
): Promise<{ id: number; name: string; slug: string }> {
  const bySlug = await payload.find({
    collection: "clients",
    where: { slug: { equals: PRIMAL_CLIENT_SLUG } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });

  const slugDoc = bySlug.docs[0] as
    | { id: number; name?: string; slug?: string }
    | undefined;

  if (!slugDoc) {
    throw new Error(
      `Primal Motorsports not found (slug=${PRIMAL_CLIENT_SLUG}). No client was created or modified.`,
    );
  }

  const clientId = Number(slugDoc.id);
  const expectedId = expectedClientId(env);

  if (clientId !== expectedId) {
    throw new Error(
      `Primal slug ${PRIMAL_CLIENT_SLUG} resolves to id=${clientId} in ${env}; expected id=${expectedId}. Refusing — will not create or modify another client.`,
    );
  }

  return {
    id: clientId,
    name: String(slugDoc.name ?? "Primal Motorsports"),
    slug: String(slugDoc.slug ?? PRIMAL_CLIENT_SLUG),
  };
}

function reportIdentityFromDoc(doc: Record<string, unknown>): string | null {
  const provenance = doc.dataProvenance;
  if (!provenance || typeof provenance !== "object") return null;
  const identity = (provenance as Record<string, unknown>).reportIdentity;
  return typeof identity === "string" ? identity : null;
}

async function findExistingReport(
  payload: Awaited<ReturnType<typeof getPayload>>,
  clientId: number,
): Promise<{ id: number; title?: string } | null> {
  const result = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "monthly-reports" as any,
    where: { client: { equals: clientId } },
    limit: 50,
    sort: "-updatedAt",
    depth: 0,
    overrideAccess: true,
  });

  for (const doc of result.docs) {
    const row = doc as Record<string, unknown>;
    if (reportIdentityFromDoc(row) === REPORT_IDENTITY) {
      return { id: Number(row.id), title: String(row.title ?? "") };
    }
  }

  return null;
}

function printDryRunPlan(input: {
  env: RuntimeEnvironment;
  host: string;
  client: { id: number; name: string; slug: string };
  existing: { id: number; title?: string } | null;
  apply: boolean;
}) {
  const payload = buildReportPayload();

  console.log("\n── Primal Google Ads Audit Report — staging plan ──\n");
  console.log(`  Environment:     ${input.env}`);
  console.log(`  Database host:     ${input.host}`);
  console.log(`  Client:            ${input.client.name}`);
  console.log(`  Client id:         ${input.client.id}`);
  console.log(`  Client slug:       ${input.client.slug}`);
  console.log(`  Report identity:   ${REPORT_IDENTITY}`);
  console.log(`  Report title:      ${REPORT_TITLE}`);
  console.log(`  Audit period:      ${AUDIT_PERIOD_LABEL}`);
  console.log(`  Repair date:       ${REPAIR_DATE_LABEL}`);
  console.log(`  Status:            draft`);
  console.log(`  Approval:          in-review`);
  console.log(`  clientVisible:     false`);
  console.log(`  Mode:              ${input.apply ? "APPLY (write)" : "DRY-RUN (no write)"}`);
  console.log(
    `  Duplicate action:  ${input.existing ? `update monthly-reports id=${input.existing.id}` : "create new monthly-reports row"}`,
  );
  console.log("\n  Verified 90-day totals:");
  console.log(`    Total spend reviewed:        $${VERIFIED_TOTALS.totalSpendReviewed.toFixed(2)}`);
  console.log(`    Search spend / clicks:       $${VERIFIED_TOTALS.searchSpend.toFixed(2)} / ${VERIFIED_TOTALS.searchClicks}`);
  console.log(
    `    Demand Gen spend / clicks:   $${VERIFIED_TOTALS.demandGenSpend.toFixed(2)} / ${VERIFIED_TOTALS.demandGenClicks}`,
  );
  console.log(
    `    Search reported conversions: ${VERIFIED_TOTALS.searchReportedConversions} (historically contaminated)`,
  );
  console.log(
    `    Demand Gen reported conv.:  ${VERIFIED_TOTALS.demandGenReportedConversions} (historically contaminated)`,
  );
  console.log(
    `    Credible 60s+ Calls:         ${VERIFIED_TOTALS.credibleCallsFromAds60s} (pending Primal confirmation)`,
  );
  console.log("\n  Repairs completed August 13:");
  console.log("    • Website lead delivery repaired and tested end to end");
  console.log("    • Conversion actions corrected");
  console.log("    • All enabled broad-match keywords paused");
  console.log("    • Four weak phrase keywords paused");
  console.log("    • Four campaign-level negatives added");
  console.log("    • Demand Gen paused");
  console.log("    • Location option changed to physical presence");
  console.log("    • East Coast feeder states retained");
  console.log("    • Clean responsive Search ad enabled");
  console.log("    • Three claim-heavy Search ads paused");
  console.log("    • Google-hosted lead-form asset detached");
  console.log("    • Unsupported / urgency-driven assets paused");
  console.log("    • Search Partners, Display Network, AI Max, broad match remain off");
  console.log("    • Search budget remains $80/day — no increase");
  console.log("\n  Excluded from payload:");
  console.log("    • accountHealthScore");
  console.log("    • audit-in-progress language");
  console.log("    • Mar 31 – Jul 20, 2026 figures");
  console.log("    • unsupported performance ratings");

  if (!input.apply) {
    console.log("\n  DRY-RUN complete — no database write occurred.");
    console.log("  Re-run with APPLY=1 to stage.\n");
  }
}

async function main() {
  const uri = databaseUri();
  const host = new URL(uri).hostname;
  const env = resolveRuntimeEnvironment(uri);
  const apply = process.env.APPLY === "1";

  const payload = await getPayload({ config });
  const client = await resolvePrimalClient(payload, env);
  const existing = await findExistingReport(payload, client.id);

  printDryRunPlan({ env, host, client, existing, apply });

  if (!apply) {
    return;
  }

  const reportPayload = buildReportPayload();
  let reportId: number;

  if (existing) {
    await payload.update({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "monthly-reports" as any,
      id: existing.id,
      data: reportPayload as never,
      overrideAccess: true,
    });
    reportId = existing.id;
    console.log(`\n  Updated existing report id=${reportId}`);
  } else {
    const created = await payload.create({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "monthly-reports" as any,
      data: {
        ...reportPayload,
        client: client.id,
      } as never,
      overrideAccess: true,
    });
    reportId = Number(created.id);
    console.log(`\n  Created report id=${reportId}`);
  }

  const saved = await payload.findByID({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "monthly-reports" as any,
    id: reportId,
    depth: 0,
    overrideAccess: true,
  });

  const doc = saved as Record<string, unknown>;
  const provenance =
    doc.dataProvenance && typeof doc.dataProvenance === "object"
      ? (doc.dataProvenance as Record<string, unknown>)
      : {};

  if (doc.status !== "draft") throw new Error(`Expected status=draft, got ${String(doc.status)}`);
  if (doc.approvalStatus !== "in-review") {
    throw new Error(`Expected approvalStatus=in-review, got ${String(doc.approvalStatus)}`);
  }
  if (provenance.clientVisible !== false) {
    throw new Error("Expected dataProvenance.clientVisible === false");
  }
  if (provenance.reportIdentity !== REPORT_IDENTITY) {
    throw new Error(`Expected reportIdentity=${REPORT_IDENTITY}`);
  }

  console.log("\n  Staged successfully.");
  console.log(
    `  Client presentation preview: /admin/operations/reports/branded/${reportId}/preview?clientId=${client.id}`,
  );
  console.log(
    `  Operator workspace: /admin/operations/reports/branded/${reportId}?clientId=${client.id}`,
  );
  console.log(`  Performance view: /admin/operations/reports/${reportId}`);
  console.log(`  CMS edit:      /admin/collections/monthly-reports/${reportId}\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
