/**
 * Batch 3C — Today hierarchy (structural + pure helpers).
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  isUrgentCommercial,
  partitionWaitingForAttention,
} from "@/lib/executive-today/founder-today-sections";

const root = process.cwd();
let failed = 0;

function check(label: string, pass: boolean, detail?: string) {
  console.log(pass ? `  ✔ ${label}` : `  ✗ ${label}${detail ? ` — ${detail}` : ""}`);
  if (!pass) failed += 1;
}

function read(rel: string) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

console.log("\nBatch 3C — Founder Today\n");

check("loadExecutiveToday unchanged entry", read("app/admin/operations/(studio)/today/page.tsx").includes("loadExecutiveToday"));
check("recompose path preserved", read("lib/executive-today/load.ts").includes("recomposeTodayExperience"));
check("WhyThisDisclosure on Today", read("components/admin/founder-hybrid/FounderHybridTodayScreen.tsx").includes("WhyThisDisclosure"));
check("primary move marker", read("components/admin/founder-hybrid/FounderHybridTodayScreen.tsx").includes('data-today-primary-move="true"'));
check("needs attention section", read("components/admin/founder-hybrid/FounderHybridTodayScreen.tsx").includes("Needs your attention"));
check("clients attention link", read("components/admin/founder-hybrid/FounderHybridTodayScreen.tsx").includes("/admin/operations/clients?view=attention"));
check("xp.signals used", read("components/admin/founder-hybrid/FounderHybridTodayScreen.tsx").includes("xp.signals"));
check("no new portfolio loader on Today", !read("app/admin/operations/(studio)/today/page.tsx").includes("loadExecutiveClients"));

check("urgent commercial detection", isUrgentCommercial("overdue") && !isUrgentCommercial("stale"));
const split = partitionWaitingForAttention([
  { id: "blocked-1", title: "A", meta: "Client · blocked", href: null },
  { id: "review-1", title: "B", meta: "", href: null },
]);
assert.equal(split.team.length, 1);
assert.equal(split.attention.length, 2);
check("blocked stays in attention and team", split.attention.some((i) => i.id === "blocked-1"));
check("teamContextMeta", read("lib/executive-today/founder-today-sections.ts").includes("teamContextMeta"));

console.log("");
if (failed > 0) {
  console.error(`FAILED ${failed} check(s)`);
  process.exit(1);
}
console.log("Batch 3C Today checks passed.");