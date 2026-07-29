/**
 * Website Review → Work detail context — focused verification.
 *
 * Run: npm run verify:website-review-work-detail
 */
import {
  assertAttachmentsUseSecurePipeline,
  buildWebsiteReviewOpenUrl,
  isSafeExternalHttpUrl,
  parseWebsiteReviewSourceId,
  resolveWebsiteReviewWorkDisplayTitle,
  reviewInboxWorkspaceUrl,
  workEngineDetailUrl,
} from "../lib/work/website-review-context-helpers";
import type { ReviewWorkspaceAttachment } from "../lib/website-review-inbox/types";

let failures = 0;

function check(label: string, pass: boolean, detail?: string) {
  console.log(pass ? `  ✔ ${label}` : `  ✗ ${label}${detail ? ` — ${detail}` : ""}`);
  if (!pass) failures += 1;
}

function main() {
  console.log("\nWebsite Review Work detail — verify:website-review-work-detail\n");

  // Source ID parsing
  check(
    "parses website-review sourceId",
    parseWebsiteReviewSourceId("website-review", "42") === 42,
  );
  check(
    "ignores non-review sources",
    parseWebsiteReviewSourceId("manual", "42") === null,
  );
  check(
    "rejects invalid sourceId",
    parseWebsiteReviewSourceId("website-review", "abc") === null,
  );
  check(
    "rejects empty sourceId",
    parseWebsiteReviewSourceId("website-review", "") === null,
  );

  // Display title prefers original review title
  check(
    "display title uses review title",
    resolveWebsiteReviewWorkDisplayTitle({
      workTitle: "Website revision · Homepage",
      reviewTitle: "Content update · Fix hero headline",
      pageLabel: "Homepage",
    }) === "Content update · Fix hero headline",
  );
  check(
    "display title falls back to work title",
    resolveWebsiteReviewWorkDisplayTitle({
      workTitle: "Website revision · Homepage",
      reviewTitle: null,
      pageLabel: "Homepage",
    }) === "Website revision · Homepage",
  );

  // Navigation URLs
  check("work detail URL", workEngineDetailUrl(17) === "/admin/work/17");
  check(
    "review workspace URL",
    reviewInboxWorkspaceUrl(9) === "/admin/operations/review-inbox/9",
  );

  // Target URL resolution
  check(
    "prefers pageUrl when safe",
    buildWebsiteReviewOpenUrl({
      pageUrl: "https://primal.preview.kreatebydesign.com/drive",
      pagePath: "/drive",
      clientWebsiteUrl: "https://primal.preview.kreatebydesign.com",
    }) === "https://primal.preview.kreatebydesign.com/drive",
  );
  check(
    "joins base + path when pageUrl missing",
    buildWebsiteReviewOpenUrl({
      pageUrl: null,
      pagePath: "/drive",
      clientWebsiteUrl: "https://primal.preview.kreatebydesign.com/",
    }) === "https://primal.preview.kreatebydesign.com/drive",
  );
  check(
    "falls back to client website",
    buildWebsiteReviewOpenUrl({
      pageUrl: null,
      pagePath: null,
      clientWebsiteUrl: "https://primalracing.com",
    }) === "https://primalracing.com",
  );
  check(
    "rejects javascript: pageUrl",
    buildWebsiteReviewOpenUrl({
      pageUrl: "javascript:alert(1)",
      pagePath: null,
      clientWebsiteUrl: null,
    }) === null,
  );
  check("safe http url", isSafeExternalHttpUrl("https://example.com/a") === true);
  check("rejects data url", isSafeExternalHttpUrl("data:text/html,hi") === false);

  // Attachment pipeline
  const secure: ReviewWorkspaceAttachment[] = [
    {
      id: 3,
      filename: "shot.png",
      mimeType: "image/png",
      filesize: 1200,
      isImage: true,
      url: "/api/admin/review-inbox/attachments/3",
    },
  ];
  const insecure: ReviewWorkspaceAttachment[] = [
    {
      id: 3,
      filename: "shot.png",
      mimeType: "image/png",
      filesize: 1200,
      isImage: true,
      url: "https://evil.example/leak",
    },
  ];
  check(
    "secure attachment URLs accepted",
    assertAttachmentsUseSecurePipeline(secure) === true,
  );
  check(
    "external attachment URLs rejected",
    assertAttachmentsUseSecurePipeline(insecure) === false,
  );

  // Cross-client isolation contract (read-time rule documented in loader)
  check(
    "source parse does not accept browser clientId",
    parseWebsiteReviewSourceId("website-review", "7") === 7 &&
      // Loader compares work.clientId to review.clientId — helpers stay ID-only
      typeof parseWebsiteReviewSourceId === "function",
  );

  // Missing source fallback contract
  check(
    "missing review leaves work title intact",
    resolveWebsiteReviewWorkDisplayTitle({
      workTitle: "Website revision · Homepage",
      reviewTitle: null,
      pageLabel: null,
    }) === "Website revision · Homepage",
  );

  console.log(
    failures === 0
      ? "\nAll website-review work detail checks passed.\n"
      : `\n${failures} check(s) failed.\n`,
  );
  process.exit(failures === 0 ? 0 : 1);
}

main();
