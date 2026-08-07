/**
 * Static safety verification for junior shift correction hardening.
 * Run: npm run verify:junior-shift-correction-safety
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

import {
  assertMondayIncidentWeek,
  parseRepairArgs,
} from "../lib/junior-creators/repair-shift-credit-args.ts";

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(path.join(root, rel), "utf8");
}

const repairScript = read("scripts/reset-junior-shift-credit.ts");
const repairArgs = read("lib/junior-creators/repair-shift-credit-args.ts");
const route = read("app/api/admin/junior-creator-shifts/route.ts");
const txnHelper = read("lib/junior-creators/shift-correction-transaction.ts");

assert.equal(
  repairScript.includes("getWeekKey(new Date())") ||
    repairScript.includes("getWeekKey(now)"),
  false,
  "repair must not derive incident week from current date",
);
assert.match(repairArgs, /--harlow-incident-week/);
assert.match(repairArgs, /--sasha-incident-week/);
assert.match(repairArgs, /--incident-week/);
assert.match(repairScript, /parseRepairArgs/);
assert.match(repairScript, /assertSnapshotMatches/);
assert.match(repairScript, /loadShiftExact/);
assert.match(repairScript, /withJuniorShiftCorrectionTransaction/);
assert.match(repairScript, /Preflight snapshots matched/);
assert.match(repairScript, /harlowIncidentWeek/);
assert.match(repairScript, /sashaIncidentWeek/);

assert.doesNotThrow(() => assertMondayIncidentWeek("2026-07-27"));
assert.throws(() => assertMondayIncidentWeek("2026-07-28"), /Monday/);
assert.throws(() => parseRepairArgs([]), /incident-week/);

const sampleSnapshot = JSON.stringify({
  shiftId: 12,
  juniorId: 3,
  status: "active",
  startedAt: "2026-07-28T17:00:00.000Z",
  endedAt: null,
  totalMinutes: 0,
  hourlyRateCents: 800,
  payAdjustmentCents: 0,
});

assert.throws(
  () =>
    parseRepairArgs([
      "--incident-week=2026-07-27",
      `--harlow-snapshot=${sampleSnapshot}`,
    ]),
  /sasha-snapshot/,
);

const parsedShared = parseRepairArgs([
  "--incident-week=2026-07-27",
  `--harlow-snapshot=${sampleSnapshot}`,
  `--sasha-snapshot=${sampleSnapshot.replace('"shiftId":12', '"shiftId":13').replace('"juniorId":3', '"juniorId":4')}`,
]);
assert.equal(parsedShared.harlowIncidentWeek, "2026-07-27");
assert.equal(parsedShared.sashaIncidentWeek, "2026-07-27");
assert.equal(parsedShared.harlow.shiftId, 12);
assert.equal(parsedShared.sasha.shiftId, 13);
assert.equal(parsedShared.apply, false);

const parsedSplit = parseRepairArgs([
  "--harlow-incident-week=2026-08-03",
  "--sasha-incident-week=2026-06-22",
  `--harlow-snapshot=${sampleSnapshot}`,
  `--sasha-snapshot=${sampleSnapshot.replace('"shiftId":12', '"shiftId":13').replace('"juniorId":3', '"juniorId":4')}`,
]);
assert.equal(parsedSplit.harlowIncidentWeek, "2026-08-03");
assert.equal(parsedSplit.sashaIncidentWeek, "2026-06-22");

assert.throws(
  () =>
    parseRepairArgs([
      "--harlow-incident-week=2026-08-03",
      `--harlow-snapshot=${sampleSnapshot}`,
      `--sasha-snapshot=${sampleSnapshot.replace('"shiftId":12', '"shiftId":13')}`,
    ]),
  /both --harlow-incident-week and --sasha-incident-week/,
);

assert.match(txnHelper, /FOR UPDATE/);
assert.match(txnHelper, /lockJuniorShiftRowsForUpdate/);
assert.match(txnHelper, /sort\(/);
assert.match(txnHelper, /initTransaction/);
assert.match(txnHelper, /commitTransaction/);
assert.match(txnHelper, /killTransaction/);
assert.match(txnHelper, /beginCorrectionTransaction/);
assert.match(txnHelper, /rollbackCorrectionTransaction/);

assert.match(route, /withJuniorShiftCorrectionTransaction/);
assert.match(route, /req: txReq/);
assert.match(route, /action === "void"/);
assert.match(route, /action === "adjustMinutes"/);
assert.match(route, /action === "updateNotes"/);

assert.match(repairScript, /findByID/);
assert.equal(
  /status:\s*\{\s*in:\s*\[\s*["']active["']\s*,\s*["']completed["']/.test(repairScript),
  false,
  "repair must not use broad status/week queries for targets",
);

console.log("Junior shift correction safety verification passed.");
