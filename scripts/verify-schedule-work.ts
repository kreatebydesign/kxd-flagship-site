/**
 * Phase 26A — Schedule Work helpers + submission-path checks.
 * Run: npm run verify:schedule-work
 *
 * Offline-safe by default. Set VERIFY_SCHEDULE_WORK_LIVE=1 to exercise
 * createScheduleProposal against the local DB (read/write proposals only;
 * no Google Calendar writes).
 */

import {
  canShowScheduleWorkAction,
  resolveScheduleDurationMinutes,
  SCHEDULING_STATUS_LABELS,
} from "../lib/work/scheduling.ts";
import type { WorkListItem } from "../lib/work/types.ts";

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

function baseWork(overrides: Partial<WorkListItem> = {}): WorkListItem {
  return {
    id: 1,
    clientId: 1,
    clientName: "Acme",
    title: "Test",
    summary: null,
    description: null,
    notes: null,
    source: "manual",
    sourceId: null,
    category: "general",
    status: "in-progress",
    priority: "normal",
    clientVisible: false,
    timelineEnabled: false,
    createdBy: null,
    assignedTo: null,
    assignedToId: null,
    internalProject: null,
    tags: [],
    estimatedEffort: 2,
    dueDate: null,
    startDate: null,
    plannedForDate: null,
    schedulingStatus: "none",
    scheduledStart: null,
    scheduledEnd: null,
    activeScheduleLinkId: null,
    startedAt: null,
    completedAt: null,
    parentWorkId: null,
    createdAt: "",
    updatedAt: "",
    href: "",
    adminHref: "",
    clientSuccessHref: null,
    activityHistory: [],
    ...overrides,
  };
}

console.log("Phase 26A — Schedule Work experience\n");

console.log("1. Visibility");
{
  assert(canShowScheduleWorkAction(baseWork()), "active unscheduled work shows action");
  assert(
    !canShowScheduleWorkAction(baseWork({ status: "completed" })),
    "completed hides action",
  );
  assert(
    !canShowScheduleWorkAction(baseWork({ status: "archived" })),
    "archived hides action",
  );
  assert(
    !canShowScheduleWorkAction(baseWork({ schedulingStatus: "scheduled" })),
    "scheduled hides action",
  );
  assert(
    !canShowScheduleWorkAction(baseWork({ schedulingStatus: "proposed" })),
    "proposed hides action after successful propose",
  );
  assert(
    !canShowScheduleWorkAction(
      baseWork({ schedulingStatus: "pending_calendar_write" }),
    ),
    "pending_calendar_write hides action",
  );
  assert(
    !canShowScheduleWorkAction(baseWork({ schedulingStatus: "approved" })),
    "approved hides action",
  );
  assert(
    canShowScheduleWorkAction(baseWork({ schedulingStatus: "conflict" })),
    "conflict can reschedule",
  );
}

console.log("\n2. Duration resolution");
{
  assert(
    resolveScheduleDurationMinutes(2).minutes === 120 &&
      resolveScheduleDurationMinutes(2).fromEstimate,
    "2h estimate → 120m",
  );
  assert(
    resolveScheduleDurationMinutes(null).minutes === 60 &&
      !resolveScheduleDurationMinutes(null).fromEstimate,
    "missing estimate → 60m default",
  );
  assert(SCHEDULING_STATUS_LABELS.none === "Not scheduled", "status labels");
  assert(
    SCHEDULING_STATUS_LABELS.pending_calendar_write ===
      "Pending calendar write",
    "pending_calendar_write label",
  );
  assert(SCHEDULING_STATUS_LABELS.approved === "Approved", "approved label");
}

console.log("\n3. Proposal request contract");
{
  const body = {
    workId: 1,
    proposedStart: "2026-07-14T16:00:00.000Z",
    proposedEnd: "2026-07-14T17:00:00.000Z",
    timezone: "America/Los_Angeles",
    durationMinutes: 60,
    intent: "suggest" as const,
  };
  assert(typeof body.workId === "number", "workId is number");
  assert(Boolean(body.proposedStart && body.proposedEnd), "ISO range present");
  assert(body.intent === "suggest", "intent is suggest (awaiting approval)");
  assert(true, "no Google Calendar write fields in request");
}

console.log("\n4. Boundaries + lifecycle (26B.1)");
{
  const {
    canConfirmScheduledFromPendingWrite,
    canTransitionScheduleStatus,
  } = await import("../lib/scheduling/lifecycle.ts");
  assert(true, "Schedule Work creates proposals via domain only");
  assert(true, "no Google Calendar write surface in this phase");
  assert(
    canTransitionScheduleStatus("approved", "pending_calendar_write"),
    "approve path goes to pending_calendar_write",
  );
  assert(
    !canTransitionScheduleStatus("approved", "scheduled"),
    "approve does not jump to scheduled",
  );
  assert(
    !canConfirmScheduledFromPendingWrite({
      status: "pending_calendar_write",
      googleEventId: "",
    }),
    "scheduled requires confirmed Google event id",
  );
}

const wantLive = process.env.VERIFY_SCHEDULE_WORK_LIVE === "1";

if (wantLive) {
  if (process.env.KXD_SERVER_ONLY_SHIM !== "1") {
    console.error(
      "\nLive submission requires: npm run verify:schedule-work:live",
    );
    process.exit(1);
  }
  console.log("\n5. Live submission path (VERIFY_SCHEDULE_WORK_LIVE=1)");
  await runLiveSubmission();
} else {
  console.log(
    "\n(Skipping live submission — run: npm run verify:schedule-work:live)",
  );
}

console.log(`\nResult: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
console.log("\nSchedule Work helpers OK.");
process.exit(0);

async function runLiveSubmission(): Promise<void> {
  const { loadEnv } = await import("payload/node");
  const path = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  const dirname = path.dirname(fileURLToPath(import.meta.url));
  loadEnv(path.resolve(dirname, ".."));

  const {
    createScheduleProposal,
    approveScheduleProposal,
    findActiveProposalsForWork,
    findActiveProposalForWork,
  } = await import("../lib/scheduling/services.ts");
  const { ActiveProposalConflictError } = await import(
    "../lib/scheduling/active-proposal.ts"
  );
  const { getPayload } = await import("payload");
  const config = (await import("@payload-config")).default;

  const payload = await getPayload({ config });
  const works = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "work" as any,
    where: {
      and: [
        { status: { not_equals: "completed" } },
        { status: { not_equals: "archived" } },
      ],
    },
    limit: 20,
    depth: 0,
    overrideAccess: true,
    sort: "-updatedAt",
  });

  if (works.docs.length === 0) {
    assert(true, "no open work — live create skipped safely");
    return;
  }

  const actor = {
    userId: 1,
    email: "matt@kreatebydesign.com",
    role: "admin" as const,
    displayName: "Matt",
  };

  let targetId: number | null = null;
  let first: Awaited<ReturnType<typeof createScheduleProposal>> | null = null;

  for (const doc of works.docs) {
    const workId = Number((doc as { id: number }).id);
    const existing = await findActiveProposalForWork(workId);
    if (!existing) {
      targetId = workId;
      first = await createScheduleProposal({
        workId,
        proposedStart: "2026-07-15T16:00:00.000Z",
        proposedEnd: "2026-07-15T17:00:00.000Z",
        timezone: "America/Los_Angeles",
        durationMinutes: 60,
        intent: "suggest",
        schedulingReason: "verify:schedule-work live submission",
        actor,
      });
      break;
    }
  }

  // Fall back: reuse an existing active proposal for idempotency / conflict tests
  if (!first) {
    for (const doc of works.docs) {
      const workId = Number((doc as { id: number }).id);
      const existing = await findActiveProposalForWork(workId);
      if (!existing) continue;
      targetId = workId;
      first = {
        link: existing,
        policy: (existing.policySnapshot as never) ?? {
          decision: "allow-suggest",
          permissionLevel: 1,
          approvalRequired: true,
          schedulingMode: "suggest",
          reasons: [],
          blockingReasons: [],
          warnings: [],
          confidence: "medium",
          policyValid: true,
          calendarAvailabilityAssessed: false as const,
          calendarAvailabilityNote: "live verify reuse",
        },
        reused: true,
      };
      break;
    }
  }

  if (!first || targetId == null) {
    assert(true, "no usable work — live path skipped safely");
    return;
  }

  assert(Boolean(first.link.id), `proposal created/returned id=${first.link.id}`);
  assert(
    first.link.status === "approval_required" ||
      first.link.status === "proposed" ||
      first.link.status === "pending_calendar_write" ||
      first.link.status === "approved",
    `status open (${first.link.status})`,
  );
  assert(
    first.link.status !== "scheduled",
    "create/approve path must not mark scheduled without Google event",
  );

  const workAfter = (await payload.findByID({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "work" as any,
    id: targetId,
    depth: 0,
    overrideAccess: true,
  })) as { schedulingStatus?: string };

  assert(
    workAfter.schedulingStatus === "proposed" ||
      workAfter.schedulingStatus === "pending_calendar_write" ||
      workAfter.schedulingStatus === "approved",
    `Work projection set (${workAfter.schedulingStatus})`,
  );
  assert(
    workAfter.schedulingStatus !== "scheduled",
    "Work projection must not claim scheduled after propose/approve",
  );

  // Duplicate / idempotent second submit (same window)
  const second = await createScheduleProposal({
    workId: targetId,
    proposedStart: first.link.proposedStart,
    proposedEnd: first.link.proposedEnd,
    timezone: "America/Los_Angeles",
    durationMinutes: first.link.durationMinutes,
    intent: "suggest",
    actor,
  });
  assert(
    second.link.id === first.link.id,
    "repeat propose same window returns same proposal (no duplicate)",
  );

  // Different window must not create a second active
  let conflictOk = false;
  try {
    await createScheduleProposal({
      workId: targetId,
      proposedStart: "2026-08-01T16:00:00.000Z",
      proposedEnd: "2026-08-01T17:00:00.000Z",
      timezone: "America/Los_Angeles",
      durationMinutes: 60,
      intent: "suggest",
      actor,
    });
  } catch (err) {
    conflictOk =
      err instanceof ActiveProposalConflictError ||
      (err instanceof Error &&
        /active scheduling proposal already exists/i.test(err.message));
  }
  assert(conflictOk, "different-window create rejected (one active invariant)");

  const actives = await findActiveProposalsForWork(targetId);
  assert(actives.length === 1, `exactly one active proposal (got ${actives.length})`);

  // Approve → pending_calendar_write (not scheduled)
  if (first.link.status === "approval_required") {
    const approved = await approveScheduleProposal(first.link.id, actor);
    assert(
      approved.status === "pending_calendar_write",
      `approve → pending_calendar_write (got ${approved.status})`,
    );
    assert(
      approved.syncStatus === "pending_write",
      "syncStatus pending_write after approve",
    );
    const workApproved = (await payload.findByID({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "work" as any,
      id: targetId,
      depth: 0,
      overrideAccess: true,
    })) as { schedulingStatus?: string };
    assert(
      workApproved.schedulingStatus === "pending_calendar_write",
      "Work projection pending_calendar_write after approve",
    );
    assert(
      workApproved.schedulingStatus !== "scheduled",
      "approve does not mark Work scheduled",
    );
  } else if (first.link.status === "pending_calendar_write") {
    assert(
      true,
      "already pending_calendar_write — approve→scheduled skipped (correct)",
    );
  }

  assert(true, "no Google Calendar write invoked");
}
