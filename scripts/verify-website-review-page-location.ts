/**
 * Website Review page / location — focused verification.
 *
 * Run: npm run verify:website-review-page-location
 */
import { pageLabelFromPath, parsePagePathFromUrl } from "../lib/ces/review/capture";
import { pinsForPageUrl, reviewPageKey } from "../lib/ces/review/page-scope";
import { formatPageContextDisplay } from "../lib/ces/modules/website-review/context";
import {
  REVIEW_PAGE_UNSPECIFIED_LABEL,
  derivePageLabel,
  normalizeReviewPageInput,
  resolveReviewPageLocation,
} from "../lib/ces/modules/website-review/page-location";
import { buildReviewContextFromDraft } from "../lib/ces/modules/website-review/context";

let failures = 0;

function check(label: string, pass: boolean, detail?: string) {
  console.log(pass ? `  ✔ ${label}` : `  ✗ ${label}${detail ? ` — ${detail}` : ""}`);
  if (!pass) failures += 1;
}

function main() {
  console.log("\nWebsite Review page location — verify:website-review-page-location\n");

  check("`/` displays Homepage", pageLabelFromPath("/") === "Homepage");
  check("`/drive` does not display Homepage", pageLabelFromPath("/drive") !== "Homepage");
  check("`/drive` → Drive", pageLabelFromPath("/drive") === "Drive");
  check(
    "`/racing-schools` → Racing Schools",
    pageLabelFromPath("/racing-schools") === "Racing Schools",
  );
  check(
    "`/models/example` derives multi-segment label",
    pageLabelFromPath("/models/example") === "Models · Example",
  );

  const relative = normalizeReviewPageInput("/inventory", {
    websiteBaseUrl: "https://client.preview.kreatebydesign.com",
  });
  check("custom relative path normalizes", relative.ok === true);
  if (relative.ok) {
    check("relative path pagePath", relative.page.pagePath === "/inventory");
    check("relative path label", relative.page.pageLabel === "Inventory");
    check(
      "relative path absolute URL",
      relative.page.pageUrl === "https://client.preview.kreatebydesign.com/inventory",
    );
  }

  const sameOrigin = normalizeReviewPageInput(
    "https://client.preview.kreatebydesign.com/service?ref=1",
    { websiteBaseUrl: "https://client.preview.kreatebydesign.com" },
  );
  check("same-origin full URL normalizes", sameOrigin.ok === true);
  if (sameOrigin.ok) {
    check("same-origin keeps query in path", sameOrigin.page.pagePath === "/service?ref=1");
    check("same-origin label ignores query", sameOrigin.page.pageLabel === "Service");
  }

  const external = normalizeReviewPageInput("https://evil.example/phish", {
    websiteBaseUrl: "https://client.preview.kreatebydesign.com",
  });
  check("external URL rejected", external.ok === false);

  const unsafe = normalizeReviewPageInput("javascript:alert(1)", {
    websiteBaseUrl: "https://client.preview.kreatebydesign.com",
  });
  check("javascript URL rejected", unsafe.ok === false);

  const empty = normalizeReviewPageInput("   ", {
    websiteBaseUrl: "https://client.preview.kreatebydesign.com",
  });
  check("empty custom selection rejected", empty.ok === false);

  const missing = resolveReviewPageLocation(null, null);
  check(
    "missing legacy location → Page not specified",
    missing.unspecified && missing.display === REVIEW_PAGE_UNSPECIFIED_LABEL,
  );

  const staleHomepage = resolveReviewPageLocation(
    {
      pageLabel: "Homepage",
      pagePath: "/drive",
      pageUrl: "https://client.preview.kreatebydesign.com/drive",
      source: "visual-review",
    },
    null,
  );
  check(
    "stale Homepage + /drive derives Drive",
    staleHomepage.pageLabel === "Drive" && staleHomepage.pagePath === "/drive",
  );
  check(
    "stale Homepage display includes path",
    staleHomepage.display.includes("/drive") && !staleHomepage.display.startsWith("Homepage"),
  );

  const realHome = resolveReviewPageLocation(
    { pageLabel: "Homepage", pagePath: "/", source: "manual" },
    null,
  );
  check("explicit `/` remains Homepage", realHome.pageLabel === "Homepage");

  const legacyValid = resolveReviewPageLocation(
    {
      pageLabel: undefined,
      pagePath: "/inventory",
      pageUrl: "https://example.com/inventory",
    },
    null,
  );
  check(
    "legacy path-only context derives Inventory",
    legacyValid.pageLabel === "Inventory" && legacyValid.compact.includes("/inventory"),
  );

  const created = buildReviewContextFromDraft({
    pageLabel: "Racing Schools",
    pagePath: "/drive",
    pageUrl: "https://client.preview.kreatebydesign.com/drive",
    source: "manual",
  });
  check("request creation persists pageLabel", created?.pageLabel === "Racing Schools");
  check("request creation persists pagePath", created?.pagePath === "/drive");
  check(
    "operator display receives correct page",
    formatPageContextDisplay(created) === "Racing Schools · /drive",
  );

  const pins = [
    {
      number: 1,
      anchor: {
        viewport: {
          pageUrl: "https://client.preview.kreatebydesign.com/drive",
          pagePath: "/drive",
          pageLabel: "Drive",
        },
      },
    },
    {
      number: 2,
      anchor: {
        viewport: {
          pageUrl: "https://client.preview.kreatebydesign.com/",
          pagePath: "/",
          pageLabel: "Homepage",
        },
      },
    },
  ];
  const drivePins = pinsForPageUrl(pins, "https://client.preview.kreatebydesign.com/drive");
  const homePins = pinsForPageUrl(pins, "https://client.preview.kreatebydesign.com/");
  check("page-scoped markers isolated by pathname", drivePins.length === 1 && homePins.length === 1);
  check(
    "reviewPageKey distinguishes pages",
    reviewPageKey("https://a.com/drive") !== reviewPageKey("https://a.com/"),
  );
  check(
    "parsePagePathFromUrl keeps query",
    parsePagePathFromUrl("https://a.com/inventory?id=9") === "/inventory?id=9",
  );
  check("derivePageLabel matches pageLabelFromPath", derivePageLabel("/about-us") === "About Us");

  // Client isolation: normalize rejects other client's domain
  const otherClient = normalizeReviewPageInput("https://other.preview.kreatebydesign.com/about", {
    websiteBaseUrl: "https://client.preview.kreatebydesign.com",
  });
  check("other-client preview domain rejected", otherClient.ok === false);

  console.log("");
  if (failures > 0) {
    console.error(`FAILED — ${failures} check(s)`);
    process.exit(1);
  }
  console.log("PASSED — website review page location\n");
}

main();
