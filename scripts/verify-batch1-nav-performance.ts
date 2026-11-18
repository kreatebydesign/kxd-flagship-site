/**
 * Batch 1 — navigation performance foundation checks (no DB).
 * Run: npx tsx scripts/verify-batch1-nav-performance.ts
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

console.log("\nBatch 1 — navigation performance foundation\n");

const navActive = read("lib/admin/operations-nav-active.ts");
check(
  "ritual routes excluded from persistent chrome",
  navActive.includes("isStudioRitualRoute") && navActive.includes("/admin/operations/today"),
);
check(
  "client command resolves clients active id",
  navActive.includes("client-command") && navActive.includes('"clients"'),
);

const chrome = read("components/admin/operations/shared/StudioOperationsChrome.tsx");
check("studio chrome uses pathname defaults", chrome.includes("usePathname"));
check("persistent chrome wraps OperationsShellFrame", chrome.includes("OperationsShellFrame"));

const payload = read("lib/payload/get-payload.ts");
check("shared payload is react-cached", payload.includes("cache(") && payload.includes("getSharedPayload"));

check(
  "clients loading boundary exists",
  read("app/admin/operations/(studio)/clients/loading.tsx").includes("kxd-os-page-loading"),
);
check(
  "client workspace loading boundary exists",
  read("app/admin/operations/(studio)/client-command/[clientId]/loading.tsx").includes(
    "Opening client workspace",
  ),
);
check("work loading boundary exists", read("app/admin/work/loading.tsx").includes("Loading work"));

const measure = read("scripts/measure-operator-navigation.ts");
check("measure script documents live + structural modes", measure.includes("structural"));

console.log("");
if (failed > 0) {
  console.error(`FAILED ${failed} check(s)`);
  process.exit(1);
}
console.log("All Batch 1 structural checks passed.");
assert.equal(failed, 0);