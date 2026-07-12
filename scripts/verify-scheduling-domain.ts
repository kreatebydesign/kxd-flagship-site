/**
 * Phase 25B — Domain verification (no Google, no DB required).
 * Run: npx tsx scripts/verify-scheduling-domain.ts
 */

import {
  assertScheduleStatusTransition,
  canTransitionScheduleStatus,
  SchedulingTransitionError,
} from "../lib/scheduling/lifecycle.ts";
import {
  actorHasCapability,
  resolveSchedulingCapabilities,
} from "../lib/scheduling/permissions.ts";
import { evaluateSchedulingPolicy } from "../lib/scheduling/policy.ts";
import type { SchedulingActor, SchedulingWorkContext } from "../lib/scheduling/types.ts";

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string): void {
  if (condition) {
    passed += 1;
    console.log(`  ✓ ${label}`);
  } else {
    failed += 1;
    console.error(`  ✗ ${label}`);
  }
}

const heather: SchedulingActor = {
  userId: 2,
  email: "heather@kreatebydesign.com",
  role: "editor",
};

const matt: SchedulingActor = {
  userId: 1,
  email: "matt@kreatebydesign.com",
  role: "admin",
};

const internalWork: SchedulingWorkContext = {
  workId: 101,
  title: "Draft proposal outline",
  priority: "normal",
  category: "strategy",
  clientId: null,
  estimatedEffortHours: 1,
  tags: [],
};

/** Next Monday 10:00–11:00 America/Los_Angeles — inside working hours. */
function nextMondaySlot(): { start: string; end: string } {
  const now = new Date();
  const day = now.getUTCDay();
  const daysUntilMon = (8 - day) % 7 || 7;
  const monday = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + daysUntilMon, 17, 0, 0),
  );
  // 10:00 PT ≈ 17:00 UTC (PST) or 18:00 UTC (PDT) — use fixed ISO with offset
  const start = "2026-07-13T10:00:00-07:00"; // Monday
  const end = "2026-07-13T11:00:00-07:00";
  void monday;
  return { start, end };
}

console.log("Phase 25B — Scheduling domain verification\n");

console.log("1. Capabilities");
{
  const hCaps = resolveSchedulingCapabilities(heather);
  assert(hCaps.has("scheduling.suggest"), "Heather can suggest");
  assert(
    !hCaps.has("scheduling.write-internal"),
    "Heather cannot write-internal",
  );
  assert(!hCaps.has("scheduling.approve"), "Heather cannot approve");

  const mCaps = resolveSchedulingCapabilities(matt);
  assert(mCaps.has("scheduling.write-internal"), "Matt can write-internal");
  assert(mCaps.has("scheduling.approve"), "Matt can approve");
}

console.log("\n2. Policy evidence — Level 1 suggest");
{
  const slot = nextMondaySlot();
  const policy = evaluateSchedulingPolicy({
    actor: heather,
    work: internalWork,
    slot: {
      proposedStart: slot.start,
      proposedEnd: slot.end,
      timezone: "America/Los_Angeles",
      durationMinutes: 60,
    },
    intent: "direct",
  });
  assert(policy.policyValid, "policyValid for internal weekday slot");
  assert(policy.decision === "allow-suggest", "Heather direct → allow-suggest");
  assert(policy.permissionLevel === 1, "permissionLevel 1");
  assert(policy.approvalRequired === true, "approval required for Level 1");
  assert(
    policy.calendarAvailabilityAssessed === false,
    "does not claim calendar availability",
  );
  assert(
    Array.isArray(policy.reasons) && policy.reasons.length > 0,
    "structured reasons present",
  );
}

console.log("\n3. Policy — Level 2 Matt internal");
{
  const slot = nextMondaySlot();
  const policy = evaluateSchedulingPolicy({
    actor: matt,
    work: internalWork,
    slot: {
      proposedStart: slot.start,
      proposedEnd: slot.end,
      timezone: "America/Los_Angeles",
      durationMinutes: 60,
    },
    intent: "direct",
  });
  assert(policy.decision === "allow-direct", "Matt direct → allow-direct");
  assert(policy.permissionLevel === 2, "permissionLevel 2");
  assert(policy.approvalRequired === false, "no approval for Level 2");
}

console.log("\n4. Policy — Level 3 restricted");
{
  const slot = nextMondaySlot();
  const policy = evaluateSchedulingPolicy({
    actor: matt,
    work: { ...internalWork, priority: "critical" },
    slot: {
      proposedStart: slot.start,
      proposedEnd: slot.end,
      timezone: "America/Los_Angeles",
      durationMinutes: 60,
    },
    intent: "direct",
    externalAttendees: true,
  });
  assert(policy.decision === "require-approval", "restricted → require-approval");
  assert(policy.permissionLevel === 3, "permissionLevel 3");
  assert(policy.approvalRequired === true, "approval required");
}

console.log("\n5. Policy — outside hours");
{
  const policy = evaluateSchedulingPolicy({
    actor: matt,
    work: internalWork,
    slot: {
      proposedStart: "2026-07-13T20:00:00-07:00",
      proposedEnd: "2026-07-13T21:00:00-07:00",
      timezone: "America/Los_Angeles",
      durationMinutes: 60,
    },
    intent: "direct",
  });
  assert(policy.permissionLevel === 3, "outside hours → Level 3");
  assert(policy.decision === "require-approval", "outside hours requires approval");
}

console.log("\n6. Lifecycle transitions");
{
  assert(
    canTransitionScheduleStatus("draft", "proposed"),
    "draft → proposed allowed",
  );
  assert(
    canTransitionScheduleStatus("proposed", "approval_required"),
    "proposed → approval_required",
  );
  assert(
    canTransitionScheduleStatus("approval_required", "approved"),
    "approval_required → approved",
  );
  assert(
    canTransitionScheduleStatus("approved", "scheduled"),
    "approved → scheduled",
  );
  assert(
    !canTransitionScheduleStatus("canceled", "scheduled"),
    "canceled → scheduled rejected",
  );
  assert(
    !canTransitionScheduleStatus("draft", "scheduled"),
    "draft → scheduled rejected",
  );

  let threw = false;
  try {
    assertScheduleStatusTransition("completed", "proposed");
  } catch (e) {
    threw = e instanceof SchedulingTransitionError;
  }
  assert(threw, "invalid transition throws SchedulingTransitionError");
}

console.log("\n7. Capability gate helper");
{
  assert(
    actorHasCapability(heather, "scheduling.suggest"),
    "heather suggest ok",
  );
  assert(
    !actorHasCapability(heather, "scheduling.approve"),
    "heather approve denied",
  );
}

console.log(`\nResult: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
console.log("\nNo Google Calendar code exercised. Domain foundation OK.");
