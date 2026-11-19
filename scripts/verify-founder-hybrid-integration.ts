/**
 * Batch 2 — Founder Hybrid + Batch 1 integration (structural).
 *
 *   npx tsx scripts/verify-founder-hybrid-integration.ts
 */
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";

const root = process.cwd();
let failed = 0;

function check(label: string, pass: boolean, detail?: string) {
  console.log(pass ? `  ✔ ${label}` : `  ✗ ${label}${detail ? ` — ${detail}` : ""}`);
  if (!pass) failed += 1;
}

function read(rel: string) {
  return readFileSync(path.join(root, rel), "utf8");
}

console.log("\nFounder Hybrid — Batch 2 integration\n");

const flags = read("lib/admin/founder-hybrid/flags.ts");
check("founder hybrid flag exported", flags.includes("FOUNDER_HYBRID_SHELL_ENABLED"));

const nav = read("lib/admin/founder-hybrid/nav.ts");
check("seven-item primary nav defined", (nav.match(/FOUNDER_PRIMARY_NAV/g) ?? []).length >= 1);
check(
  "primary nav has seven items",
  nav.includes('label: "Today"') &&
    nav.includes('label: "Work"') &&
    nav.includes('label: "Clients"') &&
    nav.includes('label: "Sales"') &&
    nav.includes('label: "Finance"') &&
    nav.includes('label: "Team"') &&
    nav.includes('label: "Insights"'),
);

const opsLayout = read("app/admin/operations/layout.tsx");
check("founder hybrid css loaded in operations layout", opsLayout.includes("founder-hybrid.css"));

const shell = read("components/admin/operations/shared/OperationsShell.tsx");
check(
  "batch 1 frame + hybrid sidebar coexist",
  shell.includes("OperationsShellFrame") &&
    shell.includes("FounderHybridSidebarNav") &&
    shell.includes("FOUNDER_HYBRID_SHELL_ENABLED"),
);
check(
  "no duplicate shell when layout owns chrome",
  shell.includes('chrome?.mode === "layout"'),
);
check("mobile menu toggle present", shell.includes("kxd-founder-mobile-nav-toggle"));

const navActive = read("lib/admin/operations-nav-active.ts");
check(
  "today persistent under hybrid",
  navActive.includes("FOUNDER_HYBRID_SHELL_ENABLED") &&
    navActive.includes('/admin/operations/today"'),
);
check(
  "work and sales use founder persistent chrome",
  navActive.includes("isFounderPersistentChromeRoute") &&
    navActive.includes('"/admin/work"') &&
    navActive.includes('"/admin/sales"'),
);

const todayPage = read("app/admin/operations/(studio)/today/page.tsx");
check(
  "hybrid today mounts FounderHybridTodayScreen",
  todayPage.includes("FounderHybridTodayScreen") && todayPage.includes("OperationsShell"),
);

const hybridToday = read("components/admin/founder-hybrid/FounderHybridTodayScreen.tsx");
check("primary move marker restored", hybridToday.includes('data-today-primary-move="true"'));
check("begin the day calm CTA", hybridToday.includes("Begin the day"));
check("quiet exits restored", hybridToday.includes("TODAY_QUIET_EXITS"));
check("signals panel uses xp.signals", hybridToday.includes("xp.signals"));
check(
  "external calendar links open in new tab",
  hybridToday.includes('rel="noreferrer"') && hybridToday.includes('target="_blank"'),
);
check(
  "hybrid today does not mount its own OperationsShell frame",
  !hybridToday.includes("<OperationsShell"),
);

const studioLayout = read("app/admin/operations/(studio)/layout.tsx");
check("studio layout keeps StudioOperationsChrome", studioLayout.includes("StudioOperationsChrome"));

const scoped = read("lib/client-command/engine.ts");
check("batch 1 scoped intelligence preserved", scoped.includes("loadClientScopedIntelligenceContext"));

check("validation report archived", existsSync("docs/founder-hybrid-phase1/VALIDATION-REPORT.md"));

const workLayout = read("app/admin/work/layout.tsx");
const salesLayout = read("app/admin/sales/layout.tsx");
check(
  "work and sales layouts mount studio chrome",
  workLayout.includes("StudioOperationsChrome") &&
    salesLayout.includes("StudioOperationsChrome"),
);

console.log("");
if (failed > 0) {
  console.error(`FAILED ${failed} check(s)`);
  process.exit(1);
}
console.log("Founder Hybrid Batch 2 integration checks passed.");
assert.equal(failed, 0);