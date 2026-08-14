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
export const VERIFIED_TOTALS = {
  totalSpendReviewed: 9000.53,
  searchSpend: 7393.67,
  demandGenSpend: 1606.86,
  searchClicks: 763,
  demandGenClicks: 1876,
  searchReportedConversions: 5,
  demandGenReportedConversions: 13,
  credibleCallsFromAds60s: 2,
} as const;

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
  const t = VERIFIED_TOTALS;
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
    executiveSummary: `Kreate by Design completed a Google Ads audit and repair for Primal Motorsports covering ${AUDIT_PERIOD_LABEL}. Repairs were completed on ${REPAIR_DATE_LABEL}.

This report documents verified spend and click totals from manual Google Ads export evidence, historically contaminated conversion reporting, credible call evidence, and the account repairs completed on ${REPAIR_DATE_LABEL}. Platform-reported conversions are not presented as confirmed business outcomes.`,
    googleAdsNarrative: `Audit period: ${AUDIT_PERIOD_LABEL}.
Repair completed: ${REPAIR_DATE_LABEL}.

Verified 90-day totals reviewed:
• Total spend reviewed: $${t.totalSpendReviewed.toFixed(2)}
• Search spend: $${t.searchSpend.toFixed(2)} · ${t.searchClicks} clicks
• Demand Gen spend: $${t.demandGenSpend.toFixed(2)} · ${t.demandGenClicks} clicks
• Search reported conversions: ${t.searchReportedConversions} — historically contaminated
• Demand Gen reported conversions: ${t.demandGenReportedConversions} — historically contaminated
• Credible calls meeting 60-second threshold: ${t.credibleCallsFromAds60s} — pending Primal confirmation

Source: verified manual export evidence reconciled from Google Ads exports. Not a live KXD OS connection.`,
    workCompleted: `Repairs completed August 13, 2026:

• Repaired and verified website lead delivery end to end
• Corrected conversion-action bidding priorities
• Kept confirmed website submissions and 60-second Calls from ads as Primary
• Changed phone-link clicks, email clicks, and Google-hosted lead form actions to Secondary
• Paused all enabled broad-match keywords
• Paused four weak phrase-match keywords
• Added four campaign-level negative keywords
• Paused Demand Gen pending controlled rebuild
• Changed location targeting from presence-or-interest to physical presence
• Retained East Coast feeder states based on Primal's customer-travel history
• Enabled a clean responsive Search ad
• Paused three claim-heavy legacy Search ads
• Detached the Google-hosted lead-form asset
• Paused unsupported scarcity, licensing, and urgency assets
• Preserved Search Partners off
• Preserved Display Network off
• Preserved AI Max off
• Preserved campaign broad match off
• Preserved the $80/day Search budget
• Made no budget increase`,
    improvementsMade: `What was intentionally not changed:

• No budget increase
• No aggressive device reduction
• No aggressive ad scheduling
• No change to the 60-second call threshold
• No Google broad-match recommendation
• No AI Max
• No removal of East Coast feeder markets
• No claim that platform conversions equal confirmed leads`,
    issuesOrRisks: `What the audit found:

• The previous landing page could record a generate_lead event even when server-side email delivery failed.
• Google therefore received conversion signals that did not reliably represent inquiries received by Primal.
• All five conversion actions had been Primary and could influence automated bidding.
• Broad match consumed approximately $2,013.23 for one historically recorded conversion.
• Five surrounding states spent approximately $3,233 with no recorded Search conversions, but the broken form makes that result inconclusive.
• Primal confirmed that East Coast customers travel to Atlanta for schools and vehicle purchases, so those feeder states were retained.
• Demand Gen used optimized targeting beyond strict remarketing.
• The only recorded website-placement conversion came from pc-facile.com and was not accepted as credible lead evidence.
• Demand Gen creative contained "Real Track Experienceq."
• Historical Google conversion counts must not be represented as confirmed received inquiries.`,
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
    augustPriorities: `Next measurement window:

• Confirmed forms received by Primal
• Qualified calls lasting at least 60 seconds
• Search-term quality
• Georgia Core versus East Coast Destination performance
• Device performance after clean form data accumulates
• Cost per confirmed inquiry
• Lead quality confirmed by Primal
• Booking and sales opportunities
• Whether Demand Gen should be rebuilt as strict remarketing`,
    closingNote: `Prepared by Kreate by Design for Primal Motorsports. Audit period ${AUDIT_PERIOD_LABEL}. Repairs completed ${REPAIR_DATE_LABEL}. Verified figures reflect manual export evidence; platform conversion totals are documented as historically contaminated, not as confirmed business outcomes.`,
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
