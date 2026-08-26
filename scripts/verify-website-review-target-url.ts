/**
 * Website Review target URL precedence — focused verification.
 *
 * Pure picker only (no DB). Confirms stagingUrl → companyWebsite order
 * stays shared between runtime and readiness diagnostics.
 *
 * Run: npm run verify:website-review-target-url
 */
import { pickWebsiteReviewTargetUrl } from "../lib/ces/modules/website-review/target-url";
import { validateReviewModule } from "../lib/client-launch/validators";

let failures = 0;

function check(label: string, pass: boolean, detail?: string) {
  console.log(pass ? `  ✔ ${label}` : `  ✗ ${label}${detail ? ` — ${detail}` : ""}`);
  if (!pass) failures += 1;
}

function main() {
  console.log("\nWebsite Review target URL — verify:website-review-target-url\n");

  const preview = "https://client.preview.kreatebydesign.com";
  const production = "https://www.example-client.com";

  const stagingOnly = pickWebsiteReviewTargetUrl({
    stagingUrl: preview,
    companyWebsite: null,
  });
  check(
    "stagingUrl present + companyWebsite absent → stagingUrl",
    stagingOnly === preview,
    `got=${stagingOnly}`,
  );

  const both = pickWebsiteReviewTargetUrl({
    stagingUrl: preview,
    companyWebsite: production,
  });
  check(
    "stagingUrl present + companyWebsite present → stagingUrl wins",
    both === preview,
    `got=${both}`,
  );

  const companyOnly = pickWebsiteReviewTargetUrl({
    stagingUrl: null,
    companyWebsite: production,
  });
  check(
    "stagingUrl absent + companyWebsite present → companyWebsite",
    companyOnly === production,
    `got=${companyOnly}`,
  );

  const neither = pickWebsiteReviewTargetUrl({
    stagingUrl: null,
    companyWebsite: null,
  });
  check("both absent → null", neither === null, `got=${neither}`);

  const blankStaging = pickWebsiteReviewTargetUrl({
    stagingUrl: "   ",
    companyWebsite: production,
  });
  check(
    "whitespace stagingUrl falls through to companyWebsite",
    blankStaging === production,
    `got=${blankStaging}`,
  );

  const trailingSlash = pickWebsiteReviewTargetUrl({
    stagingUrl: `${preview}/`,
    companyWebsite: production,
  });
  check(
    "stagingUrl trailing slash normalized",
    trailingSlash === preview,
    `got=${trailingSlash}`,
  );

  const readinessClears = validateReviewModule({
    clientId: 1,
    clientName: "Example Client",
    clientSlug: "example-client",
    clientStatus: "active",
    websiteUrl: pickWebsiteReviewTargetUrl({
      stagingUrl: preview,
      companyWebsite: null,
    }),
    portalUserCount: 1,
    activePortalUserCount: 1,
    welcomeCompletedUserCount: 1,
    welcomePendingUserCount: 0,
    cesProfileStatus: "active",
    cesProfileName: "Example",
    cesModules: ["website-review"],
    accentColor: null,
  });
  check(
    "readiness: Preview Website alone clears website-missing blocker",
    readinessClears.length === 0,
    `blockers=${readinessClears.map((b) => b.id).join(",")}`,
  );

  const readinessBlocks = validateReviewModule({
    clientId: 1,
    clientName: "Example Client",
    clientSlug: "example-client",
    clientStatus: "active",
    websiteUrl: pickWebsiteReviewTargetUrl({
      stagingUrl: null,
      companyWebsite: null,
    }),
    portalUserCount: 1,
    activePortalUserCount: 1,
    welcomeCompletedUserCount: 1,
    welcomePendingUserCount: 0,
    cesProfileStatus: "active",
    cesProfileName: "Example",
    cesModules: ["website-review"],
    accentColor: null,
  });
  check(
    "readiness: both absent keeps website-missing blocker",
    readinessBlocks.some((b) => b.id === "website-missing"),
    `blockers=${readinessBlocks.map((b) => b.id).join(",")}`,
  );

  if (failures > 0) {
    console.log(`\n${failures} check(s) failed.\n`);
    process.exit(1);
  }

  console.log("\nAll Website Review target URL checks passed.\n");
}

main();
