/**
 * Phase 4 Batch F — Authorized combined portfolio view.
 * Static + pure-unit verification only. No database. No external writes.
 *
 * Run: npm run verify:phase4-authorized-portfolio
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import {
  composeAuthorizedPortfolio,
} from "../lib/portal/authorized-portfolio";
import { resolvePortfolioAccess } from "../lib/portal/portfolio";
import {
  authorizedFixtureClientIds,
  composeWorkPerformanceModel,
  FUTURE_ACCESS_MATRIX,
  defaultWorkPerformancePeriod,
} from "../lib/portal/work-performance";
import type { WorkPerformanceModel } from "../lib/portal/work-performance";

const root = process.cwd();

function read(rel: string) {
  return readFileSync(path.join(root, rel), "utf8");
}

function walkFiles(dir: string, exts: Set<string>, out: string[] = []): string[] {
  let entries: import("node:fs").Dirent[] = [];
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const ent of entries) {
    if (
      ent.name === "node_modules" ||
      ent.name === ".next" ||
      ent.name === ".git" ||
      ent.name === ".tmp"
    ) {
      continue;
    }
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) walkFiles(full, exts, out);
    else if (exts.has(path.extname(ent.name))) out.push(full);
  }
  return out;
}

function check(label: string, pass: boolean, detail?: string) {
  console.log(pass ? `  ✔ ${label}` : `  ✘ ${label}${detail ? ` — ${detail}` : ""}`);
  assert.ok(pass, detail ? `${label}: ${detail}` : label);
}

function emptyModel(
  clientId: number,
  clientName: string,
  clientSlug: string | null,
): WorkPerformanceModel {
  const period = defaultWorkPerformancePeriod(new Date("2026-07-15T12:00:00.000Z"));
  return composeWorkPerformanceModel({
    authorizedClientId: clientId,
    clientName,
    clientSlug,
    sourceClientId: clientId,
    reportingPeriod: period,
    comparisonPeriod: null,
    completedItems: [],
    activeItems: [],
    updateRequests: {
      entitled: true,
      openCount: 0,
      awaitingClientCount: 0,
      inProgressCount: 0,
      completedThisMonthCount: 0,
      priority: [],
      primaryActionHref: "/portal/requests",
    },
    reportingFacts: [],
    reportingEntitled: false,
    analyticsFreshnessNote: null,
    nextMoveCandidates: [],
  });
}

function main() {
  console.log("\nPhase 4 Batch F — authorized combined portfolio\n");

  const billyIds = authorizedFixtureClientIds("billy");
  const nicoleIds = authorizedFixtureClientIds("nicole");
  const donIds = authorizedFixtureClientIds("don");

  // Access gate
  check(
    "portfolio disabled when flag off",
    resolvePortfolioAccess({
      switchingAvailable: true,
      authorizedClientIds: donIds,
      portfolioAccessAvailable: false,
    }).available === false,
  );
  check(
    "single-account portfolio unavailable",
    resolvePortfolioAccess({
      switchingAvailable: false,
      authorizedClientIds: billyIds,
      portfolioAccessAvailable: false,
    }).reason === "not-enabled",
  );
  check(
    "multi-account portfolio available when flagged",
    resolvePortfolioAccess({
      switchingAvailable: true,
      authorizedClientIds: nicoleIds,
      portfolioAccessAvailable: true,
    }).available === true,
  );
  check(
    "switching-inactive blocks portfolio even if flagged",
    resolvePortfolioAccess({
      switchingAvailable: false,
      authorizedClientIds: nicoleIds,
      portfolioAccessAvailable: true,
    }).reason === "switching-inactive",
  );

  // Billy — single account equivalent
  const billy = composeAuthorizedPortfolio({
    portfolioAccessAvailable: false,
    switchingAvailable: false,
    authorizedClientIds: billyIds,
    activeClientId: billyIds[0]!,
    activeClientName: "Cusick Morgan Motorsports",
    siteModels: [
      emptyModel(billyIds[0]!, "Cusick Morgan Motorsports", "cusick-morgan-motorsports"),
    ],
  });
  check("Billy portfolio not ready (single-account equivalent)", billy.availability !== "ready");
  check("Billy sites empty on portfolio surface", billy.sites.length === 0);
  check(
    "Billy fixture expects no multi-site overview",
    FUTURE_ACCESS_MATRIX.billy.expectsMultiSiteOverview === false,
  );

  // Nicole — authorized two-site portfolio
  const nicoleModels = nicoleIds.map((id, i) =>
    emptyModel(id, ["OTP", "OTP Carts"][i]!, FUTURE_ACCESS_MATRIX.nicole.authorizedSlugs[i]!),
  );
  const nicole = composeAuthorizedPortfolio({
    portfolioAccessAvailable: true,
    switchingAvailable: true,
    authorizedClientIds: nicoleIds,
    activeClientId: nicoleIds[0]!,
    activeClientName: "OTP",
    siteModels: nicoleModels,
  });
  check("Nicole portfolio ready", nicole.availability === "ready");
  check("Nicole portfolio ⊆ memberships", nicole.sites.length === 2);
  check(
    "Nicole unauthorized client absent",
    !nicole.sites.some((s) => s.clientId === donIds[0]),
  );
  check("Nicole active flag set", nicole.sites.some((s) => s.isActive && s.clientId === nicoleIds[0]));

  // Unauthorized model rejected
  let forgedRejected = false;
  try {
    composeAuthorizedPortfolio({
      portfolioAccessAvailable: true,
      switchingAvailable: true,
      authorizedClientIds: nicoleIds,
      activeClientId: nicoleIds[0]!,
      activeClientName: "OTP",
      siteModels: [
        ...nicoleModels,
        emptyModel(donIds[0]!, "Cusick Morgan Motorsports", "cusick-morgan-motorsports"),
      ],
    });
  } catch {
    forgedRejected = true;
  }
  check("forged unauthorized site model rejected", forgedRejected);

  // Don — four authorized sites
  const don = composeAuthorizedPortfolio({
    portfolioAccessAvailable: true,
    switchingAvailable: true,
    authorizedClientIds: donIds,
    activeClientId: donIds[0]!,
    activeClientName: "Cusick Morgan Motorsports",
    siteModels: donIds.map((id, i) =>
      emptyModel(
        id,
        ["Cusick Morgan Motorsports", "OTP", "OTP Carts", "2475 Townsgate"][i]!,
        FUTURE_ACCESS_MATRIX.don.authorizedSlugs[i]!,
      ),
    ),
  });
  check("Don portfolio includes exactly four authorized sites", don.sites.length === 4);
  check("Don totals siteCount is 4", don.overview.totals?.siteCount === 4);
  check(
    "Don portfolio never invents fifth client",
    don.sites.every((s) => donIds.includes(s.clientId)),
  );

  // Inactive / revoked simulation — disabled memberships never enter authorizedClientIds
  const revoked = composeAuthorizedPortfolio({
    portfolioAccessAvailable: true,
    switchingAvailable: true,
    authorizedClientIds: [nicoleIds[0]!],
    activeClientId: nicoleIds[0]!,
    activeClientName: "OTP",
    siteModels: [nicoleModels[0]!],
  });
  check(
    "revoked second membership yields single-account/unavailable portfolio",
    revoked.availability !== "ready",
  );

  // Source contracts
  const portfolioPage = read("app/(portal)/portal/(app)/portfolio/page.tsx");
  const portfolioServer = read("lib/portal/authorized-portfolio/server.ts");
  const portfolioCompose = read("lib/portal/authorized-portfolio/compose.ts");
  const portfolioGate = read("lib/portal/portfolio.ts");
  const accountContext = read("lib/portal/account-context.ts");
  const layout = read("app/(portal)/portal/(app)/layout.tsx");
  const nav = read("lib/portal/nav.ts");
  const shell = read("components/client-hq/ClientHqShell.tsx");
  const packageJson = read("package.json");
  const phaseDoc = read("docs/PHASE-4-MULTI-CLIENT-PORTAL.md");

  check(
    "portfolio page uses session + account context + access gate",
    portfolioPage.includes("getPortalSession") &&
      portfolioPage.includes("resolvePortalAccountContext") &&
      portfolioPage.includes("resolvePortfolioAccess") &&
      portfolioPage.includes("resolveAuthorizedPortfolio"),
  );
  check(
    "portfolio page redirects when unavailable (single-account equivalent)",
    portfolioPage.includes('redirect("/portal")'),
  );
  check(
    "portfolio page remains force-dynamic",
    portfolioPage.includes('dynamic = "force-dynamic"'),
  );
  check(
    "portfolio server is server-only and membership-scoped",
    portfolioServer.includes('import "server-only"') &&
      portfolioServer.includes("authorizedClientIds") &&
      portfolioServer.includes("resolvePortalWorkPerformance"),
  );
  check(
    "portfolio compose rejects unauthorized site models",
    portfolioCompose.includes("Authorized portfolio refused"),
  );
  check(
    "portfolio gate enables authorized multi-account",
    portfolioGate.includes("authorized-multi-account") &&
      portfolioGate.includes("portfolioAccessAvailable"),
  );
  check(
    "account context grants portfolio only with switchingAvailable",
    accountContext.includes("portfolioAccessAvailable = switchingAvailable") ||
      accountContext.includes("const portfolioAccessAvailable = switchingAvailable"),
  );
  check(
    "layout wires portfolioNavAvailable from account context",
    layout.includes("portfolioNavAvailable") &&
      layout.includes("portfolioAccessAvailable"),
  );
  check(
    "nav exposes /portal/portfolio only when portfolioNavAvailable",
    nav.includes("/portal/portfolio") && nav.includes("portfolioNavAvailable"),
  );
  check(
    "shell accepts portfolioNavAvailable",
    shell.includes("portfolioNavAvailable"),
  );
  check(
    "package.json registers Batch F verifier",
    packageJson.includes("verify:phase4-authorized-portfolio"),
  );
  check(
    "no Batch F migration required/registered",
    !read("migrations/index.ts").includes("authorized-portfolio") &&
      !existsSync(path.join(root, "migrations/20260731_phase4_authorized_portfolio.ts")),
  );

  // Isolation — no Phase 3 / no slug auth / no parent-org
  const batchFFiles = [
    "lib/portal/portfolio.ts",
    "lib/portal/authorized-portfolio/compose.ts",
    "lib/portal/authorized-portfolio/server.ts",
    "lib/portal/authorized-portfolio/types.ts",
    "lib/portal/authorized-portfolio/index.ts",
    "app/(portal)/portal/(app)/portfolio/page.tsx",
    "components/client-hq/PortfolioScreen.tsx",
    "components/portal/AuthorizedPortfolioWorkspace.tsx",
    "components/portal/AuthorizedPortfolioOpenAccount.tsx",
  ];
  for (const rel of batchFFiles) {
    const src = read(rel);
    check(
      `${rel} has no Phase 3 relationship fields`,
      !src.includes("client-contacts") &&
        !src.includes("client-relationship-events") &&
        !src.includes("dietary"),
    );
    check(
      `${rel} has no slug-pattern authorization`,
      !src.includes("slug === ") && !src.includes('slug == "'),
    );
    check(
      `${rel} has no parent-organization auth`,
      !src.includes("parentOrg") && !src.includes("parent-organization"),
    );
  }

  // Pure modules stay DB-free
  for (const rel of [
    "lib/portal/portfolio.ts",
    "lib/portal/authorized-portfolio/compose.ts",
    "lib/portal/authorized-portfolio/types.ts",
  ]) {
    const src = read(rel);
    check(
      `${rel} does not connect to database`,
      !src.includes("getPayload") && !src.includes("DATABASE_URL"),
    );
  }

  // Personalization still must not recommend portfolio as a focus destination
  const safeRoutes = read("lib/portal/workspace-personalization/safe-routes.ts");
  check(
    "personalization keeps /portal/portfolio forbidden as a focus href",
    safeRoutes.includes('"/portal/portfolio"') &&
      safeRoutes.includes("WORKSPACE_FORBIDDEN_HREF_PATTERNS"),
  );

  // Docs status mention (non-blocking soft check — presence of Batch F heading)
  check(
    "Phase 4 plan still defines Batch F portfolio",
    phaseDoc.includes("Batch F — Authorized combined portfolio"),
  );

  // Walk Batch F surface for accidental admin portfolio redesign coupling
  const portfolioUi = read("components/client-hq/PortfolioScreen.tsx");
  check(
    "portal portfolio does not import admin ClientPortfolioScreen",
    !portfolioUi.includes("ClientPortfolioScreen") &&
      !portfolioUi.includes("admin/operations/client-portfolio"),
  );

  // Ensure OpenAccount uses switch API (server revalidation)
  const openAccount = read("components/portal/AuthorizedPortfolioOpenAccount.tsx");
  check(
    "open-account posts to switch route",
    openAccount.includes("/api/portal/account/switch") &&
      openAccount.includes('credentials: "same-origin"'),
  );

  // Sanity: portfolio route exists
  check(
    "portfolio route file exists",
    existsSync(path.join(root, "app/(portal)/portal/(app)/portfolio/page.tsx")),
  );

  // No accidental export of operator-only data helpers in Batch F pure folder
  const authPortfolioDir = path.join(root, "lib/portal/authorized-portfolio");
  for (const file of walkFiles(authPortfolioDir, new Set([".ts"]))) {
    const rel = path.relative(root, file);
    if (rel.endsWith("server.ts")) continue;
    const src = readFileSync(file, "utf8");
    check(
      `${rel} stays free of Payload`,
      !src.includes("getPayload") && !src.includes("@payload-config"),
    );
  }

  console.log("\nPhase 4 Batch F authorized portfolio verification passed.\n");
}

main();
