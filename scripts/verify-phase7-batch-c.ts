/**
 * Phase 7 — Today | Batch C — Home policy enforcement verification.
 * Static checks only. No database. No UI redesign assertions.
 *
 * Run: npm run verify:phase7-batch-c
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(rel: string) {
  return readFileSync(path.join(root, rel), "utf8");
}

function check(label: string, pass: boolean, detail?: string) {
  console.log(
    pass ? `  ✔ ${label}` : `  ✘ ${label}${detail ? ` — ${detail}` : ""}`,
  );
  assert.ok(pass, detail ? `${label}: ${detail}` : label);
}

function main() {
  console.log("\nPhase 7 Batch C — Today home policy verification\n");

  const required = [
    "lib/admin/home-policy.ts",
    "lib/admin/os-home.ts",
    "lib/admin/constants.ts",
    "lib/editions/navigation.ts",
    "components/admin/operations/shared/operations-nav.ts",
    "components/admin/KxdAdminLoginForm.tsx",
    "components/admin/KxdAdminLoginView.tsx",
    "app/admin/operations/page.tsx",
    "app/admin/operations/brief/page.tsx",
    "app/admin/operations/today/page.tsx",
    "docs/PHASE-7-TODAY.md",
    "lib/search/shortcuts.ts",
  ];
  for (const f of required) {
    check(`${f} exists`, existsSync(path.join(root, f)));
  }

  const homePolicy = read("lib/admin/home-policy.ts");
  const constants = read("lib/admin/constants.ts");
  const osHome = read("lib/admin/os-home.ts");
  const editionNav = read("lib/editions/navigation.ts");
  const opsNav = read("components/admin/operations/shared/operations-nav.ts");
  const loginForm = read("components/admin/KxdAdminLoginForm.tsx");
  const loginView = read("components/admin/KxdAdminLoginView.tsx");
  const opsHome = read("app/admin/operations/page.tsx");
  const brief = read("app/admin/operations/brief/page.tsx");
  const shortcuts = read("lib/search/shortcuts.ts");
  const staffGuard = read("lib/staff/guard.ts");
  const opsLayout = read("app/admin/operations/layout.tsx");
  const phaseDoc = read("docs/PHASE-7-TODAY.md");

  // ── Home ownership ─────────────────────────────────────────────────────────
  check(
    "FOUNDER_HOME_PATH is Today",
    homePolicy.includes('FOUNDER_HOME_PATH = "/admin/operations/today"'),
  );
  check(
    "OPERATIONS_HOME_PATH uses FOUNDER_HOME_PATH",
    constants.includes("OPERATIONS_HOME_PATH = FOUNDER_HOME_PATH"),
  );
  check(
    "KXD_OS_HOME uses FOUNDER_HOME_PATH",
    osHome.includes("KXD_OS_HOME = FOUNDER_HOME_PATH"),
  );
  check(
    "edition homeRoute defaults to OPERATIONS_HOME_PATH (Today)",
    editionNav.includes("homeRoute: edition.customNavigation?.homeRoute ?? OPERATIONS_HOME_PATH"),
  );
  check(
    "edition homeRoute no longer defaults to /executive",
    !editionNav.includes('?? "/admin/operations/executive"'),
  );

  // ── Login / routing ────────────────────────────────────────────────────────
  check(
    "login form fallback is OPERATIONS_HOME_PATH",
    loginForm.includes("fallbackTo: OPERATIONS_HOME_PATH") &&
      loginForm.includes("?? OPERATIONS_HOME_PATH"),
  );
  check(
    "login view fallback is OPERATIONS_HOME_PATH",
    loginView.includes("fallbackTo: OPERATIONS_HOME_PATH") &&
      loginView.includes("?? OPERATIONS_HOME_PATH"),
  );
  check(
    "/admin/operations redirects via FOUNDER_HOME_PATH",
    opsHome.includes("FOUNDER_HOME_PATH") && opsHome.includes("redirect("),
  );
  check(
    "/admin/operations/brief redirects via FOUNDER_HOME_PATH",
    brief.includes("FOUNDER_HOME_PATH") && brief.includes("redirect("),
  );

  // ── Staff unchanged ────────────────────────────────────────────────────────
  check(
    "operations layout still uses requireStaffAwarePage",
    opsLayout.includes("requireStaffAwarePage"),
  );
  check(
    "staff guard still redirects restricted staff away from Today",
    staffGuard.includes('pathname === "/admin/operations/today"') &&
      staffGuard.includes("redirect(landing)"),
  );
  check(
    "staff home path remains /admin/operations/staff",
    read("lib/staff/permissions.ts").includes(
      'STAFF_HOME_PATH = "/admin/operations/staff"',
    ) ||
      read("lib/staff/permissions.ts").includes(
        'export const STAFF_HOME_PATH = "/admin/operations/staff"',
      ) ||
      /STAFF_HOME_PATH\s*=\s*["']\/admin\/operations\/staff["']/.test(
        read("lib/staff/permissions.ts"),
      ),
  );

  // ── Navigation philosophy ──────────────────────────────────────────────────
  const todayGroupMatch = opsNav.match(
    /label:\s*"Today"[\s\S]*?items:\s*\[([\s\S]*?)\]/,
  );
  check("nav has Today group", Boolean(todayGroupMatch));
  const todayItems = todayGroupMatch?.[1] ?? "";
  check("Today is first item in Today group", /id:\s*"today"/.test(todayItems));
  check("Focus allowed near Today", /id:\s*"focus"/.test(todayItems));
  check("Weekly Review allowed near Today", /id:\s*"review"/.test(todayItems));
  check(
    "Intelligence allowed near Today",
    /id:\s*"intelligence"/.test(todayItems),
  );

  const firstGroupLabel = opsNav.match(/NAV_GROUPS[\s\S]*?label:\s*"([^"]+)"/);
  check(
    "first nav group is Today",
    firstGroupLabel?.[1] === "Today",
  );

  for (const label of ["Work", "Clients", "Business", "Studio", "System"]) {
    check(`nav group "${label}" present`, opsNav.includes(`label: "${label}"`));
  }

  // Competitors must not sit in the Today group as peers
  check(
    "Executive not a Today-group peer",
    !/label:\s*"Today"[\s\S]*?id:\s*"executive"[\s\S]*?label:\s*"Work"/.test(
      opsNav,
    ),
  );
  check(
    "Operations Command demoted from briefing home label",
    opsNav.includes('label: "Operations Board"') &&
      !opsNav.includes('label: "Command Center"'),
  );
  check(
    "Founder Studio home brand demoted",
    opsNav.includes('label: "Owner Snapshot"') &&
      !opsNav.includes('label: "Founder Studio"'),
  );
  check(
    "Founder Intelligence home brand demoted",
    opsNav.includes('label: "Priority Brief"'),
  );
  check(
    "KXD Brain home brand demoted",
    opsNav.includes('label: "Portfolio Synthesis"') &&
      !opsNav.includes('label: "KXD Brain"'),
  );
  check(
    "Executive nav label is Portfolio Overview",
    opsNav.includes('label: "Portfolio Overview"'),
  );

  // Routes preserved
  for (const href of [
    "/admin/operations/today",
    "/admin/operations/executive",
    "/admin/operations/command",
    "/admin/operations/founder",
    "/admin/operations/founder-intelligence",
    "/admin/operations/brain",
    "/admin/work",
    "/admin/operations/clients",
    "/admin/operations/intelligence",
    "/admin/operations/review-inbox",
  ]) {
    check(`route preserved in nav: ${href}`, opsNav.includes(`"${href}"`));
  }

  // ── Search / identity ──────────────────────────────────────────────────────
  check(
    "default pinned shortcut leads with Today",
    shortcuts.includes('title: "Today"') &&
      shortcuts.includes('href: "/admin/operations/today"'),
  );
  check(
    "OS-level Command Center pin removed from defaults",
    !shortcuts.includes('title: "Command Center"'),
  );

  const founderDash = read("components/admin/founder/FounderDashboard.tsx");
  check(
    "FounderDashboard no longer brands Founder Studio as home",
    !founderDash.includes('eyebrow="Founder Studio"'),
  );
  check(
    "FounderDashboard uses Owner Snapshot identity",
    founderDash.includes('eyebrow="Owner Snapshot"'),
  );

  const founderIntel = read(
    "components/admin/operations/founder-intelligence/FounderIntelligenceScreen.tsx",
  );
  check(
    "Founder Intelligence morning-command home language removed",
    !founderIntel.includes("Morning command brief") &&
      !founderIntel.includes("morning command"),
  );

  // ── Docs ───────────────────────────────────────────────────────────────────
  check(
    "Phase 7 doc names Today as sole home",
    /sole home/i.test(phaseDoc),
  );
  check(
    "Phase 7 doc records Batch C implemented",
    phaseDoc.includes("Batch C ✅ implemented") ||
      phaseDoc.includes("Batch C — Home Policy Enforcement"),
  );
  check(
    "cognitive load rule captured in home policy or Phase 7 doc",
    homePolicy.includes("reducing cognitive load") ||
      phaseDoc.includes("reducing cognitive load"),
  );

  // ── Client Command preserved ───────────────────────────────────────────────
  const clientHub = read(
    "components/admin/operations/client-command/ClientCommandHub.tsx",
  );
  check(
    "Client Command Center name preserved (per-client HQ)",
    clientHub.includes("Client Command Center"),
  );

  console.log("\nPhase 7 Batch C home policy verification passed.\n");
}

main();
