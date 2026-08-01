/**
 * Phase 5 Batch 5A — Monthly Work Summary Reliability.
 * Static + pure-unit verification. No database. No Stripe. No external writes.
 *
 * Run: npm run verify:phase5-batch-5a
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  MONTHLY_SUMMARY_DELIVERABLE_EXCLUDED_STATUSES,
  MONTHLY_SUMMARY_DELIVERABLE_INCLUDED_STATUSES,
  MONTHLY_SUMMARY_SCOPE_NOTE,
  MONTHLY_SUMMARY_WEBSITE_REVIEW_EXCLUDED_STATUSES,
  MONTHLY_SUMMARY_WEBSITE_REVIEW_INCLUDED_STATUSES,
  composeWorkPerformanceModel,
  comparisonPeriodFor,
  defaultWorkPerformancePeriod,
  isIsoDateInPeriod,
  mapDeliverableToMonthlySummaryItem,
  mapWebsiteReviewToMonthlySummaryItem,
  normalizeCompletionDay,
  projectMonthlySummaryForPeriod,
} from "../lib/portal/work-performance";
import { createMonthPeriod } from "../lib/reporting/domain/period";

const root = process.cwd();

function read(rel: string) {
  return readFileSync(path.join(root, rel), "utf8");
}

function check(label: string, pass: boolean, detail?: string) {
  console.log(pass ? `  ✔ ${label}` : `  ✘ ${label}${detail ? ` — ${detail}` : ""}`);
  assert.ok(pass, detail ? `${label}: ${detail}` : label);
}

function main() {
  console.log("\nPhase 5 Batch 5A — Monthly Work Summary Reliability\n");

  const june = createMonthPeriod(2026, 6);
  const july = createMonthPeriod(2026, 7);
  const defaultPeriod = defaultWorkPerformancePeriod(
    new Date("2026-07-15T12:00:00.000Z"),
  );
  check(
    "default reporting period remains previous UTC month",
    defaultPeriod.start.startsWith("2026-06-01") && defaultPeriod.label === "June 2026",
  );

  // 1. Deliverable uses completedDate
  const mapped = mapDeliverableToMonthlySummaryItem({
    id: 11,
    title: "Homepage refresh",
    status: "complete",
    completedDate: "2026-06-12",
    updatedAt: "2026-07-20T00:00:00.000Z",
    category: "website",
  });
  check("deliverable maps from completedDate", mapped?.completedAt === "2026-06-12");
  check(
    "updatedAt cannot move completed work into another month",
    projectMonthlySummaryForPeriod(mapped ? [mapped] : [], june).length === 1 &&
      projectMonthlySummaryForPeriod(mapped ? [mapped] : [], july).length === 0,
  );

  // 3. Missing completion date is not fabricated
  const missingDate = mapDeliverableToMonthlySummaryItem({
    id: 12,
    title: "Missing date deliverable",
    status: "complete",
    completedDate: null,
    updatedAt: "2026-06-15T00:00:00.000Z",
  });
  check("missing completedDate yields no summary item", missingDate === null);

  const onlyUpdatedAtCompose = composeWorkPerformanceModel({
    authorizedClientId: 1,
    clientName: "Acme",
    clientSlug: "acme",
    sourceClientId: 1,
    reportingPeriod: june,
    comparisonPeriod: comparisonPeriodFor(june),
    completedItems: [
      {
        id: "stale",
        title: "Should not appear",
        completedAt: null,
        updatedAt: "2026-06-10T00:00:00.000Z",
        categoryLabel: null,
        href: "/portal/deliverables",
        source: "deliverable",
      },
    ],
    activeItems: [],
    updateRequests: {
      entitled: true,
      openCount: 0,
      awaitingClientCount: 0,
      inProgressCount: 0,
      completedThisMonthCount: 0,
      priority: [],
    },
    reportingFacts: [],
    reportingEntitled: false,
    nextMoveCandidates: [],
  });
  check(
    "compose never buckets by updatedAt alone",
    onlyUpdatedAtCompose.completedThisMonth.length === 0,
  );

  // 4. Draft / incomplete deliverables excluded
  for (const status of MONTHLY_SUMMARY_DELIVERABLE_EXCLUDED_STATUSES) {
    const item = mapDeliverableToMonthlySummaryItem({
      id: status,
      title: "Active item",
      status,
      completedDate: "2026-06-01",
    });
    check(`deliverable status ${status} excluded`, item === null);
  }
  check(
    "included deliverable statuses are complete-only",
    MONTHLY_SUMMARY_DELIVERABLE_INCLUDED_STATUSES.join(",") === "complete",
  );

  // Placeholder / admin / internal-noise
  check(
    "placeholder deliverable excluded",
    mapDeliverableToMonthlySummaryItem({
      id: 99,
      title: "Monthly Deliverable",
      status: "complete",
      completedDate: "2026-06-01",
    }) === null,
  );
  check(
    "admin-category deliverable excluded",
    mapDeliverableToMonthlySummaryItem({
      id: 98,
      title: "Internal ops task",
      status: "complete",
      completedDate: "2026-06-01",
      category: "admin",
    }) === null,
  );

  // 6–7. Website Review statuses
  check(
    "Website Review included status is completed only",
    MONTHLY_SUMMARY_WEBSITE_REVIEW_INCLUDED_STATUSES.join(",") === "completed",
  );
  check(
    "Website Review closed (declined) is excluded",
    MONTHLY_SUMMARY_WEBSITE_REVIEW_EXCLUDED_STATUSES.includes("closed"),
  );

  const reviewOk = mapWebsiteReviewToMonthlySummaryItem({
    id: "41",
    title: "Hero revision",
    status: "completed",
    completedAt: "2026-06-18",
    updatedAt: "2026-07-01T00:00:00.000Z",
  });
  check("approved Website Review completed included", reviewOk?.completedAt === "2026-06-18");

  const reviewClosed = mapWebsiteReviewToMonthlySummaryItem({
    id: "42",
    title: "Declined revision",
    status: "closed",
    completedAt: "2026-06-18",
    updatedAt: "2026-06-18T00:00:00.000Z",
  });
  check("closed Website Review excluded from summary", reviewClosed === null);

  for (const status of [
    "review-received",
    "in-review",
    "revision-in-progress",
    "awaiting-your-input",
  ] as const) {
    check(
      `Website Review ${status} excluded`,
      mapWebsiteReviewToMonthlySummaryItem({
        id: status,
        title: "Open",
        status,
        completedAt: "2026-06-01",
        updatedAt: "2026-06-01T00:00:00.000Z",
      }) === null,
    );
  }

  check(
    "Website Review without completion date excluded",
    mapWebsiteReviewToMonthlySummaryItem({
      id: "43",
      title: "Complete without date",
      status: "completed",
      completedAt: null,
      updatedAt: "2026-06-18T00:00:00.000Z",
    }) === null,
  );

  // 8. Cross-client isolation at compose layer
  let mismatch = false;
  try {
    composeWorkPerformanceModel({
      authorizedClientId: 1,
      clientName: "A",
      clientSlug: "a",
      sourceClientId: 2,
      reportingPeriod: june,
      comparisonPeriod: null,
      completedItems: [],
      activeItems: [],
      updateRequests: {
        entitled: false,
        openCount: 0,
        awaitingClientCount: 0,
        inProgressCount: 0,
        completedThisMonthCount: 0,
        priority: [],
      },
      reportingFacts: [],
      reportingEntitled: false,
      nextMoveCandidates: [],
    });
  } catch {
    mismatch = true;
  }
  check("cross-client source mismatch fails closed", mismatch);

  // 9–10. Month boundaries + invalid dates
  check("first day of month included", isIsoDateInPeriod("2026-06-01", june));
  check("last day of month included", isIsoDateInPeriod("2026-06-30", june));
  check("next month excluded", !isIsoDateInPeriod("2026-07-01", june));
  check("prior year December excluded from June", !isIsoDateInPeriod("2025-12-31", june));
  check("invalid date normalize fails safely", normalizeCompletionDay("2026-13-40") === null);
  check("empty date normalize fails safely", normalizeCompletionDay("") === null);
  check("garbage date normalize fails safely", normalizeCompletionDay("not-a-date") === null);

  const yearBoundary = mapDeliverableToMonthlySummaryItem({
    id: 50,
    title: "Year edge",
    status: "complete",
    completedDate: "2025-12-31",
    updatedAt: "2026-01-02T00:00:00.000Z",
  });
  const dec2025 = createMonthPeriod(2025, 12);
  const jan2026 = createMonthPeriod(2026, 1);
  check(
    "year transition uses completion day not edit day",
    projectMonthlySummaryForPeriod(yearBoundary ? [yearBoundary] : [], dec2025).length === 1 &&
      projectMonthlySummaryForPeriod(yearBoundary ? [yearBoundary] : [], jan2026).length === 0,
  );

  // 11. Dedup
  const dupA = mapDeliverableToMonthlySummaryItem({
    id: 7,
    title: "Same",
    status: "complete",
    completedDate: "2026-06-05",
  });
  const dupB = mapDeliverableToMonthlySummaryItem({
    id: 7,
    title: "Same",
    status: "complete",
    completedDate: "2026-06-05",
  });
  const deduped = projectMonthlySummaryForPeriod(
    [...(dupA ? [dupA] : []), ...(dupB ? [dupB] : [])],
    june,
  );
  check("duplicate summary items collapsed", deduped.length === 1);

  // 12–13. Valid rendering + honest language
  const ready = composeWorkPerformanceModel({
    authorizedClientId: 7,
    clientName: "Demo",
    clientSlug: "demo",
    sourceClientId: 7,
    reportingPeriod: june,
    comparisonPeriod: comparisonPeriodFor(june),
    completedItems: [
      {
        id: "d1",
        title: "June deliverable",
        completedAt: "2026-06-12",
        updatedAt: "2026-07-01T00:00:00.000Z",
        categoryLabel: "website",
        href: "/portal/deliverables",
        source: "deliverable",
      },
      {
        id: "r1",
        title: "June review",
        completedAt: "2026-06-20",
        updatedAt: "2026-06-21T00:00:00.000Z",
        categoryLabel: "Website Review",
        href: "/portal/website-review",
        source: "website-review",
      },
    ],
    activeItems: [],
    updateRequests: {
      entitled: true,
      openCount: 0,
      awaitingClientCount: 0,
      inProgressCount: 0,
      completedThisMonthCount: 2,
      priority: [],
      primaryActionHref: "/portal/website-review",
    },
    reportingFacts: [],
    reportingEntitled: false,
    nextMoveCandidates: [],
  });
  check("valid completed work still renders", ready.completedThisMonth.length === 2);
  check(
    "stable ordering by completion day",
    ready.completedThisMonth[0]?.title === "June deliverable" &&
      ready.completedThisMonth[1]?.title === "June review",
  );
  check(
    "honest scope note present",
    ready.monthlySummaryScopeNote.includes("not a complete work ledger") &&
      ready.monthlySummaryScopeNote === MONTHLY_SUMMARY_SCOPE_NOTE,
  );
  check(
    "empty state denies ledger claim",
    onlyUpdatedAtCompose.emptyStates.completed.lead.includes("not a complete work ledger") ||
      onlyUpdatedAtCompose.emptyStates.completed.lead.includes(MONTHLY_SUMMARY_SCOPE_NOTE) ||
      onlyUpdatedAtCompose.monthlySummaryScopeNote.includes("not a complete work ledger"),
  );
  check(
    "value summary does not claim invoice breakdown",
    !ready.valueSummary.lead.toLowerCase().includes("invoice line") &&
      ready.valueSummary.lead.includes("not an invoice breakdown"),
  );

  // 14. Account switching / active client — server entry static checks
  const serverSrc = read("lib/portal/work-performance/server.ts");
  check(
    "server resolves from session.clientId only",
    serverSrc.includes("session.clientId") &&
      serverSrc.includes("experience profile client does not match session client"),
  );
  check(
    "server maps deliverables via completedDate helper",
    serverSrc.includes("mapDeliverableToMonthlySummaryItem") &&
      !serverSrc.includes("doc.completedAt"),
  );
  check(
    "server does not fall back completedAt ?? updatedAt for monthly summary",
    !serverSrc.includes("completedAt ??") && !serverSrc.includes("r.completedAt ?? r.updatedAt"),
  );

  const reviewData = read("lib/ces/modules/website-review/data.ts");
  check(
    "Website Review completedAt uses completedDate only",
    reviewData.includes("Schema-backed completion only") &&
      reviewData.includes("doc.completedDate") &&
      !reviewData.includes('status === "completed" || status === "closed"'),
  );

  const ui = read("components/portal/WorkPerformanceWorkspace.tsx");
  check(
    "UI shows monthly summary scope note",
    ui.includes("monthlySummaryScopeNote"),
  );
  check(
    "UI does not display updatedAt as completion date",
    !ui.includes("item.completedAt ?? item.updatedAt") &&
      !ui.includes("completedAt ?? item.updatedAt"),
  );

  const monthlyPolicy = read("lib/portal/work-performance/monthly-summary.ts");
  check(
    "Batch 5A monthly summary remains independent of Billing/Stripe",
    !monthlyPolicy.toLowerCase().includes("stripe") &&
      !monthlyPolicy.includes("loadPortalBillingForSession") &&
      !ui.includes("loadPortalBillingForSession"),
  );
  check(
    "Batch 5A policy has no Stripe imports",
    !monthlyPolicy.toLowerCase().includes("stripe"),
  );
  check(
    "package.json registers Batch 5A verifier",
    read("package.json").includes("verify:phase5-batch-5a"),
  );

  console.log("\nPhase 5 Batch 5A verification passed.\n");
}

main();
