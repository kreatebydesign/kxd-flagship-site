/**
 * Batch 3D — Work usability (structural + pure helpers).
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  WORK_VIEW_OVERFLOW_IDS,
  WORK_VIEW_PRIMARY_IDS,
  workViewNavCount,
} from "@/lib/work/planning/view-navigation";
import { WORK_VIEW_IDS } from "@/lib/work/planning/types";
import { resolveWorkClientHref } from "@/lib/work/client-workspace-link";

const root = process.cwd();
let failed = 0;

function check(label: string, pass: boolean, detail?: string) {
  console.log(pass ? `  ✔ ${label}` : `  ✗ ${label}${detail ? ` — ${detail}` : ""}`);
  if (!pass) failed += 1;
}

function read(rel: string) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

console.log("\nBatch 3D — Work usability\n");

check("WorkPlanningViews mounted", read("components/admin/work/WorkPlanningClient.tsx").includes("WorkPlanningViews"));
check("mobile overflow control", read("components/admin/work/WorkPlanningViews.tsx").includes("More views"));
check("primary mobile views", WORK_VIEW_PRIMARY_IDS.join(",") === "today,overdue,waiting-on-client,all");
check("all ten views preserved", WORK_VIEW_IDS.length === 10);
check(
  "overflow covers remaining views",
  WORK_VIEW_OVERFLOW_IDS.length === 6 &&
    WORK_VIEW_OVERFLOW_IDS.every((id) => WORK_VIEW_IDS.includes(id)),
);
check("client command link in row", read("components/admin/work/WorkPlanningRow.tsx").includes("client--linked"));
check(
  "restricted staff hides client links",
  read("app/admin/work/page.tsx").includes('clientLinkMode = "none"'),
);
check("composeWorkView unchanged entry", read("lib/work/planning/query.ts").includes("composeWorkView"));
check("filters client-side", read("components/admin/work/WorkPlanningClient.tsx").includes("composeWorkView"));

const counts = {
  today: 1,
  inbox: 0,
  upcoming: 0,
  overdue: 2,
  "waiting-on-client": 3,
  "waiting-on-kxd": 4,
  blocked: 0,
  review: 0,
  completed: 0,
  all: 10,
} as Record<(typeof WORK_VIEW_IDS)[number], number>;
assert.equal(workViewNavCount("waiting-on-client", counts), 3);
check(
  "waiting badge client-only on primary tab",
  workViewNavCount("waiting-on-client", counts) === 3,
);
check(
  "compact waiting label",
  read("lib/work/planning/view-navigation.ts").includes('"Waiting on client"'),
);

const href = resolveWorkClientHref(
  { clientId: 12, clientSuccessHref: "/admin/operations/client-success/12" },
  "client-command",
);
check("client command href", href === "/admin/operations/client-command/12", href ?? "");

console.log("");
if (failed > 0) {
  console.error(`FAILED ${failed} check(s)`);
  process.exit(1);
}
console.log("Batch 3D Work checks passed.");