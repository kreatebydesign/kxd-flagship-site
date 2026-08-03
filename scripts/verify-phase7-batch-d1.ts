/**
 * Phase 7 — Today | Batch D.1 — Founder experience recomposition checks.
 * Run: npm run verify:phase7-batch-d1
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  composeDaySentence,
  composeMomentumLine,
  composePostureLine,
  humanizePrimary,
  selectDecisionSignals,
} from "../lib/executive-today/recomposition.ts";

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
  console.log("\nPhase 7 Batch D.1 — founder experience recomposition\n");

  const postureCalm = composePostureLine({
    orientation: "clear",
    businessMomentum: "quiet",
    waitingCount: 0,
    isCalm: true,
  });
  check(
    "calm posture is human and confident",
    /good position|under control|steady/i.test(postureCalm) &&
      !/workable balance|capacity is available/i.test(postureCalm),
  );

  const day = composeDaySentence({
    orientation: "clear",
    scheduleCount: 0,
    waitingCount: 0,
    isCalm: true,
    happeningNow: null,
    nextCommitment: null,
  });
  check("open-day sentence avoids analytics tone", !/workable balance/i.test(day));

  const primary = humanizePrimary({
    title: "Continue planned work without forcing the calendar",
    detail: "Commitments are in workable balance.",
    href: "/admin/work",
    hrefLabel: "Open Work Engine",
    reason: "balanced day",
    from: "calm",
  });
  check(
    "robotic primary title rewritten",
    !/without forcing the calendar/i.test(primary.title),
  );
  check(
    "Work Engine CTA humanized",
    primary.hrefLabel === "Open Work" || primary.hrefLabel === "Begin",
  );

  const momentum = composeMomentumLine({
    businessMomentum: "steady",
    waitingCount: 0,
    priorityCount: 2,
    isCalm: false,
  });
  check("momentum line is emotional, not a KPI", !/\d+%|MRR|KPI/i.test(momentum));

  const signals = selectDecisionSignals([
    {
      id: "1",
      title: "Quiet note",
      meta: "",
      href: null,
      read: true,
      emphasis: "quiet",
    },
    {
      id: "2",
      title: "Client waiting",
      meta: "",
      href: "/admin/work",
      read: false,
      emphasis: "notable",
    },
  ]);
  check("decision signals prefer notable items", signals.length === 1 && signals[0].id === "2");

  const screen = read("components/admin/executive-today/ExecutiveTodayScreen.tsx");
  check("hero uses posture line as visual lead", screen.includes("posture-line"));
  check("primary CTA class present", screen.includes("kxd-exec-today__cta-link"));
  check("Waiting For You before Today's Flow", screen.indexOf("Waiting For You") < screen.indexOf("Today&apos;s Flow"));
  check("Signals section uses simplified titles", !screen.includes("What Changed"));
  check("no evidence dump in hero", !screen.includes("kxd-exec-today__evidence"));

  const load = read("lib/executive-today/load.ts");
  check(
    "recomposition uses existing waiting/blocked/reviews facts",
    load.includes("waitingOnKxd") && load.includes("reviewsWaiting") && load.includes("blockedItems"),
  );
  check(
    "recomposition attaches without replacing intelligence composition",
    load.includes("composeExecutiveIntelligence") &&
      load.includes("recomposeTodayExperience"),
  );

  console.log("\nPhase 7 Batch D.1 recomposition verification passed.\n");
}

main();
