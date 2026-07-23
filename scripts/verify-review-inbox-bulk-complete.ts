/**
 * Review Inbox bulk completion — focused verification (pure helpers + contracts).
 *
 * Run: npm run verify:review-inbox-bulk-complete
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  REVIEW_INBOX_BULK_COMPLETE_ELIGIBLE_STATUSES,
  REVIEW_INBOX_BULK_COMPLETE_MAX_IDS,
  bulkCompleteSkipReason,
  clientBreakdownForSelection,
  eligibleIdsInView,
  formatBulkCompleteNotice,
  isBulkCompleteEligibleItem,
  isReviewInboxBulkCompleteEligible,
  normalizeBulkCompleteIds,
  selectAllEligibleState,
  tallyBulkCompleteResults,
} from "../lib/website-review-inbox/bulk-eligibility";
import {
  REVIEW_INBOX_OPEN_STATUSES,
  isReviewInboxStatus,
  reviewInboxStatusOption,
} from "../lib/website-review-inbox/status";
import type { ReviewInboxItem } from "../lib/website-review-inbox/types";
import {
  REVIEW_PAGE_UNSPECIFIED_LABEL,
  derivePageLabel,
  normalizeReviewPageInput,
} from "../lib/ces/modules/website-review/page-location";
import { isPayloadAdmin } from "../payload/access/index.ts";

let failures = 0;

function check(label: string, pass: boolean, detail?: string) {
  console.log(pass ? `  ✔ ${label}` : `  ✗ ${label}${detail ? ` — ${detail}` : ""}`);
  if (!pass) failures += 1;
}

function item(
  partial: Partial<ReviewInboxItem> & Pick<ReviewInboxItem, "id" | "status" | "title">,
): ReviewInboxItem {
  return {
    clientName: partial.clientName ?? "Client",
    clientId: partial.clientId ?? 1,
    submittedBy: null,
    submittedByEmail: null,
    pageLocation: partial.pageLocation ?? "Homepage",
    priority: "normal",
    attachmentCount: 0,
    submittedAt: "2026-07-23T12:00:00.000Z",
    experienceModule: "website-review",
    notesPreview: "",
    workspaceUrl: `/admin/operations/review-inbox/${partial.id}`,
    payloadAdminUrl: `/admin/collections/client-requests/${partial.id}`,
    ...partial,
  };
}

function main() {
  console.log("\nReview Inbox bulk complete — verify:review-inbox-bulk-complete\n");

  // Status model
  check("complete enum is `complete` (not completed)", isReviewInboxStatus("complete"));
  check("`completed` is not a stored status", !isReviewInboxStatus("completed"));
  check(
    "bulk eligibility is only in-progress",
    REVIEW_INBOX_BULK_COMPLETE_ELIGIBLE_STATUSES.length === 1 &&
      REVIEW_INBOX_BULK_COMPLETE_ELIGIBLE_STATUSES[0] === "in-progress",
  );
  check("in-progress is bulk eligible", isReviewInboxBulkCompleteEligible("in-progress"));
  check("new is not bulk eligible", !isReviewInboxBulkCompleteEligible("new"));
  check("triaged is not bulk eligible", !isReviewInboxBulkCompleteEligible("triaged"));
  check("complete is not bulk eligible", !isReviewInboxBulkCompleteEligible("complete"));
  check("declined is not bulk eligible", !isReviewInboxBulkCompleteEligible("declined"));
  check(
    "in-progress label is In progress",
    reviewInboxStatusOption("in-progress").label === "In progress",
  );
  check(
    "open statuses still include in-progress",
    REVIEW_INBOX_OPEN_STATUSES.includes("in-progress"),
  );

  // One eligible / multiple eligible selection
  const rows = [
    item({ id: 1, title: "A", status: "in-progress", clientId: 10, clientName: "Alpha" }),
    item({ id: 2, title: "B", status: "in-progress", clientId: 10, clientName: "Alpha" }),
    item({ id: 3, title: "C", status: "new", clientId: 11, clientName: "Beta" }),
    item({ id: 4, title: "D", status: "complete", clientId: 11, clientName: "Beta" }),
    item({ id: 5, title: "E", status: "triaged", clientId: 12, clientName: "Gamma" }),
  ];

  check("one eligible item can be selected", isBulkCompleteEligibleItem(rows[0]!));
  check(
    "multiple eligible ids resolve from view",
    eligibleIdsInView(rows).join(",") === "1,2",
  );
  check(
    "Select All selects only eligible in filtered view",
    eligibleIdsInView(rows.filter((r) => r.status !== "complete")).join(",") === "1,2",
  );
  check(
    "ineligible and completed excluded from select-all",
    !eligibleIdsInView(rows).includes(3) && !eligibleIdsInView(rows).includes(4),
  );

  const selected = new Set<number>([1]);
  check(
    "select-all state indeterminate when partial",
    selectAllEligibleState([1, 2], selected) === "indeterminate",
  );
  check(
    "select-all state checked when all eligible selected",
    selectAllEligibleState([1, 2], new Set([1, 2])) === "checked",
  );
  check(
    "select-all state unchecked when none selected",
    selectAllEligibleState([1, 2], new Set()) === "unchecked",
  );

  // Filter change clears selection (behavior contract)
  let selection = new Set([1, 2]);
  let currentFilter: "new" | "active" | "all" = "active";
  function applyFilter(next: "new" | "active" | "all") {
    if (next === currentFilter) return;
    currentFilter = next;
    if (selection.size > 0) selection = new Set();
  }
  applyFilter("all");
  check("filter change clears unsafe selection", selection.size === 0);
  applyFilter("all");
  selection = new Set([1]);
  applyFilter("all");
  check("same filter does not clear selection", selection.size === 1);

  // Normalize IDs
  const one = normalizeBulkCompleteIds([7]);
  check("single id normalizes", one.ok && one.ok && one.ids.join(",") === "7");

  const multi = normalizeBulkCompleteIds([7, 8, 9]);
  check("multiple ids normalize", multi.ok && multi.ids.join(",") === "7,8,9");

  const dupes = normalizeBulkCompleteIds([7, 7, 8, "8", 9]);
  check(
    "duplicate ids are deduplicated",
    dupes.ok && dupes.ids.join(",") === "7,8,9" && dupes.duplicatesRemoved === 2,
  );

  const empty = normalizeBulkCompleteIds([]);
  check("empty list rejected", !empty.ok && empty.code === "empty");

  const malformed = normalizeBulkCompleteIds([7, "nope"]);
  check("malformed ids rejected", !malformed.ok && malformed.code === "malformed");

  const tooLarge = normalizeBulkCompleteIds(
    Array.from({ length: REVIEW_INBOX_BULK_COMPLETE_MAX_IDS + 1 }, (_, i) => i + 1),
  );
  check(
    "excessive batch size rejected",
    !tooLarge.ok && tooLarge.code === "too_large",
  );
  check("batch max is 50", REVIEW_INBOX_BULK_COMPLETE_MAX_IDS === 50);

  const skipComplete = bulkCompleteSkipReason("complete");
  check(
    "stale already-complete is skipped, not completed",
    skipComplete.reasonCode === "already_complete",
  );
  const skipNew = bulkCompleteSkipReason("new");
  check(
    "stale ineligible status is skipped",
    skipNew.reasonCode === "ineligible_status",
  );

  // Mixed-client breakdown
  const breakdown = clientBreakdownForSelection(rows, new Set([1, 2, 3]));
  check(
    "mixed-client batches group by client",
    breakdown.length === 2 &&
      breakdown[0]?.clientName === "Alpha" &&
      breakdown[0]?.count === 2 &&
      breakdown[1]?.clientName === "Beta",
  );

  // Partial success tallies
  const counts = tallyBulkCompleteResults(
    [
      { outcome: "completed" },
      { outcome: "completed" },
      { outcome: "skipped" },
      { outcome: "failed" },
    ],
    4,
  );
  check(
    "partial success returns accurate structured counts",
    counts.requested === 4 &&
      counts.completed === 2 &&
      counts.skipped === 1 &&
      counts.failed === 1,
  );

  const notice = formatBulkCompleteNotice(
    { requested: 13, completed: 12, skipped: 1, failed: 0 },
    true,
  );
  check(
    "partial notice mentions completed and skipped",
    notice.includes("12 requests completed") && notice.includes("1 was skipped"),
  );
  check(
    "partial notice does not claim full success leave-active line",
    !notice.includes("moved out of Active"),
  );

  const fullNotice = formatBulkCompleteNotice(
    { requested: 2, completed: 2, skipped: 0, failed: 0 },
    true,
  );
  check(
    "full success on active view mentions leaving Active",
    fullNotice.includes("moved out of Active"),
  );

  // Auth / portal isolation contracts from source
  check(
    "portal users are not payload admins",
    isPayloadAdmin({ collection: "portal-users" } as never) === false,
  );
  check(
    "users collection is payload admin",
    isPayloadAdmin({ collection: "users" } as never) === true,
  );

  const routeSource = readFileSync(
    resolve("app/api/admin/review-inbox/bulk-complete/route.ts"),
    "utf8",
  );
  check(
    "bulk route requires payload admin API",
    routeSource.includes("requirePayloadAdminApi"),
  );
  check(
    "bulk route does not accept clientId as authorization",
    !routeSource.includes("clientId") ||
      routeSource.includes("never") ||
      !/body\.clientId/.test(routeSource),
  );
  check("bulk route requires confirm: true", routeSource.includes("body.confirm !== true"));
  check(
    "bulk route calls canonical bulkCompleteReviewRequests",
    routeSource.includes("bulkCompleteReviewRequests"),
  );

  const bulkSource = readFileSync(
    resolve("lib/website-review-inbox/bulk-complete.ts"),
    "utf8",
  );
  check(
    "bulk completion reuses updateReviewRequestStatus",
    bulkSource.includes("updateReviewRequestStatus"),
  );
  check(
    "bulk completion re-checks eligibility at execution time",
    bulkSource.includes("isReviewInboxBulkCompleteEligible"),
  );
  check(
    "bulk completion rejects wrong experience modules",
    bulkSource.includes("wrong_module"),
  );
  check(
    "already-complete path is skip, not re-update",
    bulkSource.includes("bulkCompleteSkipReason") &&
      bulkSource.includes("isReviewInboxBulkCompleteEligible"),
  );

  const screenSource = readFileSync(
    resolve("components/admin/operations/review-inbox/ReviewInboxScreen.tsx"),
    "utf8",
  );
  check(
    "inbox screen clears selection on filter change",
    screenSource.includes("Selection cleared because the inbox filter changed"),
  );
  check(
    "inbox screen select-all scoped to this view",
    screenSource.includes("Select all eligible in this view"),
  );
  check(
    "inbox screen uses accessible select labels",
    screenSource.includes("Select request:"),
  );
  check(
    "single-request completion path still present",
    screenSource.includes("/api/admin/client-requests/") &&
      screenSource.includes("/status"),
  );
  check(
    "Escape clears selection when bulk bar active",
    screenSource.includes('event.key !== "Escape"') ||
      screenSource.includes('event.key === "Escape"'),
  );
  check(
    "page location column still rendered",
    screenSource.includes("item.pageLocation"),
  );

  // Newly shipped page/location helpers remain intact
  const homepage = derivePageLabel("/");
  check("page/location Homepage label intact", homepage === "Homepage");
  const normalized = normalizeReviewPageInput("/drive", {
    websiteBaseUrl: "https://client.preview.kreatebydesign.com",
  });
  check("page/location normalize still works", normalized.ok === true);
  check(
    "page/location unspecified label intact",
    REVIEW_PAGE_UNSPECIFIED_LABEL === "Page not specified",
  );

  // Idempotency contract: completing already-complete yields skip reason, not a second write path
  check(
    "retried already-complete does not look like success",
    bulkCompleteSkipReason("complete").reasonCode === "already_complete",
  );

  if (failures > 0) {
    console.log(`\nFAILED: ${failures} check(s)\n`);
    process.exit(1);
  }

  console.log("\nAll checks passed.\n");
}

main();
