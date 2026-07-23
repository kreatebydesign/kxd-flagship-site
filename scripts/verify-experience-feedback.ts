/**
 * Static verification for founding-client early-access feedback + isolation gates.
 * Run: npx tsx scripts/verify-experience-feedback.ts
 */
import { readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();

function check(label: string, pass: boolean, detail?: string) {
  console.log(pass ? `  ✔ ${label}` : `  ✘ ${label}${detail ? ` — ${detail}` : ""}`);
  if (!pass) throw new Error(label);
}

function read(rel: string) {
  return readFileSync(path.join(root, rel), "utf8");
}

function main() {
  console.log("\nExperience feedback + release isolation verification\n");

  const feedbackLib = read("lib/portal/experience-feedback.ts");
  const feedbackRoute = read("app/api/portal/feedback/route.ts");
  const feedbackUi = read("components/client-hq/PortalFeedbackControl.tsx");
  const shell = read("components/client-hq/ClientHqShell.tsx");
  const access = read("payload/access/index.ts");
  const portalUsers = read("payload/collections/PortalUsers.ts");
  const audit = read("lib/portal/data.ts");
  const upgrade = read("app/api/portal/upgrade-requests/route.ts");
  const dbHealth = read("app/api/db-health/route.ts");
  const portalError = read("app/(portal)/error.tsx");
  const portalNotFound = read("app/(portal)/not-found.tsx");
  const portalSegmentNotFound = read("app/(portal)/portal/not-found.tsx");
  const portalCatchAll = read("app/(portal)/portal/[...slug]/page.tsx");
  const onboarding = read("app/(portal)/portal/(app)/onboarding/page.tsx");
  const middleware = read("middleware.ts");
  const adminMiddleware = read("lib/admin/middleware.ts");

  check(
    "feedback derives client from session only",
    feedbackLib.includes("client: input.session.clientId") &&
      feedbackRoute.includes("Ignore any browser-supplied clientId") &&
      feedbackRoute.includes("void body.clientId"),
  );

  check(
    "feedback stores via client-communications (no new collection/migration)",
    feedbackLib.includes('collection: "client-communications"') &&
      feedbackLib.includes('source: "portal-experience-feedback"'),
  );

  check(
    "feedback UI is surfaced in portal shell",
    shell.includes("PortalFeedbackControl") &&
      feedbackUi.includes('fetch("/api/portal/feedback"'),
  );

  check(
    "website audit no longer matches by email/company alone",
    audit.includes("Require a client website match") &&
      !audit.includes("orFilters.push({ email:") &&
      !audit.includes("orFilters.push({ company:"),
  );

  check(
    "upgrade-requests ignores browser clientId",
    upgrade.includes("Client identity comes from the portal session only") &&
      !upgrade.includes("Client identity mismatch"),
  );

  check(
    "db-health requires Payload admin",
    dbHealth.includes("requirePayloadAdminApi"),
  );

  check(
    "portal error and not-found boundaries exist",
    portalError.includes("Something went wrong") &&
      portalNotFound.includes("Page not found") &&
      portalSegmentNotFound.includes("Page not found") &&
      portalCatchAll.includes("notFound()"),
  );

  check(
    "incomplete onboarding questionnaire redirects home",
    onboarding.includes('redirect("/portal")'),
  );

  check(
    "admin work/sales/training in middleware matcher + auth helper",
    middleware.includes("/admin/work/:path*") &&
      middleware.includes("/admin/sales/:path*") &&
      middleware.includes("/admin/training/:path*") &&
      adminMiddleware.includes('pathname.startsWith("/admin/work/")') &&
      adminMiddleware.includes('pathname.startsWith("/admin/sales/")') &&
      adminMiddleware.includes('pathname.startsWith("/admin/training/")'),
  );

  check(
    "Payload REST access helpers remain admin-scoped",
    access.includes("return user.collection === \"users\"") &&
      portalUsers.includes("update: isPayloadAdminUser"),
  );

  check(
    "mobile nav drawer exists for founding-client phones",
    shell.includes("kxd-ces-mobile-bar") &&
      shell.includes("kxd-ces-nav-open") &&
      shell.includes("Close menu"),
  );

  check(
    "feedback and website-review surface session expiry on 401",
    feedbackRoute.includes("session_expired") &&
      feedbackUi.includes("session_expired") &&
      read("app/api/portal/website-review/route.ts").includes("session_expired") &&
      read("components/ces/modules/website-review/WebsiteReviewRequestFlow.tsx").includes(
        "session_expired",
      ),
  );

  check(
    "mobile sidebar sets aria-hidden when drawer is closed",
    shell.includes("aria-hidden={mobileNavMode ? !navOpen : undefined}"),
  );

  console.log("\nExperience feedback + release isolation verification passed.\n");
}

main();
