/**
 * Cusick September 2026 report final polish + preview QA.
 *
 * Updates EXISTING drafts #5/#6/#7/#8 only. Does not create duplicates,
 * approve, publish, email, activate Don, or provision Billy.
 *
 * Usage:
 *   KXD_CONFIRM_CUSICK_SEPT_REPORT_POLISH=1 APPLY=1 \
 *     KXD_SERVER_ONLY_SHIM=1 node --import ./scripts/shims/register-server-only.mjs --import tsx \
 *     scripts/batch-cusick-sept-2026-report-polish.ts
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { getPayload } from "payload";
import config from "@payload-config";
import {
  getBrandedReportPreviewHtml,
  saveBrandedReportDraft,
} from "../lib/reporting/branded-client/lifecycle";
import type { CompletedWorkItem } from "../lib/reporting/branded-client/types";
import { toClientFacingWorkItem } from "../lib/reporting/branded-client/work-summary";
import {
  formatDbTarget,
  loadPayloadEnv,
  resolveDbTarget,
} from "./lib/payload-db-target";

const CONFIRMED = process.env.KXD_CONFIRM_CUSICK_SEPT_REPORT_POLISH === "1";
const APPLY = process.env.APPLY === "1";
const DON_EMAIL = "don.cusick@deezco.com";
const OUT_DIR = join(process.cwd(), ".qa-cusick-sept-reports");
const PREPARED_BY = "operator@kreatebydesign.com";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

type PolishSpec = {
  reportId: number;
  clientId: number;
  slug: string;
  expectedNameIncludes: string;
  missingWebsiteAnalyticsNote: string | null;
  workItems: CompletedWorkItem[];
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

const SPECS: PolishSpec[] = [
  {
    reportId: 5,
    clientId: 5,
    slug: "cmm",
    expectedNameIncludes: "Morgan",
    missingWebsiteAnalyticsNote: null,
    workItems: [
      {
        id: "deliverable-17",
        title: "Search performance monitoring and ongoing SEO optimization",
        summary: "Active Search Console review and continued optimization based on verified search opportunities.",
        completedAt: null,
        source: "monthly-deliverables",
        clientVisible: true,
        included: true,
        status: "in-progress",
      },
      {
        id: "deliverable-18",
        title: "Ongoing website/search health monitoring",
        summary: "Continued website and search health checks through September.",
        completedAt: null,
        source: "monthly-deliverables",
        clientVisible: true,
        included: true,
        status: "in-progress",
      },
    ],
    narratives: {
      executiveSummary:
        "This September 2026 report covers KXD work during September and Google performance for August 2026 — the latest completed Google reporting period. September focused on active search and website health monitoring. No independently dated September completions were recorded. August shows measurable search visibility and site activity; this report does not claim month-over-month growth without a verified comparison.",
      workCompleted:
        "KXD work — September 2026\n\nIn progress:\n• Search performance monitoring and ongoing SEO optimization\n• Ongoing website/search health monitoring\n\nNo verified dated September completions were recorded.",
      websitePerformanceNarrative:
        "Google performance — August 2026\n\nWebsite analytics for August 1–31: 496 sessions, 457 visitors, and 409 pageviews. These describe August activity only. Conversion performance is not claimed in this report.",
      organicSearchNarrative:
        "Google performance — August 2026\n\nSearch Console for August 1–31: 159 clicks, 2,820 impressions, 5.6% click-through rate, and average position 11.7. Search visibility is measurable. No improvement or decline versus prior months is asserted without verified comparison data.",
      improvementsMade:
        "September stayed on monitoring and continued optimization, with August search and site metrics as the current baseline.",
      issuesOrRisks: "No client action is required from this report.",
      recommendations:
        "Continue Search Console–guided optimization and website/search health monitoring using August as the baseline until the next completed Google month is available.",
      augustPriorities:
        "Continue search performance monitoring and act on verified Search Console opportunities.",
      closingNote:
        "Thank you for the continued partnership. Questions about this report can go to your Kreate by Design contact.",
      internalNotes:
        "DRAFT ONLY — not approved/published. Report month September 2026; Google metrics August 2026. No Sept completions. generate_lead/conversions omitted from branded metrics.",
    },
  },
  {
    reportId: 6,
    clientId: 9,
    slug: "otp",
    expectedNameIncludes: "Track",
    missingWebsiteAnalyticsNote:
      "Not available for August. Google Search performance is still available.",
    workItems: [
      {
        id: "deliverable-23",
        title: "Website/search performance monitoring",
        summary: "Continued monitoring of website and search performance through September.",
        completedAt: null,
        source: "monthly-deliverables",
        clientVisible: true,
        included: true,
        status: "in-progress",
      },
      {
        id: "deliverable-24",
        title: "Search Console/indexing follow-through",
        summary: "Ongoing Search Console and indexing follow-through from prior foundation work.",
        completedAt: null,
        source: "monthly-deliverables",
        clientVisible: true,
        included: true,
        status: "in-progress",
      },
    ],
    narratives: {
      executiveSummary:
        "This September 2026 report covers KXD work during September and Google performance for August 2026 — the latest completed Google reporting period. September work stayed on website/search monitoring and Search Console/indexing follow-through. No independently dated September completions were recorded, and nothing is currently waiting on you. Google Search performance is available for August; website analytics are not available for that period.",
      workCompleted:
        "KXD work — September 2026\n\nIn progress:\n• Website/search performance monitoring\n• Search Console/indexing follow-through\n\nNo verified September completions.",
      websitePerformanceNarrative:
        "Google performance — August 2026\n\nWebsite analytics are not available for August. This does not mean zero traffic, and it does not indicate a broken Google connection. Google Search performance for August is still included below.",
      organicSearchNarrative:
        "Google performance — August 2026\n\nSearch Console for August 1–31: 63 clicks, 3,627 impressions, 1.7% click-through rate, and average position 10.2.",
      improvementsMade:
        "September retained focus on search/indexing follow-through so Search Console visibility stays under active review.",
      issuesOrRisks:
        "Website analytics for August are unavailable rather than zero. No current client action is required.",
      recommendations:
        "Keep Search Console and indexing follow-through active. Treat August Search Console as the current Google baseline until website analytics exist for a completed month.",
      augustPriorities:
        "Continue website/search performance monitoring and Search Console/indexing follow-through.",
      closingNote:
        "Thank you for the continued partnership. Questions about this report can go to your Kreate by Design contact.",
      internalNotes:
        "DRAFT ONLY — not approved/published. Missing August GA4 shown as unavailable (not zero). No staging/approval resurrected as current action.",
    },
  },
  {
    reportId: 7,
    clientId: 14,
    slug: "otp-carts",
    expectedNameIncludes: "Carts",
    missingWebsiteAnalyticsNote: null,
    workItems: [
      {
        id: "deliverable-7",
        title: "Westlake Google Business Profile verification",
        summary:
          "Nicole/client needs to complete Google’s required verification for the Westlake profile before public local presence can finish.",
        completedAt: null,
        source: "monthly-deliverables",
        clientVisible: true,
        included: true,
        status: "waiting-on-client",
      },
      {
        id: "deliverable-8",
        title: "Local search / showroom setup",
        summary:
          "Westlake local search and showroom setup continues once the Google Business Profile is verified.",
        completedAt: null,
        source: "monthly-deliverables",
        clientVisible: true,
        included: true,
        status: "in-progress",
      },
      {
        id: "deliverable-9",
        title: "Google profile ownership / access work",
        summary:
          "Ownership and access follow-through for the Westlake profile remains in progress alongside verification.",
        completedAt: null,
        source: "monthly-deliverables",
        clientVisible: true,
        included: true,
        status: "in-progress",
      },
    ],
    narratives: {
      executiveSummary:
        "This September 2026 report covers KXD work during September and Google performance for August 2026 — the latest completed Google reporting period. The main item waiting on you is Westlake Google Business Profile verification. Local search/showroom setup and profile ownership/access work continue in parallel. August website and search metrics are included as the completed Google-month baseline. Analytics conversion totals are not treated as cart sales.",
      workCompleted:
        "KXD work — September 2026\n\nWaiting on you:\n• Westlake Google Business Profile verification — Nicole/client needs to complete Google’s required verification for the Westlake profile.\n\nIn progress:\n• Local search / showroom setup\n• Google profile ownership / access work\n\nNo new September completion was recorded.",
      websitePerformanceNarrative:
        "Google performance — August 2026\n\nWebsite analytics for August 1–31: 154 sessions, 83 visitors, and 471 pageviews. GA4 conversion figures are analytics events, not cart sales, and are not presented as sales performance.",
      organicSearchNarrative:
        "Google performance — August 2026\n\nSearch Console for August 1–31: 4 clicks, 618 impressions, 0.6% click-through rate, and average position 19.3. Local search work remains constrained until Westlake verification is finished — an operational dependency, not a sign the account is unhealthy.",
      improvementsMade:
        "Westlake profile recovery and configuration advanced far enough that the remaining blocker is Google’s required client verification.",
      issuesOrRisks:
        "Waiting on you: complete Westlake Google Business Profile verification when Google prompts for it. Until then, public Westlake local presence cannot be finalized.",
      recommendations:
        "Complete Westlake Google Business Profile verification. After verification, KXD can finish Westlake local-search profile optimization.",
      augustPriorities:
        "Finish Westlake verification, then complete Westlake local-search/showroom profile optimization and related ownership/access follow-through.",
      closingNote:
        "Thank you for the continued partnership. Completing the Westlake verification step will unlock the remaining local search work.",
      internalNotes:
        "DRAFT ONLY — not approved/published. generate_lead (2026-06-03..2026-08-31) OMITTED. Work summaries sanitized — no raw deliverable notes.",
    },
  },
  {
    reportId: 8,
    clientId: 10,
    slug: "2475-townsgate",
    expectedNameIncludes: "Townsgate",
    missingWebsiteAnalyticsNote:
      "Tracking began September 28. August website analytics are therefore not available. Measurement will accumulate going forward.",
    workItems: [
      {
        id: "deliverable-31",
        title: "Google Analytics 4 tracking installation and production verification",
        summary:
          "GA4 Measurement ID G-23KB7JQDML installed on the production website and verified in production.",
        completedAt: "2026-09-28",
        source: "monthly-deliverables",
        clientVisible: true,
        included: true,
        status: "complete",
      },
      {
        id: "deliverable-32",
        title: "Search/analytics monitoring following production measurement setup",
        summary:
          "Monitoring newly installed GA4 and continuing Search Console visibility review.",
        completedAt: null,
        source: "monthly-deliverables",
        clientVisible: true,
        included: true,
        status: "in-progress",
      },
    ],
    narratives: {
      executiveSummary:
        "This September 2026 report covers KXD work during September and Google performance for August 2026 — the latest completed Google reporting period. On September 28, GA4 tracking was installed and verified in production. August therefore does not contain meaningful website analytics; Search Console performance for August is available. Website measurement will accumulate following installation.",
      workCompleted:
        "KXD work — September 2026\n\nCompleted:\n• Google Analytics 4 tracking installation and production verification (September 28, 2026)\n\nIn progress:\n• Search/analytics monitoring following production measurement setup",
      websitePerformanceNarrative:
        "Google performance — August 2026\n\nWebsite analytics are not available for August because production tracking was installed and verified on September 28. This does not mean zero traffic. Meaningful website analytics will accumulate after installation.",
      organicSearchNarrative:
        "Google performance — August 2026\n\nSearch Console for August 1–31: 4 clicks, 482 impressions, 0.8% click-through rate, and average position 9.1.",
      improvementsMade:
        "Production GA4 tracking is installed and verified as of September 28, so future completed months can include website analytics alongside Search Console.",
      issuesOrRisks:
        "August website analytics are unavailable (not zero) because measurement was installed after that period. No client action is required.",
      recommendations:
        "Monitor newly installed GA4 as post-installation data accumulates, and continue Search Console visibility review using August as the latest completed Google search baseline.",
      augustPriorities:
        "Monitor GA4 after the September 28 install and continue search/analytics monitoring.",
      closingNote:
        "Thank you for the continued partnership. Questions about this report can go to your Kreate by Design contact.",
      internalNotes:
        "DRAFT ONLY — not approved/published. GA4 install completedDate 2026-09-28. Missing August GA4 = unavailable, not zero.",
    },
  },
];

function clientIdOf(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (value && typeof value === "object" && "id" in value) {
    const id = Number((value as { id: unknown }).id);
    return Number.isFinite(id) ? id : null;
  }
  return null;
}

async function main() {
  loadPayloadEnv();
  const target = resolveDbTarget();
  console.log("\n=== CUSICK SEPT 2026 REPORT POLISH ===\n");
  console.log(`DB target: ${formatDbTarget(target)}`);
  console.log(`Mode: ${APPLY ? "APPLY" : "DRY-RUN"}`);

  if (!target.isRemote || target.kind !== "remote-postgres") {
    throw new Error("Refusing against a non-remote Postgres target.");
  }
  if (!CONFIRMED) {
    throw new Error("Set KXD_CONFIRM_CUSICK_SEPT_REPORT_POLISH=1 to acknowledge production scope.");
  }

  const payload = await getPayload({ config });
  const results: Array<Record<string, unknown>> = [];
  mkdirSync(OUT_DIR, { recursive: true });

  for (const spec of SPECS) {
    const existing = (await payload.findByID({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "monthly-reports" as any,
      id: spec.reportId,
      depth: 1,
      overrideAccess: true,
    })) as AnyDoc;

    const owner = clientIdOf(existing.client);
    if (owner !== spec.clientId) {
      throw new Error(
        `Report #${spec.reportId} client mismatch: got ${owner}, expected ${spec.clientId}`,
      );
    }
    if (String(existing.approvalStatus) !== "draft") {
      throw new Error(`Report #${spec.reportId} is not draft (${existing.approvalStatus})`);
    }
    if (existing.publishedAt) {
      throw new Error(`Report #${spec.reportId} has publishedAt — aborting`);
    }
    if (Number(existing.reportingMonth) !== 9 || Number(existing.reportingYear) !== 2026) {
      throw new Error(`Report #${spec.reportId} is not September 2026`);
    }

    const clientName = String(
      (existing.client && typeof existing.client === "object"
        ? existing.client.name
        : null) ??
        (
          await payload.findByID({
            collection: "clients",
            id: spec.clientId,
            depth: 0,
            overrideAccess: true,
          })
        ).name,
    );
    if (!clientName.toLowerCase().includes(spec.expectedNameIncludes.toLowerCase())) {
      throw new Error(`Client name mismatch for report #${spec.reportId}: ${clientName}`);
    }

    const selectedWorkItems = spec.workItems.map(toClientFacingWorkItem);
    // Hard fail if sanitization left internal language
    for (const item of selectedWorkItems) {
      const blob = `${item.title} ${item.summary}`.toLowerCase();
      for (const leak of [
        "deliverable",
        "support case",
        "operator",
        "do not",
        "not asserted",
        "historical status",
        "monthly-deliverables",
      ]) {
        if (blob.includes(leak)) {
          throw new Error(`Internal language remained in work item ${item.id}: ${leak}`);
        }
      }
    }

    console.log(`\n--- Report #${spec.reportId} ${clientName} ---`);
    for (const w of selectedWorkItems) {
      console.log(`  ${w.status}: ${w.title} — ${w.summary}`);
    }

    if (!APPLY) {
      results.push({
        reportId: spec.reportId,
        clientId: spec.clientId,
        mode: "dry-run",
        selectedWorkItems,
      });
      continue;
    }

    // Preserve August Google period bounds; refresh provenance for dual-period presentation.
    await payload.update({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "monthly-reports" as any,
      id: spec.reportId,
      data: {
        title: `${clientName} — September 2026`,
        status: "draft",
        approvalStatus: "draft",
        publishedAt: null,
        reportingMonth: 9,
        reportingYear: 2026,
        periodStart: existing.periodStart,
        periodEnd: existing.periodEnd,
        dataProvenance: {
          ...(existing.dataProvenance && typeof existing.dataProvenance === "object"
            ? existing.dataProvenance
            : {}),
          reportMonth: "September 2026",
          googlePerformancePeriod: "August 2026",
          googlePerformanceStart: existing.periodStart,
          googlePerformanceEnd: existing.periodEnd,
          missingWebsiteAnalyticsNote: spec.missingWebsiteAnalyticsNote,
          note: "Report month is September 2026. Google metrics use the latest completed Google month (August 2026).",
          generateLeadTreatment:
            spec.clientId === 14
              ? "omitted-from-august-monthly-metrics"
              : "not-applicable",
        },
      },
      depth: 0,
      overrideAccess: true,
    });

    const saved = await saveBrandedReportDraft(spec.reportId, spec.clientId, {
      ...spec.narratives,
      selectedWorkItems,
      operatorCapabilities: ["base-website", "seo"],
      confirmedBy: PREPARED_BY,
    });

    if (String(saved.report.approvalStatus) !== "draft") {
      throw new Error(`Report #${spec.reportId} left draft`);
    }
    if (saved.report.publishedAt) {
      throw new Error(`Report #${spec.reportId} published unexpectedly`);
    }

    const html = await getBrandedReportPreviewHtml(spec.reportId, spec.clientId, {
      includeInternalNotes: false,
    });
    const htmlPath = join(OUT_DIR, `${spec.slug}-sept-2026-draft-preview.html`);
    writeFileSync(htmlPath, html, "utf8");

    // QA assertions on rendered HTML
    const checks: string[] = [];
    if (!html.includes("September 2026")) checks.push("missing September 2026 cover identity");
    if (!html.includes("Monthly Report")) checks.push("missing Monthly Report subtitle");
    if (!html.includes("Google performance — August 2026") && !html.includes("August 2026")) {
      checks.push("missing August Google period presentation");
    }
    if (/Configured; last successful sync/i.test(html)) {
      checks.push("sync jargon still present");
    }
    if (/support case|do not describe|not asserted|monthly-deliverables/i.test(html)) {
      checks.push("internal language still present");
    }
    if (spec.clientId === 14 && /generate_lead/i.test(html) && !/omitted/i.test(html)) {
      // narrative may mention omission — that's ok; metric tiles must not show generate_lead
      const metricBlock = html.match(/class="metrics"[\s\S]*?<\/div>\s*<\/section>/)?.[0] ?? "";
      if (/generate_lead/i.test(metricBlock)) checks.push("generate_lead in metrics");
    }
    if (checks.length) {
      throw new Error(`Preview QA failed for #${spec.reportId}: ${checks.join("; ")}`);
    }

    results.push({
      reportId: spec.reportId,
      clientId: spec.clientId,
      clientName,
      status: saved.report.approvalStatus,
      publishedAt: saved.report.publishedAt ?? null,
      coverTitle: saved.snapshot.presentation?.coverTitle,
      coverSubtitle: saved.snapshot.presentation?.coverSubtitle,
      reportMonthLabel: saved.snapshot.presentation?.reportMonthLabel,
      googlePerformancePeriodLabel:
        saved.snapshot.presentation?.googlePerformancePeriodLabel,
      performanceLead: saved.snapshot.presentation?.performanceSnapshotLead,
      workItems: selectedWorkItems,
      missingGa4: saved.snapshot.metrics
        .filter((m) => m.key.startsWith("ga4.") && m.value == null)
        .map((m) => ({ label: m.label, displayValue: m.displayValue, note: m.note })),
      htmlPreview: htmlPath,
    });
  }

  // Optional local screenshots — Playwright is a local QA dependency, not production.
  if (APPLY) {
    try {
      // Avoid a static import so production typecheck does not require Playwright.
      const playwright = (await Function(
        'return import("playwright")',
      )()) as { chromium: { launch: (opts: { headless: boolean }) => Promise<{
        newPage: (opts: { viewport: { width: number; height: number } }) => Promise<{
          goto: (url: string, opts: { waitUntil: string }) => Promise<unknown>;
          screenshot: (opts: Record<string, unknown>) => Promise<unknown>;
          setViewportSize: (size: { width: number; height: number }) => Promise<unknown>;
        }>;
        close: () => Promise<unknown>;
      }> } };
      const browser = await playwright.chromium.launch({ headless: true });
      const page = await browser.newPage({ viewport: { width: 1440, height: 1600 } });
      for (const spec of SPECS) {
        const htmlPath = join(OUT_DIR, `${spec.slug}-sept-2026-draft-preview.html`);
        await page.goto(`file://${htmlPath}`, { waitUntil: "networkidle" });
        await page.screenshot({
          path: join(OUT_DIR, `${spec.slug}-cover-1440.png`),
          clip: { x: 0, y: 0, width: 1440, height: 900 },
        });
        await page.screenshot({
          path: join(OUT_DIR, `${spec.slug}-full-1440.png`),
          fullPage: true,
        });
      }
      await page.setViewportSize({ width: 390, height: 844 });
      for (const spec of SPECS) {
        const htmlPath = join(OUT_DIR, `${spec.slug}-sept-2026-draft-preview.html`);
        await page.goto(`file://${htmlPath}`, { waitUntil: "networkidle" });
        await page.screenshot({
          path: join(OUT_DIR, `${spec.slug}-cover-390.png`),
          clip: { x: 0, y: 0, width: 390, height: 700 },
        });
      }
      await browser.close();
    } catch {
      console.log("· Playwright not available — HTML previews written; screenshots skipped.");
    }
  }

  // Ensure no duplicate Sept reports
  const sept = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "monthly-reports" as any,
    where: {
      and: [
        { client: { in: [5, 9, 14, 10] } },
        { reportingYear: { equals: 2026 } },
        { reportingMonth: { equals: 9 } },
      ],
    },
    limit: 20,
    depth: 0,
    overrideAccess: true,
  });
  if (sept.docs.length !== 4) {
    throw new Error(`Expected exactly 4 Sept reports, found ${sept.docs.length}`);
  }
  const ids = (sept.docs as AnyDoc[]).map((d) => Number(d.id)).sort((a, b) => a - b);
  if (ids.join(",") !== "5,6,7,8") {
    throw new Error(`Unexpected Sept report IDs: ${ids.join(",")}`);
  }

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

  console.log("\n=== RESULTS ===");
  console.log(JSON.stringify(results, null, 2));
  console.log(
    "\nDON",
    JSON.stringify({ id: don?.id, active: don?.active ?? null }),
  );
  console.log(
    "INVITE#3",
    JSON.stringify({
      id: invite?.id,
      status: invite?.status,
      sendCount: invite?.sendCount ?? 0,
      sentAt: invite?.sentAt ?? null,
    }),
  );
  console.log("BILLY users", billyUsers.docs.length);
  console.log("SEPT REPORT IDS", ids);

  if (!APPLY) console.log("\nDry-run only. Re-run with APPLY=1 to write.");
  console.log("\nDone.\n");
  process.exit(0);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
