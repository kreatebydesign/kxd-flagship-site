/**
 * Mission 002 — operator performance architecture checks (no DB).
 * Run: npx tsx scripts/verify-mission-02-operator-performance.ts
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";

const root = process.cwd();
let failed = 0;
function check(label: string, pass: boolean) {
  console.log(pass ? `  ✔ ${label}` : `  ✗ ${label}`);
  if (!pass) failed += 1;
}
function read(rel: string) {
  return readFileSync(path.join(root, rel), "utf8");
}

console.log("\nMission 002 — operator performance\n");

const workspace = read("lib/client-command/workspace-data.ts");
check(
  "workspace bundle parallelizes command center with commercial snapshots",
  workspace.includes("loadClientCommandCenter(clientId)") &&
    workspace.includes("loadClientFinancialSnapshot(clientId)") &&
    workspace.includes("await Promise.all([") &&
    workspace.includes("commandCenterPromise"),
);
check(
  "workspace no longer sequences proposals after financial after workboard",
  !workspace.includes("const proposalsSnapshot = await loadClientProposalsSnapshot"),
);

const hub = read("lib/client-command/hub.ts");
check(
  "client list does not load full intelligence universe",
  hub.includes("loadHealthContext") && !hub.includes("loadIntelligenceContext"),
);

const intel = read("lib/intelligence/context.ts");
check(
  "intelligence context is request-memoized",
  intel.includes("cache(loadIntelligenceContextUncached)"),
);

const auth = read("lib/admin/auth.ts");
check("admin session is request-memoized", auth.includes("cache(async function getPayloadAdminUser"));

const nav = read("components/admin/operations/shared/OperatorNavLink.tsx");
check("operator nav uses useLinkStatus acknowledgment", nav.includes("useLinkStatus"));
check("workspace tabs can soft-navigate without RSC refetch", nav.includes("onSoftNavigate"));
check("operator links prefetch full dynamic routes", nav.includes("prefetch"));

const loadingToday = read("app/admin/operations/today/loading.tsx");
check("today arrival loading remains for login handoff", loadingToday.includes("Entering your business"));

const css = read("design-system/os/styles/kxd-os.css");
check("pending links disable pointer events (double-click guard)", css.includes("pointer-events: none"));

console.log("");
if (failed > 0) {
  console.error(`FAILED ${failed} check(s)`);
  process.exit(1);
}
console.log("All Mission 002 checks passed.");
assert.equal(failed, 0);
