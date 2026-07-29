/**
 * Website Review ↔ linked Work coordinated completion — focused verification.
 *
 * Run: npm run verify:website-review-linked-work
 */
import {
  classifyWorkStatusForLinkedCompletion,
  defaultCompleteLinkedWork,
  formatLinkedWorkPreviewLine,
  formatLinkedWorkResultLine,
  inspectionFromMissing,
  inspectionFromProtected,
  inspectionFromUnlinked,
  inspectionFromWork,
  outcomeFromInspection,
  tallyLinkedWorkInspections,
  tallyLinkedWorkOutcomes,
} from "../lib/website-review-inbox/linked-work-types";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

let failures = 0;

function check(label: string, pass: boolean, detail?: string) {
  console.log(pass ? `  ✔ ${label}` : `  ✗ ${label}${detail ? ` — ${detail}` : ""}`);
  if (!pass) failures += 1;
}

function main() {
  console.log("\nWebsite Review linked Work — verify:website-review-linked-work\n");

  check(
    "new Work is eligible",
    classifyWorkStatusForLinkedCompletion("new") === "eligible",
  );
  check(
    "completed Work already_complete",
    classifyWorkStatusForLinkedCompletion("completed") === "already_complete",
  );
  check(
    "archived Work archived",
    classifyWorkStatusForLinkedCompletion("archived") === "archived",
  );

  const eligible = inspectionFromWork({
    workId: 17,
    workNumber: "WK-000017",
    status: "new",
    adminUrl: "/admin/work/17",
  });
  check("eligible inspection", eligible.eligibility === "eligible");
  check("default-on for eligible", defaultCompleteLinkedWork(eligible) === true);

  const already = inspectionFromWork({
    workId: 17,
    workNumber: "WK-000017",
    status: "completed",
    adminUrl: "/admin/work/17",
  });
  check(
    "default-off for already complete",
    defaultCompleteLinkedWork(already) === false,
  );

  check(
    "operator deselect → skipped_by_operator",
    outcomeFromInspection(eligible, { skippedByOperator: true }).outcome ===
      "skipped_by_operator",
  );
  check(
    "no linked work → unlinked",
    inspectionFromUnlinked().eligibility === "unlinked",
  );
  check(
    "missing work → missing",
    inspectionFromMissing().eligibility === "missing",
  );
  check(
    "cross-client → protected",
    inspectionFromProtected("different client").eligibility === "protected",
  );
  check(
    "work failure outcome",
    outcomeFromInspection(eligible, { failedReason: "boom" }).outcome === "failed",
  );

  // Idempotent already-complete path
  check(
    "already-complete outcome without mutation",
    outcomeFromInspection(already).outcome === "already_complete",
  );

  const previewCounts = tallyLinkedWorkInspections([
    eligible,
    already,
    inspectionFromUnlinked(),
    inspectionFromProtected("mismatch"),
  ]);
  check(
    "preview tallies",
    previewCounts.eligible === 1 &&
      previewCounts.alreadyComplete === 1 &&
      previewCounts.unlinked === 1 &&
      previewCounts.protected === 1,
  );

  const previewLine = formatLinkedWorkPreviewLine(previewCounts);
  check(
    "preview language includes eligible + skips",
    previewLine.includes("1 eligible") &&
      previewLine.includes("already complete") &&
      previewLine.includes("no linked Work"),
  );

  const resultCounts = tallyLinkedWorkOutcomes([
    outcomeFromInspection(eligible),
    outcomeFromInspection(already),
    outcomeFromInspection(inspectionFromUnlinked()),
    outcomeFromInspection(eligible, { failedReason: "x" }),
  ]);
  check(
    "result tallies",
    resultCounts.completed === 1 &&
      resultCounts.alreadyComplete === 1 &&
      resultCounts.unlinked === 1 &&
      resultCounts.failed === 1,
  );
  check(
    "result language honest about failures",
    formatLinkedWorkResultLine(resultCounts).includes("failed"),
  );

  // Source contracts
  const statusRoute = readFileSync(
    resolve("app/api/admin/client-requests/[id]/status/route.ts"),
    "utf8",
  );
  check(
    "status route accepts completeLinkedWork flag",
    statusRoute.includes("completeLinkedWork"),
  );
  check(
    "status route never accepts workId from body",
    !statusRoute.includes("workId"),
  );

  const bulkRoute = readFileSync(
    resolve("app/api/admin/review-inbox/bulk-complete/route.ts"),
    "utf8",
  );
  check("bulk route supports preview", bulkRoute.includes("preview"));
  check(
    "bulk route requires confirm for mutation",
    bulkRoute.includes("confirm !== true"),
  );

  const reconcileRoute = readFileSync(
    resolve("app/api/admin/review-inbox/reconcile-linked-work/route.ts"),
    "utf8",
  );
  check(
    "reconcile requires confirm when applying",
    reconcileRoute.includes("confirm !== true"),
  );
  check(
    "reconcile defaults to dry-run",
    reconcileRoute.includes("dryRun"),
  );
  check(
    "reconcile uses requirePayloadAdminApi",
    reconcileRoute.includes("requirePayloadAdminApi"),
  );

  const linkedServer = readFileSync(
    resolve("lib/website-review-inbox/linked-work.ts"),
    "utf8",
  );
  check(
    "server resolves work by source+client, not browser workId",
    linkedServer.includes('source: { equals: "website-review" }') &&
      linkedServer.includes("sourceId"),
  );
  check(
    "uses canonical completeWork",
    linkedServer.includes("completeWork("),
  );
  check(
    "records website-review origin activity",
    linkedServer.includes("completed-via-website-review"),
  );

  console.log(
    failures === 0
      ? "\nAll website-review linked Work checks passed.\n"
      : `\n${failures} check(s) failed.\n`,
  );
  process.exit(failures === 0 ? 0 : 1);
}

main();
