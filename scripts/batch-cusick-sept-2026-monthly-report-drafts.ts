/**
 * Cusick September 2026 Monthly Report Draft Batch (production-controlled).
 *
 * Creates DRAFT-only branded MonthlyReports for clients 5 / 9 / 14 / 10.
 *
 * Period integrity:
 * - reportingMonth=9, reportingYear=2026 (September report)
 * - Google performance window = August 1–31, 2026 (latest completed Google month)
 *
 * Does NOT:
 * - approve / snapshot / publish
 * - generate PDF (lifecycle requires approved snapshot)
 * - email, invite, or activate Don
 * - provision Billy
 * - sync Google / invent facts
 *
 * Usage:
 *   KXD_CONFIRM_CUSICK_SEPT_REPORT_DRAFTS=1 \
 *     KXD_SERVER_ONLY_SHIM=1 node --import ./scripts/shims/register-server-only.mjs --import tsx \
 *     scripts/batch-cusick-sept-2026-monthly-report-drafts.ts
 *
 *   APPLY=1  … write drafts + HTML previews
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { getPayload } from "payload";
import config from "@payload-config";
import {
  generateBrandedClientReport,
  getBrandedReportPreviewHtml,
  saveBrandedReportDraft,
} from "../lib/reporting/branded-client/lifecycle";
import type { CompletedWorkItem } from "../lib/reporting/branded-client/types";
import { createBrandedReportPeriod } from "../lib/reporting/branded-client/period";
import {
  formatDbTarget,
  loadPayloadEnv,
  resolveDbTarget,
} from "./lib/payload-db-target";

const CONFIRMED = process.env.KXD_CONFIRM_CUSICK_SEPT_REPORT_DRAFTS === "1";
const APPLY = process.env.APPLY === "1";

const DON_EMAIL = "don.cusick@deezco.com";
const REPORT_YEAR = 2026;
const REPORT_MONTH = 9;
const GOOGLE_YEAR = 2026;
const GOOGLE_MONTH = 8;
const PREPARED_BY = "operator@kreatebydesign.com";
const OUT_DIR = join(process.cwd(), ".qa-cusick-sept-reports");

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

type ReportSpec = {
  clientId: number;
  slug: string;
  expectedNameIncludes: string;
  selectedTitles: string[];
  narratives: {
    executiveSummary: string;
    workCompleted: string;
    websitePerformanceNarrative: string;
    organicSearchNarrative: string;
    improvementsMade: string;
    issuesOrRisks: string;
    recommendations: string;
    augustPriorities: string;
    closingNote: string;
    internalNotes: string;
  };
};

function clientIdOf(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (value && typeof value === "object" && "id" in value) {
    const id = Number((value as { id: unknown }).id);
    return Number.isFinite(id) ? id : null;
  }
  return null;
}

async function loadDeliverableByTitle(
  payload: Awaited<ReturnType<typeof getPayload>>,
  clientId: number,
  title: string,
): Promise<AnyDoc | null> {
  const res = await payload.find({
    collection: "monthly-deliverables",
    where: {
      and: [{ client: { equals: clientId } }, { title: { equals: title } }],
    },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  return (res.docs[0] as AnyDoc) ?? null;
}

function workItemFromDeliverable(doc: AnyDoc, clientId: number): CompletedWorkItem {
  const ownerClient = clientIdOf(doc.client);
  if (ownerClient !== clientId) {
    throw new Error(
      `Cross-client work rejected: deliverable #${doc.id} belongs to ${ownerClient}, expected ${clientId}`,
    );
  }
  const status = String(doc.status ?? "");
  const statusNote =
    status === "complete"
      ? "Completed"
      : status === "in-progress"
        ? "In progress"
        : status === "waiting-on-client"
          ? "Waiting on client"
          : status;
  return {
    id: `deliverable-${doc.id}`,
    title: String(doc.title),
    summary: [statusNote, doc.notes ? String(doc.notes) : ""]
      .filter(Boolean)
      .join(" — ")
      .slice(0, 800),
    completedAt:
      status === "complete" && doc.completedDate
        ? String(doc.completedDate).slice(0, 10)
        : null,
    source: "monthly-deliverables",
    clientVisible: true,
    included: true,
  };
}

const SPECS: ReportSpec[] = [
  {
    clientId: 5,
    slug: "cmm",
    expectedNameIncludes: "Morgan",
    selectedTitles: [
      "Search performance monitoring and ongoing SEO optimization",
      "Ongoing website/search health monitoring",
    ],
    narratives: {
      executiveSummary:
        "This September 2026 report for Cusick Morgan Motorsports covers KXD work during September and Google performance for August 2026 — the latest completed Google reporting period. September work centered on active search and website health monitoring. No independently dated September completions were recorded. August Search Console and website analytics show measurable search visibility and site activity; this report does not claim month-over-month growth without a verified comparison period.",
      workCompleted:
        "KXD work — September 2026\n\nIn progress:\n• Search performance monitoring and ongoing SEO optimization\n• Ongoing website/search health monitoring\n\nNo verified dated September completions were recorded. Earlier foundation and reliability work from prior months remains in place and continues to support monitoring; it is not listed here as September completed work.",
      websitePerformanceNarrative:
        "Google performance — August 2026\n\nWebsite analytics for August 1–31, 2026: 496 sessions, 457 visitors, and 409 pageviews. These figures describe August activity only and are not September results. Conversion performance is not claimed in this report.",
      organicSearchNarrative:
        "Google performance — August 2026\n\nSearch Console for August 1–31, 2026: 159 clicks, 2,820 impressions, 5.6% click-through rate, and average position 11.7. Search visibility is measurable. This report does not assert improvement or decline versus prior months without verified comparison data in the report snapshot.",
      improvementsMade:
        "September focus stayed on monitoring and continued optimization rather than a dated completion milestone. August search and site metrics provide a clear baseline for ongoing work.",
      issuesOrRisks:
        "No client action is required from this report. No conversion or lead claims are included because verified conversion records for August were not selected for this monthly summary.",
      recommendations:
        "Continue Search Console–guided optimization and website/search health monitoring. Use August as the baseline period until a later completed Google month is available.",
      augustPriorities:
        "Next up: continue search performance monitoring, act on verified Search Console opportunities, and keep website/search health checks current.",
      closingNote:
        "Thank you for the continued partnership. Questions about this report can go to your Kreate by Design contact.",
      internalNotes:
        "DRAFT ONLY — not approved, not published, not emailed. Report month September 2026; Google metrics August 2026. No September completed deliverables. generate_lead/conversions omitted from branded metrics.",
    },
  },
  {
    clientId: 9,
    slug: "otp",
    expectedNameIncludes: "Track",
    selectedTitles: [
      "Website/search performance monitoring",
      "Search Console/indexing follow-through",
    ],
    narratives: {
      executiveSummary:
        "This September 2026 report for On Track Performance covers KXD work during September and Google performance for August 2026 — the latest completed Google reporting period. September work stayed on website/search monitoring and Search Console/indexing follow-through. No independently dated September completions were recorded, and there is no current waiting-on-client item. Google Search performance is available for August; website analytics activity is not available for that reporting period.",
      workCompleted:
        "KXD work — September 2026\n\nIn progress:\n• Website/search performance monitoring\n• Search Console/indexing follow-through\n\nNo verified September completions. Prior staging/approval history is not carried forward here as a current client action.",
      websitePerformanceNarrative:
        "Google performance — August 2026\n\nWebsite analytics activity is not available for August 2026. A GA4 sync for that period completed without returning rows, so this report does not show zero traffic and does not invent session or visitor counts. Measurement availability will be reassessed when a later completed Google month has verified website analytics facts.",
      organicSearchNarrative:
        "Google performance — August 2026\n\nSearch Console for August 1–31, 2026: 63 clicks, 3,627 impressions, 1.7% click-through rate, and average position 10.2. Organic search performance is available for August even though website analytics activity is not.",
      improvementsMade:
        "September retained focus on search/indexing follow-through and performance monitoring so Search Console visibility stays under active review.",
      issuesOrRisks:
        "Website analytics for August is unavailable rather than zero. No current waiting-on-client dependency is recorded for OTP in this report.",
      recommendations:
        "Keep Search Console and indexing follow-through active. Treat August Search Console as the current Google baseline until website analytics facts exist for a completed month.",
      augustPriorities:
        "Next up: continue website/search performance monitoring and Search Console/indexing follow-through.",
      closingNote:
        "Thank you for the continued partnership. Questions about this report can go to your Kreate by Design contact.",
      internalNotes:
        "DRAFT ONLY — not approved, not published, not emailed. Report month September 2026; Google metrics August 2026. Missing August GA4 shown as unavailable (not zero). No staging/approval resurrected as current action.",
    },
  },
  {
    clientId: 14,
    slug: "otp-carts",
    expectedNameIncludes: "Carts",
    selectedTitles: [
      "Google Business Profile setup (Westlake)",
      "Local search / showroom setup",
      "Google profile ownership / access recovery",
    ],
    narratives: {
      executiveSummary:
        "This September 2026 report for OTP Carts covers KXD work during September and Google performance for August 2026 — the latest completed Google reporting period. The main client dependency is Westlake Google Business Profile verification. Local search/showroom setup and profile ownership/access work continue in parallel. August website and search metrics are included as a completed Google month baseline. GA4 conversion totals are not treated as cart sales, and a multi-month generate_lead fact is omitted so it cannot be misread as an August lead count.",
      workCompleted:
        "KXD work — September 2026\n\nWaiting on client:\n• Westlake Google Business Profile verification — Nicole/client needs to complete Google’s required verification before public local presence can finish.\n\nIn progress:\n• Local search / showroom setup (depends on verified Westlake profile)\n• Google profile ownership/access follow-through tied to that verification path\n\nNo new September completion was recorded. Earlier August launch work remains historical context only and is not restated here as September completed work.",
      websitePerformanceNarrative:
        "Google performance — August 2026\n\nWebsite analytics for August 1–31, 2026: 154 sessions, 83 visitors, and 471 pageviews. An explicit conversions fact for August is 0. These GA4 conversion figures are analytics events, not cart sales, and are not presented as sales performance. A generate_lead fact spanning June 3–August 31, 2026 is intentionally omitted from this August monthly summary to avoid implying a single August lead.",
      organicSearchNarrative:
        "Google performance — August 2026\n\nSearch Console for August 1–31, 2026: 4 clicks, 618 impressions, 0.6% click-through rate, and average position 19.3. Local search work remains constrained until Westlake Google Business Profile verification is finished; that dependency is operational, not a sign the account is unhealthy.",
      improvementsMade:
        "Westlake profile recovery and configuration advanced far enough that the remaining blocker is Google’s required client verification. Local search setup continues once that step is complete.",
      issuesOrRisks:
        "Client action needed: complete Westlake Google Business Profile verification (Nicole/client). Until verification finishes, public Westlake local presence cannot be finalized. This is a normal Google verification dependency, not an account-health failure.",
      recommendations:
        "Complete Westlake Google Business Profile verification when Google prompts for it. After verification, KXD can finish Westlake local-search profile optimization. Continue monitoring August-baseline website and search metrics.",
      augustPriorities:
        "Next up: finish Westlake verification with Nicole/client, then complete Westlake local-search/showroom profile optimization and related ownership/access follow-through.",
      closingNote:
        "Thank you for the continued partnership. Completing the Westlake verification step will unlock the remaining local search work.",
      internalNotes:
        "DRAFT ONLY — not approved, not published, not emailed. Report month September 2026; Google metrics August 2026. generate_lead (2026-06-03..2026-08-31) OMITTED from August monthly metrics. conversions=0 not framed as cart sales. Selected titles must resolve to client 14 deliverables only.",
    },
  },
  {
    clientId: 10,
    slug: "2475-townsgate",
    expectedNameIncludes: "Townsgate",
    selectedTitles: [
      "Google Analytics 4 tracking installation and production verification",
      "Search/analytics monitoring following production measurement setup",
    ],
    narratives: {
      executiveSummary:
        "This September 2026 report for 2475 Townsgate covers KXD work during September and Google performance for August 2026 — the latest completed Google reporting period. On September 28, GA4 tracking was installed and verified in production. August therefore does not contain meaningful GA4 website analytics; Search Console performance for August is available. Website measurement will accumulate following the September 28 installation.",
      workCompleted:
        "KXD work — September 2026\n\nCompleted:\n• Google Analytics 4 tracking installation and production verification (completed September 28, 2026) — Measurement ID G-23KB7JQDML installed on the production site; production deployment verified; GA4 Realtime subsequently showed an active user.\n\nIn progress:\n• Search/analytics monitoring following production measurement setup",
      websitePerformanceNarrative:
        "Google performance — August 2026\n\nWebsite analytics activity is not available for August 2026. GA4 returned no rows for that completed month, which is expected because production GA4 tracking was installed and verified on September 28, 2026. This report does not display missing August GA4 as zero traffic. Meaningful website analytics will accumulate after installation.",
      organicSearchNarrative:
        "Google performance — August 2026\n\nSearch Console for August 1–31, 2026: 4 clicks, 482 impressions, 0.8% click-through rate, and average position 9.1. Search visibility for August is available even though website analytics for August is not.",
      improvementsMade:
        "Production GA4 tracking is installed and verified as of September 28, 2026, so future completed months can include website analytics alongside Search Console.",
      issuesOrRisks:
        "August website analytics is unavailable (not zero) because measurement was installed after that period. No client action is required from this report.",
      recommendations:
        "Monitor newly installed GA4 as post-installation data accumulates, and continue Search Console visibility review using August as the latest completed Google search baseline.",
      augustPriorities:
        "Next up: monitor GA4 after the September 28 install and continue search/analytics monitoring.",
      closingNote:
        "Thank you for the continued partnership. Questions about this report can go to your Kreate by Design contact.",
      internalNotes:
        "DRAFT ONLY — not approved, not published, not emailed. Report month September 2026; Google metrics August 2026. GA4 install completedDate 2026-09-28 represented as September completion. Missing August GA4 = unavailable, not zero.",
    },
  },
];

async function main() {
  loadPayloadEnv();
  const target = resolveDbTarget();
  console.log("\n=== CUSICK SEPT 2026 MONTHLY REPORT DRAFTS ===\n");
  console.log(`DB target: ${formatDbTarget(target)}`);
  console.log(`Mode: ${APPLY ? "APPLY" : "DRY-RUN"}`);

  if (!target.isRemote || target.kind !== "remote-postgres") {
    throw new Error("Refusing against a non-remote Postgres target.");
  }
  if (!CONFIRMED) {
    throw new Error(
      "Set KXD_CONFIRM_CUSICK_SEPT_REPORT_DRAFTS=1 to acknowledge production scope.",
    );
  }

  const payload = await getPayload({ config });
  const googlePeriod = createBrandedReportPeriod({
    year: GOOGLE_YEAR,
    month: GOOGLE_MONTH,
  });

  const results: Array<Record<string, unknown>> = [];
  const isolationErrors: string[] = [];

  for (const spec of SPECS) {
    const client = (await payload.findByID({
      collection: "clients",
      id: spec.clientId,
      depth: 0,
      overrideAccess: true,
    })) as AnyDoc;
    const clientName = String(client.name ?? "");
    if (!clientName.toLowerCase().includes(spec.expectedNameIncludes.toLowerCase())) {
      throw new Error(
        `Client #${spec.clientId} name mismatch: got "${clientName}", expected to include "${spec.expectedNameIncludes}"`,
      );
    }

    const selectedWorkItems: CompletedWorkItem[] = [];
    for (const title of spec.selectedTitles) {
      const del = await loadDeliverableByTitle(payload, spec.clientId, title);
      if (!del) {
        // OTP Carts titles may differ slightly — try fuzzy inventory dump
        isolationErrors.push(
          `MISSING deliverable client=${spec.clientId} title="${title}"`,
        );
        continue;
      }
      selectedWorkItems.push(workItemFromDeliverable(del, spec.clientId));
    }

    // Verify no selected item leaks another client
    for (const item of selectedWorkItems) {
      const delId = Number(String(item.id).replace("deliverable-", ""));
      if (!Number.isFinite(delId)) continue;
      const del = (await payload.findByID({
        collection: "monthly-deliverables",
        id: delId,
        depth: 0,
        overrideAccess: true,
      })) as AnyDoc;
      const owner = clientIdOf(del.client);
      if (owner !== spec.clientId) {
        isolationErrors.push(
          `LEAK deliverable #${delId} owner=${owner} expected=${spec.clientId}`,
        );
      }
    }

    console.log(
      `\n--- ${clientName} (#${spec.clientId}) selected=${selectedWorkItems.length} ---`,
    );
    for (const w of selectedWorkItems) {
      console.log(`  work: ${w.id} | ${w.title} | completedAt=${w.completedAt}`);
    }

    if (!APPLY) {
      results.push({
        clientId: spec.clientId,
        clientName,
        mode: "dry-run",
        selectedWorkItems: selectedWorkItems.map((w) => w.title),
        reportingMonth: REPORT_MONTH,
        reportingYear: REPORT_YEAR,
        googlePeriod: googlePeriod.label,
      });
      continue;
    }

    const generated = await generateBrandedClientReport({
      clientId: spec.clientId,
      year: REPORT_YEAR,
      month: REPORT_MONTH,
      operatorCapabilities: ["base-website", "seo"],
      confirmedBy: PREPARED_BY,
      preparedBy: PREPARED_BY,
    });

    const reportId = Number(generated.report.id);

    // Dual-period: keep reportingMonth=September; load Google facts from August window.
    await payload.update({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "monthly-reports" as any,
      id: reportId,
      data: {
        title: `${clientName} — September 2026`,
        reportingMonth: REPORT_MONTH,
        reportingYear: REPORT_YEAR,
        periodStart: googlePeriod.start,
        periodEnd: googlePeriod.end,
        status: "draft",
        approvalStatus: "draft",
        publishedAt: null,
        dataProvenance: {
          reportMonth: "September 2026",
          googlePerformancePeriod: "August 2026",
          googlePerformanceStart: googlePeriod.start,
          googlePerformanceEnd: googlePeriod.end,
          note: "Report month is September 2026. Google metrics use the latest completed Google month (August 2026). generate_lead multi-month windows are omitted from branded monthly metrics.",
          generateLeadTreatment:
            spec.clientId === 14
              ? "omitted-from-august-monthly-metrics"
              : "not-applicable",
        },
      },
      depth: 0,
      overrideAccess: true,
    });

    const saved = await saveBrandedReportDraft(reportId, spec.clientId, {
      ...spec.narratives,
      selectedWorkItems,
      operatorCapabilities: ["base-website", "seo"],
      confirmedBy: PREPARED_BY,
    });

    const status = String(saved.report.approvalStatus ?? saved.report.status);
    if (status !== "draft") {
      throw new Error(`Report #${reportId} left draft unexpectedly: ${status}`);
    }
    if (saved.report.publishedAt) {
      throw new Error(`Report #${reportId} has publishedAt set — aborting`);
    }

    const html = await getBrandedReportPreviewHtml(reportId, spec.clientId, {
      includeInternalNotes: false,
    });
    mkdirSync(OUT_DIR, { recursive: true });
    const htmlPath = join(OUT_DIR, `${spec.slug}-sept-2026-draft-preview.html`);
    writeFileSync(htmlPath, html, "utf8");

    const metrics = (saved.snapshot.metrics ?? []).map((m) => ({
      key: m.key,
      label: m.label,
      value: m.value,
      displayValue: m.displayValue,
      provenance: m.provenance,
      note: m.note,
    }));

    // Hard fail if generate_lead slipped in
    if (metrics.some((m) => String(m.key).includes("generate_lead"))) {
      throw new Error(`generate_lead appeared in report #${reportId} metrics`);
    }

    results.push({
      clientId: spec.clientId,
      clientName,
      reportId,
      status: saved.report.approvalStatus,
      publishedAt: saved.report.publishedAt ?? null,
      reportingMonth: saved.report.reportingMonth,
      reportingYear: saved.report.reportingYear,
      periodLabel: saved.snapshot.period.label,
      title: saved.report.title,
      selectedWorkItems: selectedWorkItems.map((w) => ({
        id: w.id,
        title: w.title,
        completedAt: w.completedAt,
      })),
      metrics,
      htmlPreview: htmlPath,
      pdf: "skipped — lifecycle requires approved snapshot",
    });

    console.log(
      JSON.stringify(
        {
          reportId,
          status: saved.report.approvalStatus,
          periodLabel: saved.snapshot.period.label,
          metricCount: metrics.length,
          htmlPreview: htmlPath,
        },
        null,
        2,
      ),
    );
  }

  // Don / Billy safety
  const don = (
    await payload.find({
      collection: "portal-users",
      where: { email: { equals: DON_EMAIL } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
  ).docs[0] as AnyDoc | undefined;
  const invite = (
    await payload.find({
      collection: "portal-invitations",
      where: { id: { equals: 3 } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
  ).docs[0] as AnyDoc | undefined;
  const billyUsers = await payload.find({
    collection: "portal-users",
    where: { email: { contains: "billy" } },
    limit: 10,
    depth: 0,
    overrideAccess: true,
  });
  const billyInvites = await payload.find({
    collection: "portal-invitations",
    where: { email: { contains: "billy" } },
    limit: 10,
    depth: 0,
    overrideAccess: true,
  });

  // Confirm all created reports remain draft / unpublished
  const septReports = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "monthly-reports" as any,
    where: {
      and: [
        { client: { in: [5, 9, 14, 10] } },
        { reportingYear: { equals: REPORT_YEAR } },
        { reportingMonth: { equals: REPORT_MONTH } },
      ],
    },
    limit: 20,
    depth: 0,
    overrideAccess: true,
  });

  console.log("\n=== RESULTS ===");
  console.log(JSON.stringify(results, null, 2));
  console.log("\n=== ISOLATION ===");
  console.log(
    isolationErrors.length ? isolationErrors.join("\n") : "no isolation errors",
  );
  console.log("\n=== SEPT REPORTS IN DB ===");
  console.log(
    JSON.stringify(
      (septReports.docs as AnyDoc[]).map((d) => ({
        id: d.id,
        client: clientIdOf(d.client),
        title: d.title,
        status: d.status,
        approvalStatus: d.approvalStatus,
        publishedAt: d.publishedAt ?? null,
        reportingMonth: d.reportingMonth,
        reportingYear: d.reportingYear,
        periodStart: d.periodStart,
        periodEnd: d.periodEnd,
      })),
      null,
      2,
    ),
  );
  console.log(
    "\nDON",
    JSON.stringify({
      id: don?.id ?? null,
      active: don?.active ?? null,
      status: don?.status ?? null,
    }),
  );
  console.log(
    "INVITE#3",
    JSON.stringify({
      id: invite?.id ?? null,
      status: invite?.status ?? null,
      sendCount: invite?.sendCount ?? 0,
      sentAt: invite?.sentAt ?? null,
    }),
  );
  console.log(
    "BILLY",
    JSON.stringify({
      portalUsers: billyUsers.docs.length,
      invitations: billyInvites.docs.length,
      users: (billyUsers.docs as AnyDoc[]).map((u) => ({
        id: u.id,
        email: u.email,
        active: u.active ?? null,
      })),
    }),
  );

  if (isolationErrors.length) {
    throw new Error(`Isolation/selection errors:\n${isolationErrors.join("\n")}`);
  }
  if (!APPLY) {
    console.log("\nDry-run only. Re-run with APPLY=1 to write drafts.");
  }
  console.log("\nDone.\n");
  process.exit(0);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
