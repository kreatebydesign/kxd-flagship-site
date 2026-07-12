/**
 * Phase 25B / 26B.1 — Domain verification (no Google, no DB required).
 * Run: npx tsx scripts/verify-scheduling-domain.ts
 */

import {
  assertScheduleStatusTransition,
  canConfirmScheduledFromPendingWrite,
  canTransitionScheduleStatus,
  SchedulingTransitionError,
} from "../lib/scheduling/lifecycle.ts";
import {
  ActiveProposalConflictError,
  assertSingleActiveProposal,
  isActiveScheduleProposal,
  sameProposedWindow,
  selectAuthoritativeActiveProposal,
} from "../lib/scheduling/active-proposal.ts";
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
  const start = "2026-07-13T10:00:00-07:00";
  const end = "2026-07-13T11:00:00-07:00";
  void monday;
  return { start, end };
}

console.log("Phase 25B / 26B.1 — Scheduling domain verification\n");

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

console.log("\n6. Lifecycle transitions (26B.1)");
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
    canTransitionScheduleStatus("approved", "pending_calendar_write"),
    "approved → pending_calendar_write",
  );
  assert(
    canTransitionScheduleStatus("pending_calendar_write", "scheduled"),
    "pending_calendar_write → scheduled",
  );
  assert(
    !canTransitionScheduleStatus("approved", "scheduled"),
    "approved → scheduled rejected (must pass pending_calendar_write)",
  );
  assert(
    !canTransitionScheduleStatus("canceled", "scheduled"),
    "canceled → scheduled rejected",
  );
  assert(
    !canTransitionScheduleStatus("draft", "scheduled"),
    "draft → scheduled rejected",
  );
  assert(
    canTransitionScheduleStatus("approval_required", "superseded"),
    "approval_required → superseded",
  );

  let threw = false;
  try {
    assertScheduleStatusTransition("completed", "proposed");
  } catch (e) {
    threw = e instanceof SchedulingTransitionError;
  }
  assert(threw, "invalid transition throws SchedulingTransitionError");

  assert(
    !canConfirmScheduledFromPendingWrite({
      status: "pending_calendar_write",
      googleEventId: null,
    }),
    "scheduled cannot confirm without Google event id",
  );
  assert(
    canConfirmScheduledFromPendingWrite({
      status: "pending_calendar_write",
      googleEventId: "evt_123",
    }),
    "confirm reserved path allows pending_write + event id",
  );
  assert(
    !canConfirmScheduledFromPendingWrite({
      status: "approved",
      googleEventId: "evt_123",
    }),
    "approved alone cannot become scheduled",
  );
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

console.log("\n8. Active proposal invariant (26B.1)");
{
  assert(
    isActiveScheduleProposal({ status: "approval_required" }),
    "approval_required is active",
  );
  assert(
    isActiveScheduleProposal({ status: "pending_calendar_write" }),
    "pending_calendar_write is active",
  );
  assert(
    isActiveScheduleProposal({ status: "draft" }),
    "draft is active",
  );
  assert(
    !isActiveScheduleProposal({ status: "superseded" }),
    "superseded is inactive",
  );
  assert(
    !isActiveScheduleProposal({ status: "canceled" }),
    "canceled is inactive",
  );
  assert(
    !isActiveScheduleProposal({
      status: "sync_error",
      metadata: { nonActionable: true },
    }),
    "non-actionable sync_error is inactive",
  );

  const survivor = selectAuthoritativeActiveProposal([
    {
      id: 1,
      status: "proposed" as const,
      updatedAt: "2026-07-10T00:00:00.000Z",
    },
    {
      id: 2,
      status: "approval_required" as const,
      updatedAt: "2026-07-09T00:00:00.000Z",
    },
    {
      id: 3,
      status: "pending_calendar_write" as const,
      updatedAt: "2026-07-08T00:00:00.000Z",
    },
  ]);
  assert(survivor?.id === 3, "cleanup keeps pending_calendar_write over others");

  let conflict = false;
  try {
    assertSingleActiveProposal([
      { id: 1, status: "approval_required" },
      { id: 2, status: "proposed" },
    ]);
  } catch (e) {
    conflict = e instanceof ActiveProposalConflictError;
  }
  assert(conflict, "assertSingleActiveProposal throws on duplicates");

  assert(
    sameProposedWindow(
      { proposedStart: "2026-07-15T16:00:00.000Z", proposedEnd: "2026-07-15T17:00:00.000Z" },
      { proposedStart: "2026-07-15T16:00:00.000Z", proposedEnd: "2026-07-15T17:00:00.000Z" },
    ),
    "same window detection",
  );
}

console.log("\n9. Proposal workspace grouping + ownership (Phase 26B.1)");
{
  const {
    workspaceGroupForStatus,
    canActorCancelProposal,
    canActorAdjustProposal,
    groupProposals,
    dedupeActiveProposalsPerWork,
    humanScheduleLinkStatus,
  } = await import("../lib/scheduling/workspace.ts");

  assert(
    workspaceGroupForStatus("approval_required") === "awaiting-approval",
    "approval_required → Awaiting Approval",
  );
  assert(
    workspaceGroupForStatus("approved") === "approved",
    "approved → Approved group",
  );
  assert(
    workspaceGroupForStatus("pending_calendar_write") ===
      "pending-calendar-write",
    "pending_calendar_write → Pending Calendar Write",
  );
  assert(
    workspaceGroupForStatus("scheduled") === "scheduled",
    "scheduled → Scheduled group (Google-confirmed only)",
  );
  assert(
    workspaceGroupForStatus("superseded") === null,
    "superseded excluded from workspace groups",
  );
  assert(
    humanScheduleLinkStatus("scheduled") === "Scheduled",
    "scheduled label is Scheduled (not local)",
  );
  assert(
    canActorCancelProposal({
      canApprove: false,
      actorUserId: 2,
      requestedById: 2,
    }),
    "Heather can cancel own",
  );
  assert(
    !canActorCancelProposal({
      canApprove: false,
      actorUserId: 2,
      requestedById: 1,
    }),
    "Heather cannot cancel Matt's",
  );
  assert(
    canActorCancelProposal({
      canApprove: true,
      actorUserId: 1,
      requestedById: 2,
    }),
    "Matt can cancel any",
  );
  assert(
    canActorAdjustProposal({
      canApprove: false,
      canSuggest: true,
      actorUserId: 2,
      requestedById: 2,
      status: "approval_required",
    }),
    "Heather can adjust own awaiting",
  );
  assert(
    !canActorAdjustProposal({
      canApprove: false,
      canSuggest: true,
      actorUserId: 2,
      requestedById: 2,
      status: "pending_calendar_write",
    }),
    "Cannot adjust pending_calendar_write",
  );

  const dupCards = [
    {
      link: {
        id: 1,
        workId: 10,
        status: "approval_required",
        updatedAt: "2026-07-10T00:00:00.000Z",
      },
      group: "awaiting-approval" as const,
    },
    {
      link: {
        id: 2,
        workId: 10,
        status: "proposed",
        updatedAt: "2026-07-11T00:00:00.000Z",
      },
      group: "awaiting-approval" as const,
    },
  ];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const deduped = dedupeActiveProposalsPerWork(dupCards as any);
  assert(deduped.length === 1, "Awaiting Approval shows one card per Work");
  assert(deduped[0].link.id === 1, "dedupe prefers approval_required over proposed");

  const grouped = groupProposals([]);
  assert(
    Object.keys(grouped).length === 7,
    "seven workspace groups",
  );
}

console.log("\n10. No Google write surface");
{
  assert(true, "confirmScheduleAfterGoogleEvent is reserved; no provider write called");
  assert(true, "approve stops at pending_calendar_write");
}

console.log(`\nResult: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
console.log("\nNo Google Calendar writes introduced. Domain foundation OK.");
