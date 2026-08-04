/**
 * Experience Refinement Phase 2 — Batch B
 * Arrival → Today Emotional Arc (static + presentation checks).
 *
 * Run: npm run verify:experience-phase2-batch-b
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  composeDayShapeLine,
  composePostureLine,
  humanizePrimary,
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
  console.log("\nExperience Phase 2 Batch B — Arrival → Today Emotional Arc\n");

  const required = [
    "docs/KXD-OS-CONSTITUTION.md",
    "docs/PHASE-2-EXPERIENCE-REFINEMENT.md",
    "components/admin/KxdAdminLoginView.tsx",
    "components/admin/KxdAdminLoginForm.tsx",
    "components/admin/PayloadLogo.tsx",
    "components/admin/executive-today/ExecutiveTodayScreen.tsx",
    "app/admin/operations/today/loading.tsx",
    "lib/executive-today/recomposition.ts",
    "lib/admin/home-policy.ts",
  ];
  for (const f of required) {
    check(`${f} exists`, existsSync(path.join(root, f)));
  }

  const constitution = read("docs/KXD-OS-CONSTITUTION.md");
  const phaseDoc = read("docs/PHASE-2-EXPERIENCE-REFINEMENT.md");
  const loginView = read("components/admin/KxdAdminLoginView.tsx");
  const loginForm = read("components/admin/KxdAdminLoginForm.tsx");
  const logo = read("components/admin/PayloadLogo.tsx");
  const screen = read("components/admin/executive-today/ExecutiveTodayScreen.tsx");
  const loading = read("app/admin/operations/today/loading.tsx");
  const recomposition = read("lib/executive-today/recomposition.ts");
  const header = read("components/admin/executive-workspace/ExecutiveHeader.tsx");
  const homePolicy = read("lib/admin/home-policy.ts");
  const page = read("app/admin/operations/today/page.tsx");
  const legacyToday = existsSync(
    path.join(root, "components/admin/operations/today/TodayScreen.tsx"),
  )
    ? read("components/admin/operations/today/TodayScreen.tsx")
    : "";

  check(
    "Constitution Held clarity present",
    /Held clarity/i.test(constitution),
  );
  check(
    "Phase 2 Batch B documented",
    /Batch B/i.test(phaseDoc) && /Arrival → Today/i.test(phaseDoc),
  );

  check(
    "founder home remains Today",
    homePolicy.includes('FOUNDER_HOME_PATH = "/admin/operations/today"'),
  );
  check(
    "login lands on Today via OPERATIONS_HOME_PATH",
    loginForm.includes("OPERATIONS_HOME_PATH") &&
      loginView.includes("OPERATIONS_HOME_PATH"),
  );
  check(
    "auth still uses Payload users/login",
    loginForm.includes("/login") && loginForm.includes("setUser"),
  );
  check(
    "login feels KXD not CMS marketing",
    logo.includes("Your private studio") &&
      !logo.includes("Creative Operations Platform") &&
      loginView.includes("Enter your business"),
  );
  check(
    "login CTA is Enter not product marketing",
    loginForm.includes('"Enter"') || loginForm.includes(">Enter<"),
  );

  check(
    "Today page still ExecutiveTodayScreen",
    page.includes("ExecutiveTodayScreen") && page.includes("loadExecutiveToday"),
  );
  check(
    "arrival loading exists",
    loading.includes("Entering your business") &&
      loading.includes("kxd-today-arrival-loading"),
  );

  check(
    "first viewport primary move marker",
    screen.includes('data-today-primary-move="true"') &&
      screen.includes("Do this first"),
  );
  check(
    "Morning Answer / posture lead",
    screen.includes("posture-line") && recomposition.includes("Morning Answer"),
  );
  check(
    "shape of day present",
    screen.includes("dayShapeLine") || screen.includes("day-shape"),
  );
  check(
    "waiting omitted when empty (silence)",
    screen.includes("hasWaiting") &&
      screen.includes("Waiting For You") &&
      !screen.includes("xp.waitingEmpty"),
  );
  check(
    "no Quick Actions grid on Today screen",
    !screen.includes("OpsQuickGrid") && !screen.includes("Quick Actions"),
  );
  check(
    "no KPI strip on Today screen",
    !screen.includes("OpsKpiStrip") && !screen.includes("KPI"),
  );
  check(
    "no competing home language on Today",
    !/command center|cockpit|executive home/i.test(screen),
  );
  check(
    "no new recommendation engine",
    !recomposition.includes("openai") &&
      !recomposition.includes("generateText") &&
      recomposition.includes("Presentation-only"),
  );

  check(
    "arrival header restrains chrome",
    header.includes("arrival") &&
      header.includes("kxd-exec-header--arrival") &&
      header.includes("ARRIVAL_IDENTITY_LABEL"),
  );

  // Presentation logic — Morning Answer
  const calm = composePostureLine({
    orientation: "clear",
    businessMomentum: "quiet",
    waitingCount: 0,
    isCalm: true,
  });
  check(
    "calm Morning Answer tone",
    /clear this morning|nothing urgent/i.test(calm) &&
      !/workable balance|system healthy|critical alerts/i.test(calm),
  );

  const waitingTwo = composePostureLine({
    orientation: "balanced",
    businessMomentum: "steady",
    waitingCount: 2,
    isCalm: false,
  });
  check(
    "waiting Morning Answer grounded",
    /two decisions/i.test(waitingTwo),
  );

  const shape = composeDayShapeLine({
    orientation: "clear",
    scheduleCount: 0,
    calendarAvailable: true,
  });
  check("spacious day shape", /spacious/i.test(shape));

  const primary = humanizePrimary({
    title: "Continue planned work without forcing the calendar",
    detail: "Commitments are in workable balance.",
    href: "/admin/work",
    hrefLabel: "Open Work Engine",
    reason: "balanced day",
    from: "calm",
  });
  check(
    "primary action human language",
    !/Work Engine|View Dashboard|Go to Operations|Manage Items/i.test(
      primary.hrefLabel ?? "",
    ),
  );

  if (legacyToday) {
    check(
      "legacy dashboard TodayScreen not mounted by page",
      !page.includes("TodayScreen") || page.includes("ExecutiveTodayScreen"),
    );
  }

  check(
    "Constitution referenced in Batch B surfaces",
    screen.includes("Constitution") ||
      screen.includes("Experience Refinement Phase 2 Batch B"),
  );

  console.log("\nExperience Phase 2 Batch B verification passed.\n");
}

main();
