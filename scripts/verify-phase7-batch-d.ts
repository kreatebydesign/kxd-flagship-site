/**
 * Phase 7 — Today | Batch D / D.1 — Experience foundation + recomposition.
 * Static checks against Batch A section model. No database.
 *
 * Run: npm run verify:phase7-batch-d
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
  console.log("\nPhase 7 Batch D / D.1 — Today experience verification\n");

  const required = [
    "components/admin/executive-today/ExecutiveTodayScreen.tsx",
    "lib/executive-today/presentation.ts",
    "lib/executive-today/recomposition.ts",
    "lib/executive-today/load.ts",
    "lib/admin/home-policy.ts",
    "docs/PHASE-7-TODAY.md",
    "design-system/os/styles/kxd-os.css",
  ];
  for (const f of required) {
    check(`${f} exists`, existsSync(path.join(root, f)));
  }

  const screen = read("components/admin/executive-today/ExecutiveTodayScreen.tsx");
  const presentation = read("lib/executive-today/presentation.ts");
  const recomposition = read("lib/executive-today/recomposition.ts");
  const load = read("lib/executive-today/load.ts");
  const css = read("design-system/os/styles/kxd-os.css");
  const homePolicy = read("lib/admin/home-policy.ts");
  const phaseDoc = read("docs/PHASE-7-TODAY.md");
  const page = read("app/admin/operations/today/page.tsx");

  check(
    "Today page still renders ExecutiveTodayScreen",
    page.includes("ExecutiveTodayScreen") &&
      page.includes("loadExecutiveToday"),
  );
  check(
    "FOUNDER_HOME_PATH unchanged",
    homePolicy.includes('FOUNDER_HOME_PATH = "/admin/operations/today"'),
  );

  // Batch A hierarchy via D.1 composition
  check("hero / orientation present", screen.includes("kxd-exec-today__hero"));
  check(
    "Today's Focus present",
    screen.includes("Today&apos;s Focus") &&
      screen.includes("kxd-exec-today__section--primary"),
  );
  check("Waiting For You present", screen.includes("Waiting For You"));
  check("Today's Flow present", screen.includes("Today&apos;s Flow"));
  check("Momentum present", screen.includes("Momentum"));
  check("Signals present", screen.includes(">Signals<") || screen.includes("Signals"));
  check("Quiet exits present", screen.includes("TODAY_QUIET_EXITS"));
  check(
    "Batch A priorities retained as supporting desk list",
    screen.includes("Also on your desk") || screen.includes("My Priorities"),
  );

  check(
    "Quick Capture removed from Today composition",
    !screen.includes("ExecutiveTodayCapture") &&
      !screen.includes("Quick Capture"),
  );
  check(
    "Remaining day capacity section removed",
    !screen.includes("Remaining day") && !screen.includes("capacity.summary"),
  );
  check(
    "End of day closing removed from morning surface",
    !screen.includes("End of day") && !screen.includes("closing.successLooksLike"),
  );
  check(
    "No Connect seam on Today (Batch G reserved)",
    !screen.includes("/admin/connect"),
  );
  check(
    "No Business Snapshot on Today (Batch F reserved)",
    !screen.includes("Business Snapshot") && !screen.includes("Weekly Snapshot"),
  );

  check("priorities cap ≤5", presentation.includes("TODAY_PRIORITIES_LIMIT = 5"));
  check("schedule cap ≤5", presentation.includes("TODAY_SCHEDULE_LIMIT = 5"));
  check("signals cap ≤6", presentation.includes("TODAY_SIGNALS_LIMIT = 6"));
  check("exceptions cap ≤4", presentation.includes("TODAY_EXCEPTIONS_LIMIT = 4"));
  check(
    "loader applies presentation caps",
    load.includes("TODAY_PRIORITIES_LIMIT") &&
      load.includes("TODAY_SIGNALS_LIMIT") &&
      load.includes("TODAY_EXCEPTIONS_LIMIT"),
  );
  check(
    "loader attaches experience recomposition",
    load.includes("recomposeTodayExperience") && load.includes("experience:"),
  );

  check("Clear desk / waiting empty language", /waiting on you/i.test(recomposition));
  check(
    "COO posture language helpers present",
    recomposition.includes("composePostureLine") &&
      recomposition.includes("You're in a good position today."),
  );
  check(
    "Day flow period grouping present",
    recomposition.includes("Morning") &&
      recomposition.includes("Afternoon") &&
      recomposition.includes("Evening"),
  );
  check(
    "Robotic primary language rewritten at presentation layer",
    recomposition.includes("without forcing the calendar"),
  );

  for (const href of [
    "/admin/work",
    "/admin/operations/clients",
    "/admin/operations/review-inbox",
    "/admin/operations/focus",
  ]) {
    check(`quiet exit preserves ${href}`, presentation.includes(href));
  }

  check(
    "reduced motion respected in Today CSS",
    css.includes("prefers-reduced-motion") &&
      css.includes(".kxd-exec-today__enter"),
  );
  check("Today article has accessible label", screen.includes('aria-label="Today"'));
  check(
    "sections use aria-labelledby",
    (screen.match(/aria-labelledby=/g) ?? []).length >= 4,
  );
  check(
    "primary visual anchor + CTA styles present",
    css.includes("kxd-exec-today__primary-title") &&
      css.includes("kxd-exec-today__cta-link") &&
      css.includes("kxd-exec-today__posture-line"),
  );
  check(
    "quiet exits styles present",
    css.includes(".kxd-exec-today__exits") && css.includes(".kxd-exec-today__exit"),
  );
  check(
    "ExecutiveTodayCapture file retained (not mounted on Today)",
    existsSync(
      path.join(
        root,
        "components/admin/executive-today/ExecutiveTodayCapture.tsx",
      ),
    ),
  );

  check(
    "Phase 7 doc records Batch D / D.1",
    /Batch D/i.test(phaseDoc) &&
      (/D\.1/i.test(phaseDoc) || /recomposition/i.test(phaseDoc)),
  );
  check(
    "confidence rule documented",
    homePolicy.includes("creating more confidence") ||
      phaseDoc.includes("creating more confidence"),
  );
  check(
    "no decorative chart/KPI language in Today screen",
    !screen.includes("sparkline") &&
      !screen.includes("KPI") &&
      !screen.includes("AI chat"),
  );

  // First-viewport question order encoded in comments / structure
  check(
    "first-viewport order documented in screen",
    screen.includes("How is my business?") &&
      screen.includes("What deserves me first?") &&
      screen.includes("Who or what is waiting?") &&
      screen.includes("What does my day look like?"),
  );

  console.log("\nPhase 7 Batch D / D.1 Today experience verification passed.\n");
}

main();
