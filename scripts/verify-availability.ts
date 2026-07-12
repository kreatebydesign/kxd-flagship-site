/**
 * Phase 25E — Permanent availability regression suite.
 * Run: npm run verify:availability
 *
 * Live calendar probes (read-only):
 *   npm run verify:availability:live
 */

import path from "node:path";
import { fileURLToPath } from "node:url";
import { runAvailabilityRegressionSuite } from "../lib/scheduling/availability/validation/suite.ts";
import {
  buildAvailabilityValidationReport,
  formatValidationReportText,
} from "../lib/scheduling/availability/validation/report.ts";
import {
  buildFreeWindows,
  generateCandidateSlots,
} from "../lib/scheduling/availability/candidate-slots.ts";
import { resolveWorkingHoursPolicy } from "../lib/scheduling/availability/working-windows.ts";
import {
  mondayRange,
  VALIDATION_TZ,
} from "../lib/scheduling/availability/validation/scenarios.ts";

console.log("Phase 25E — Availability validation / regression suite\n");

const suite = runAvailabilityRegressionSuite();

for (const c of suite.cases) {
  const mark = c.status === "passed" ? "✓" : c.status === "skipped" ? "○" : "✗";
  console.log(`${mark} ${c.id} — ${c.title}`);
  for (const a of c.assertions) {
    console.log(`    ${a.passed ? "✓" : "✗"} ${a.label}`);
  }
  for (const n of c.notes) {
    console.log(`    note: ${n}`);
  }
}

console.log(
  `\nSuite: ${suite.passed} passed, ${suite.failed} failed, ${suite.skipped} skipped`,
);
console.log(`writeEnabled: ${suite.writeEnabled}`);

{
  const range = mondayRange();
  const hours = resolveWorkingHoursPolicy({ timeZone: VALIDATION_TZ });
  const result = generateCandidateSlots({
    range,
    durationMinutes: 60,
    timeZone: VALIDATION_TZ,
    workingHours: hours,
    busyBlocks: [],
    limit: 3,
  });
  const { workingWindows } = buildFreeWindows({
    range,
    durationMinutes: 60,
    timeZone: VALIDATION_TZ,
    workingHours: hours,
    busyBlocks: [],
  });
  const report = buildAvailabilityValidationReport({
    mode: "synthetic",
    result,
    workingWindows,
    calendarConnected: false,
    hasCalendarId: false,
    durationMinutes: 60,
  });
  console.log("\n── Sample synthetic validation report ──");
  console.log(
    formatValidationReportText(report).split("\n").slice(0, 18).join("\n"),
  );
  console.log("  …");
}

if (suite.failed > 0) {
  process.exit(1);
}

const wantLive =
  process.env.VERIFY_AVAILABILITY_LIVE === "1" ||
  process.argv.includes("--live");

if (wantLive) {
  console.log("\n── Live calendar validation (read-only) ──");
  if (process.env.KXD_SERVER_ONLY_SHIM !== "1") {
    console.error(
      "Live mode requires the server-only shim. Use: npm run verify:availability:live",
    );
    process.exit(1);
  }
  await runLive();
} else {
  console.log(
    "\n(Skipping live — run: npm run verify:availability:live)",
  );
  console.log(
    "Admin endpoints: GET /api/admin/calendar/availability/validation/suite",
  );
  console.log(
    "                 GET /api/admin/calendar/availability/validation/live",
  );
}

console.log("\nNo calendar writes. Availability validation OK.");

async function runLive(): Promise<void> {
  const { loadEnv } = await import("payload/node");
  const dirname = path.dirname(fileURLToPath(import.meta.url));
  loadEnv(path.resolve(dirname, ".."));

  try {
    const { runLiveAvailabilityValidation, formatLiveValidationText } =
      await import("../lib/scheduling/availability/validation/live.ts");

    const live = await runLiveAvailabilityValidation({ horizonDays: 7 });
    console.log(formatLiveValidationText(live));

    let liveFailed = 0;
    const assert = (ok: boolean, label: string) => {
      if (ok) console.log(`  ✓ ${label}`);
      else {
        liveFailed += 1;
        console.error(`  ✗ ${label}`);
      }
    };

    assert(live.writeEnabled === false, "writeEnabled is false");
    assert(live.privateDataExposed === false, "no private data exposed");
    assert(live.calendarConnected, "calendar connected (refresh token present)");
    assert(
      live.calendarAvailabilityAssessed,
      "calendar availability assessed via free/busy",
    );
    assert(live.probes.length >= 5, "duration + five-window probes ran");
    assert(Boolean(live.reports.today), "today report present");
    assert(Boolean(live.reports.tomorrow), "tomorrow report present");
    assert(Boolean(live.reports.week), "week report present");
    assert(
      !JSON.stringify(live).toLowerCase().includes("client_secret"),
      "no client_secret in output",
    );
    assert(
      !JSON.stringify(live).toLowerCase().includes("refresh_token"),
      "no refresh_token in output",
    );

    const blob = JSON.stringify(live);
    assert(!blob.includes('"attendees"'), "no attendees field");
    assert(!blob.includes('"description"'), "no description field");
    assert(!blob.includes('"location"'), "no location field");

    if (liveFailed > 0) process.exit(1);
    console.log("\nLive validation against connected calendar succeeded.");
  } catch (err) {
    console.error(
      "Live validation failed:",
      err instanceof Error ? err.message : String(err),
    );
    process.exit(1);
  }
}
