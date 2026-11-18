/**
 * Batch 3A — visual coherence (structural).
 */
import { readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
let failed = 0;

function check(label: string, pass: boolean, detail?: string) {
  console.log(pass ? `  ✔ ${label}` : `  ✗ ${label}${detail ? ` — ${detail}` : ""}`);
  if (!pass) failed += 1;
}

function read(rel: string) {
  return readFileSync(path.join(root, rel), "utf8");
}

console.log("\nBatch 3A — visual coherence\n");

const portfolio = read("components/admin/operations/client-portfolio/ClientPortfolioScreen.tsx");
check(
  "portfolio disables quick actions",
  portfolio.includes("showQuickActions={false}"),
);
check("portfolio uses founder clients surface", portfolio.includes("kxd-founder-clients"));
check("portfolio contextual launch control", portfolio.includes('href="/admin/operations/client-launch"'));

const work = read("components/admin/work/WorkPlanningClient.tsx");
check(
  "work skips nested exec shell in founder chrome",
  work.includes("if (embeddedInFounderChrome)") &&
    work.includes("return planningSurface") &&
    work.includes("ExecutiveWorkspaceShell workspaceId=\"work\""),
);

const css = read("design-system/os/styles/founder-hybrid.css");
check("shared founder page rhythm", css.includes(".kxd-founder-page"));
check("clients roster styles", css.includes(".kxd-founder-clients__row"));

const navActive = read("lib/admin/operations-nav-active.ts");
check(
  "persistent chrome defaults hide portfolio quick actions",
  navActive.includes("resolveStudioShowQuickActions") &&
    navActive.includes('pathname === "/admin/operations/clients"'),
);

console.log("");
if (failed > 0) {
  console.error(`FAILED ${failed} check(s)`);
  process.exit(1);
}
console.log("Batch 3A structural checks passed.");