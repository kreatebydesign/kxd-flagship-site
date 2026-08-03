/**
 * Phase 7 — Today | Batch D — Experience foundation verification.
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
  console.log("\nPhase 7 Batch D — Today experience verification\n");

  const required = [
    "components/admin/executive-today/ExecutiveTodayScreen.tsx",
    "lib/executive-today/presentation.ts",
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
  const load = read("lib/executive-today/load.ts");
  const css = read("design-system/os/styles/kxd-os.css");
  const homePolicy = read("lib/admin/home-policy.ts");
  const phaseDoc = read("docs/PHASE-7-TODAY.md");
  const page = read("app/admin/operations/today/page.tsx");

  // Home ownership still Today
  check(
    "Today page still renders ExecutiveTodayScreen",
    page.includes("ExecutiveTodayScreen") &&
      page.includes("loadExecutiveToday"),
  );
  check(
    "FOUNDER_HOME_PATH unchanged",
    homePolicy.includes('FOUNDER_HOME_PATH = "/admin/operations/today"'),
  );

  // Batch A section model present
  check("hero / orientation present", screen.includes("kxd-exec-today__hero"));
  check(
    "Today's Focus / Do this first present",
    screen.includes("Today&apos;s Focus") && screen.includes("Do this first"),
  );
  check("My Priorities present", screen.includes("My Priorities"));
  check("Today's Schedule present", screen.includes("Today&apos;s Schedule"));
  check("Needs Judgment conditional", screen.includes("Needs Judgment"));
  check("What Changed present", screen.includes("What Changed"));
  check("Quiet exits present", screen.includes("TODAY_QUIET_EXITS"));

  // Cognitive load removals from morning surface
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
    !screen.includes("/admin/connect") && !screen.includes("Connect"),
  );
  check(
    "No Business Snapshot on Today (Batch F reserved)",
    !screen.includes("Business Snapshot") && !screen.includes("Weekly Snapshot"),
  );

  // Caps
  check(
    "priorities cap ≤5",
    presentation.includes("TODAY_PRIORITIES_LIMIT = 5"),
  );
  check(
    "schedule cap ≤5",
    presentation.includes("TODAY_SCHEDULE_LIMIT = 5"),
  );
  check(
    "signals cap ≤6",
    presentation.includes("TODAY_SIGNALS_LIMIT = 6"),
  );
  check(
    "exceptions cap ≤4",
    presentation.includes("TODAY_EXCEPTIONS_LIMIT = 4"),
  );
  check(
    "loader applies presentation caps",
    load.includes("TODAY_PRIORITIES_LIMIT") &&
      load.includes("TODAY_SIGNALS_LIMIT") &&
      load.includes("TODAY_EXCEPTIONS_LIMIT"),
  );

  // Empty-state philosophy
  check(
    "Clear desk empty language",
    presentation.includes("Clear desk"),
  );
  check(
    "Quiet signals empty language",
    presentation.includes("Quiet.") || presentation.includes("Quiet "),
  );
  check(
    "Schedule open-day empty language",
    presentation.includes("day is open"),
  );
  check(
    "screen uses calm empty constants",
    screen.includes("TODAY_EMPTY.priorities") &&
      screen.includes("TODAY_EMPTY.schedule"),
  );

  // Quiet exits destinations
  for (const href of [
    "/admin/work",
    "/admin/operations/clients",
    "/admin/operations/review-inbox",
    "/admin/operations/focus",
  ]) {
    check(`quiet exit preserves ${href}`, presentation.includes(href));
  }

  // Motion / a11y
  check(
    "reduced motion respected in Today CSS",
    css.includes("prefers-reduced-motion") &&
      css.includes(".kxd-exec-today__enter"),
  );
  check(
    "Today article has accessible label",
    screen.includes('aria-label="Today"'),
  );
  check(
    "sections use aria-labelledby",
    (screen.match(/aria-labelledby=/g) ?? []).length >= 4,
  );

  // Visual hierarchy helpers
  check(
    "primary visual anchor styles present",
    css.includes("kxd-exec-today__primary-title") &&
      css.includes("kxd-exec-today__eyebrow"),
  );
  check(
    "quiet exits styles present",
    css.includes(".kxd-exec-today__exits") &&
      css.includes(".kxd-exec-today__exit"),
  );

  // Capture component retained for workspace hosts (not deleted)
  check(
    "ExecutiveTodayCapture file retained (not mounted on Today)",
    existsSync(
      path.join(
        root,
        "components/admin/executive-today/ExecutiveTodayCapture.tsx",
      ),
    ),
  );

  // Docs
  check(
    "Phase 7 doc records Batch D",
    /Batch D/i.test(phaseDoc) &&
      (/implemented/i.test(phaseDoc) || /experience/i.test(phaseDoc)),
  );
  check(
    "confidence rule documented",
    homePolicy.includes("creating more confidence") ||
      phaseDoc.includes("creating more confidence"),
  );

  // No AI / notifications / charts invented in screen
  check(
    "no decorative chart/KPI language in Today screen",
    !screen.includes("sparkline") &&
      !screen.includes("KPI") &&
      !screen.includes("AI chat"),
  );

  console.log("\nPhase 7 Batch D Today experience verification passed.\n");
}

main();
