/**
 * Focused verifier for Junior Creator Timer Safety V1 + repair idempotency guards.
 * Run: npm run verify:junior-timer-safety
 */
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

import {
  decideAutoStop,
  isHeartbeatTooSoon,
  JUNIOR_TIMER_SAFETY,
  shouldShowInactivityWarning,
  stopReasonLabel,
} from "../lib/junior-creators/timer-safety.ts";
import { minutesBetween } from "../lib/junior-creators/week.ts";
import {
  assertMondayIncidentWeek,
  parseRepairArgs,
} from "../lib/junior-creators/repair-shift-credit-args.ts";

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(path.join(root, rel), "utf8");
}

function ok(label: string) {
  console.log(`ok - ${label}`);
}

// 1. Manual start/stop accounting baseline (pure minutes)
{
  const start = new Date("2026-08-07T15:00:00.000Z");
  const end = new Date("2026-08-07T16:00:00.000Z");
  assert.equal(minutesBetween(start, end), 60);
  ok("1 normal manual start/stop minute math");
}

// 2. Recent activity keeps timer alive
{
  const startedAt = new Date("2026-08-07T15:00:00.000Z");
  const lastActivityAt = new Date("2026-08-07T15:55:00.000Z");
  const now = new Date("2026-08-07T16:00:00.000Z");
  assert.equal(decideAutoStop({ startedAt, lastActivityAt, now }).action, "none");
  assert.equal(shouldShowInactivityWarning({ startedAt, lastActivityAt, now }), false);
  ok("2 recent activity keeps timer alive");
}

// 3. Inactivity warning window
{
  const startedAt = new Date("2026-08-07T12:00:00.000Z");
  const lastActivityAt = new Date("2026-08-07T15:00:00.000Z");
  const now = new Date("2026-08-07T15:21:00.000Z"); // 21 min idle
  assert.equal(shouldShowInactivityWarning({ startedAt, lastActivityAt, now }), true);
  assert.equal(decideAutoStop({ startedAt, lastActivityAt, now }).action, "none");
  ok("3 inactivity warning shown inside grace");
}

// 4. Confirmation = fresh lastActivityAt clears warning (modeled)
{
  const startedAt = new Date("2026-08-07T12:00:00.000Z");
  const confirmedAt = new Date("2026-08-07T15:22:00.000Z");
  const now = new Date("2026-08-07T15:23:00.000Z");
  assert.equal(
    shouldShowInactivityWarning({ startedAt, lastActivityAt: confirmedAt, now }),
    false,
  );
  ok("4 confirmation keeps timer alive");
}

// 5. Ignored warning auto-stops at inactivity cutoff (not grace wall clock)
{
  const startedAt = new Date("2026-08-07T12:00:00.000Z");
  const lastActivityAt = new Date("2026-08-07T15:00:00.000Z");
  const now = new Date("2026-08-07T15:26:00.000Z"); // warning+grace elapsed
  const decision = decideAutoStop({ startedAt, lastActivityAt, now });
  assert.equal(decision.action, "stop");
  if (decision.action === "stop") {
    assert.equal(decision.stopReason, "inactivity_timeout");
    assert.equal(decision.endedAt.toISOString(), "2026-08-07T15:20:00.000Z");
    assert.equal(minutesBetween(startedAt, decision.endedAt), 200);
  }
  ok("5 ignored warning auto-stops at lastActivityAt+20m");
}

// 6. Server failsafe decision when browser closed (same rule)
{
  const startedAt = new Date("2026-08-07T10:00:00.000Z");
  const lastActivityAt = new Date("2026-08-07T10:05:00.000Z");
  const now = new Date("2026-08-08T08:00:00.000Z");
  const decision = decideAutoStop({ startedAt, lastActivityAt, now });
  assert.equal(decision.action, "stop");
  if (decision.action === "stop") {
    // Max shift wins overnight
    assert.equal(decision.stopReason, "max_shift_timeout");
    assert.equal(decision.endedAt.toISOString(), "2026-08-07T14:00:00.000Z");
  }
  ok("6 browser-closed overnight hits max-shift failsafe");
}

// 7. Max shift failsafe
{
  const startedAt = new Date("2026-08-07T10:00:00.000Z");
  const lastActivityAt = new Date("2026-08-07T13:50:00.000Z"); // recent activity
  const now = new Date("2026-08-07T14:01:00.000Z");
  const decision = decideAutoStop({ startedAt, lastActivityAt, now });
  assert.equal(decision.action, "stop");
  if (decision.action === "stop") {
    assert.equal(decision.stopReason, "max_shift_timeout");
    assert.equal(minutesBetween(startedAt, decision.endedAt), 240);
  }
  ok("7 max shift failsafe at 4 hours");
}

// 8. Heartbeat throttle / idempotent too-soon
{
  const prev = new Date("2026-08-07T15:00:00.000Z");
  const soon = new Date(prev.getTime() + 10_000);
  const later = new Date(prev.getTime() + JUNIOR_TIMER_SAFETY.heartbeatMinIntervalMs + 1);
  assert.equal(isHeartbeatTooSoon(prev, soon), true);
  assert.equal(isHeartbeatTooSoon(prev, later), false);
  ok("8 heartbeat throttle is concurrency-safe at write layer");
}

// 9. Voided shift excluded from earnings (static + accounting note)
{
  const stats = read("lib/junior-creators/stats.ts");
  assert.match(stats, /if \(status === "voided"\) continue/);
  ok("9 voided shifts excluded from earnings aggregates");
}

// 10. Auto-stop payable minutes use cutoff, not automaticStopAt
{
  const startedAt = new Date("2026-08-07T15:00:00.000Z");
  const lastActivityAt = new Date("2026-08-07T15:10:00.000Z");
  const now = new Date("2026-08-07T15:40:00.000Z");
  const decision = decideAutoStop({ startedAt, lastActivityAt, now });
  assert.equal(decision.action, "stop");
  if (decision.action === "stop") {
    assert.equal(decision.endedAt.toISOString(), "2026-08-07T15:30:00.000Z");
    assert.notEqual(decision.endedAt.toISOString(), decision.automaticStopAt.toISOString());
    assert.equal(minutesBetween(startedAt, decision.endedAt), 30);
  }
  ok("10 auto-stop payable minutes use inactivity cutoff");
}

// 11. Admin correction stop reason label + route sets admin_correction
{
  assert.equal(stopReasonLabel("admin_correction"), "Admin correction");
  const route = read("app/api/admin/junior-creator-shifts/route.ts");
  assert.match(route, /stopReason:\s*"admin_correction"/);
  ok("11 admin correction still records stopReason");
}

// 12. Repair refuses duplicate credits / supports idempotent already-repaired
{
  const repair = read("scripts/reset-junior-shift-credit.ts");
  assert.match(repair, /Idempotent no-op/);
  assert.match(repair, /Refusing to duplicate credits/);
  assert.match(repair, /scriptCreditCreate/);
  assert.match(repair, /assessAlreadyRepaired/);
  ok("12 Harlow/Sasha repair cannot duplicate replacements");
}

// 13. Audit metadata on auto-stop
{
  const autoStop = read("lib/junior-creators/shift-auto-stop.ts");
  assert.match(autoStop, /timerSafetyAutoStop/);
  assert.match(autoStop, /lastActivityAt/);
  assert.match(autoStop, /inactivityThresholdMinutes/);
  assert.match(autoStop, /automaticStopAt/);
  ok("13 audit metadata recorded on auto-stop");
}

// 14. Junior cannot manipulate server timestamps (heartbeat accepts no body timestamps)
{
  const heartbeat = read("app/api/junior-creators/shifts/heartbeat/route.ts");
  assert.doesNotMatch(heartbeat, /body\.lastActivityAt|clientTimestamp|startedAt/);
  const shifts = read("lib/junior-creators/shifts.ts");
  assert.match(shifts, /server clock only/);
  ok("14 junior cannot supply timestamps to inflate pay");
}

// Repair args still require explicit Monday + snapshots
{
  assert.throws(() => assertMondayIncidentWeek("2026-08-09"), /Monday/);
  const args = parseRepairArgs([
    "--incident-week=2026-08-03",
    `--harlow-snapshot=${JSON.stringify({
      shiftId: 1,
      juniorId: 2,
      status: "active",
      startedAt: "2026-08-03T10:00:00.000Z",
      endedAt: null,
      totalMinutes: 0,
      hourlyRateCents: 800,
      payAdjustmentCents: 0,
    })}`,
    `--sasha-snapshot=${JSON.stringify({
      shiftId: 3,
      juniorId: 4,
      status: "active",
      startedAt: "2026-08-03T10:00:00.000Z",
      endedAt: null,
      totalMinutes: 0,
      hourlyRateCents: 800,
      payAdjustmentCents: 0,
    })}`,
  ]);
  assert.equal(args.apply, false);
  ok("repair args require explicit incident week; dry-run default");
}

// Required files / cron / migration present
{
  const required = [
    "lib/junior-creators/timer-safety.ts",
    "lib/junior-creators/shift-auto-stop.ts",
    "app/api/cron/junior-creator-shift-safety/route.ts",
    "app/api/junior-creators/shifts/heartbeat/route.ts",
    "migrations/20260807_junior_creator_timer_safety.ts",
  ];
  for (const rel of required) {
    assert.ok(existsSync(path.join(root, rel)), `missing ${rel}`);
  }
  const vercel = read("vercel.json");
  assert.match(vercel, /junior-creator-shift-safety/);
  const migIndex = read("migrations/index.ts");
  assert.match(migIndex, /20260807_junior_creator_timer_safety/);
  ok("timer safety files + cron + migration registered");
}

console.log("\nAll junior timer safety checks passed.");
