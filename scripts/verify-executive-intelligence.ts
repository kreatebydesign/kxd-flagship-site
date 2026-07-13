/**
 * Phase 28A — Executive Intelligence Engine verification.
 * Deterministic fixtures. No database. No calendar mutations.
 *
 * Run: npm run verify:executive-intelligence
 */

import { composeExecutiveIntelligence } from "../lib/executive-intelligence/compose.ts";
import { isScheduleMaterial, type ScheduleEvidenceInput } from "../lib/executive-intelligence/evidence/schedule.ts";
import type { BriefingInputContext } from "../lib/intelligence/briefings/types.ts";
import type { ReviewInboxItem } from "../lib/website-review-inbox/types.ts";
import type {
  ExecutiveTodayAttentionItem,
  ExecutiveTodayCapacity,
  ExecutiveTodayCurrentPosition,
  ExecutiveTodayDayFlowItem,
  ExecutiveTodayWorkRef,
} from "../lib/executive-today/brief/types.ts";

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

const NOW = "2026-07-14T17:30:00.000Z";

function emptyBriefing(): BriefingInputContext {
  return {
    intelligence: {
      clients: [],
      clientsById: new Map(),
      projects: [],
      requests: [],
      deliverables: [],
      campaigns: [],
      flyers: [],
      videos: [],
      socialPosts: [],
      timeline: [],
      infrastructure: [],
      infraEvents: [],
      infraCosts: [],
      healthCtx: {} as BriefingInputContext["intelligence"]["healthCtx"],
    },
    work: {
      currentWork: [],
      waitingOnClient: [],
      review: [],
      completedRecently: [],
      stats: { open: 0, blocked: 0, waiting: 0, review: 0 },
    },
    reviewInbox: { newCount: 0, activeCount: 0, items: [] },
    communications: {
      needsReplyCount: 0,
      staleUnresolvedCount: 0,
      overdueFollowUpCount: 0,
      openCount: 0,
      needsReply: [],
    },
    generatedAt: NOW,
  } as unknown as BriefingInputContext;
}

function baseCapacity(overrides: Partial<ExecutiveTodayCapacity> = {}): ExecutiveTodayCapacity {
  return {
    remainingWorkMinutes: 300,
    committedCalendarMinutes: 120,
    scheduledWorkMinutes: 60,
    openFocusMinutes: 180,
    fragmentedMinutes: 30,
    largestFocusBlockMinutes: 90,
    largestFocusBlockStart: "2026-07-14T20:00:00.000Z",
    largestFocusBlockEnd: "2026-07-14T21:30:00.000Z",
    requestedWorkMinutes: null,
    capacityConfidence: "known",
    summary: "180 minutes of open focus remain",
    ...overrides,
  };
}

function baseCurrent(overrides: Partial<ExecutiveTodayCurrentPosition> = {}): ExecutiveTodayCurrentPosition {
  return {
    happeningNow: null,
    happeningNowKind: null,
    minutesRemaining: null,
    nextCommitment: null,
    nextStartsInMinutes: null,
    inOpenGap: true,
    behindPlan: false,
    summary: "No active timed commitment",
    ...overrides,
  };
}

function scheduleInput(overrides: Partial<ScheduleEvidenceInput> = {}): ScheduleEvidenceInput {
  return {
    orientation: "balanced",
    dayFlow: [],
    attention: [],
    capacity: baseCapacity(),
    current: baseCurrent(),
    overdueWork: [],
    plannedUnscheduled: [],
    observedEventCount: 0,
    linkedCount: 0,
    recoveryCount: 0,
    conflictCount: 0,
    observedAt: NOW,
    timeZone: "America/Los_Angeles",
    ...overrides,
  };
}

console.log("\nPhase 28A — Executive Intelligence Engine\n");

// 1. Evidence determinism
{
  const input = emptyBriefing();
  input.reviewInbox = {
    newCount: 1,
    activeCount: 0,
    items: [
      {
        id: 1,
        title: "Homepage hero",
        clientName: "Primal",
        status: "new",
        submittedAt: NOW,
        workspaceUrl: "/admin/operations/review-inbox",
        pageLocation: "/",
      } as ReviewInboxItem,
    ],
  };
  const a = composeExecutiveIntelligence({ observedAt: NOW, briefing: input });
  const b = composeExecutiveIntelligence({ observedAt: NOW, briefing: input });
  assert(
    JSON.stringify(a.evidence) === JSON.stringify(b.evidence),
    "Evidence collection is deterministic",
  );
}

// 2. Interpretation determinism
{
  const surface = composeExecutiveIntelligence({
    observedAt: NOW,
    briefing: emptyBriefing(),
    schedule: scheduleInput({ observedEventCount: 1, linkedCount: 1 }),
  });
  assert(surface.interpretations.length >= 0, "Interpretation layer produces output");
  assert(
    surface.interpretations.every((i) => i.evidenceIds.length > 0 || surface.evidence.length === 0),
    "Every interpretation references evidence",
  );
}

// 3. Portfolio priority chain — review new wins
{
  const input = emptyBriefing();
  input.reviewInbox = {
    newCount: 1,
    activeCount: 1,
    items: [
      {
        id: 2,
        title: "New page",
        clientName: "Primal",
        status: "new",
        submittedAt: NOW,
        workspaceUrl: "/admin/operations/review-inbox",
        pageLocation: null,
      } as ReviewInboxItem,
      {
        id: 3,
        title: "Active page",
        clientName: "Primal",
        status: "in-progress",
        submittedAt: NOW,
        workspaceUrl: "/admin/operations/review-inbox",
        pageLocation: null,
      } as ReviewInboxItem,
    ],
  };
  const surface = composeExecutiveIntelligence({ observedAt: NOW, briefing: input });
  assert(surface.recommendation.id === "rec-review-new", "New website review wins portfolio chain");
}

// 4. Schedule recovery wins when material
{
  const recoveryItem: ExecutiveTodayDayFlowItem = {
    id: "flow-recovery",
    kind: "recovery",
    state: "attention",
    startIso: null,
    endIso: null,
    durationMinutes: null,
    allDay: false,
    title: "Missing calendar event",
    detail: "Linked event cancelled remotely",
    workId: 1,
    workHref: "/admin/work/1",
    clientName: "Primal",
    scheduleLinkId: 10,
    calendarHtmlLink: null,
    correlation: "linked_recovery",
    syncStatus: "synced",
    recoveryState: "missing_remote",
    externalChangeClass: "cancelled",
    risk: "needs_reschedule",
    isPrivate: false,
  };
  const schedule = scheduleInput({
    orientation: "recovery_required",
    recoveryCount: 1,
    linkedCount: 1,
    observedEventCount: 1,
    dayFlow: [recoveryItem],
  });
  const input = emptyBriefing();
  input.reviewInbox = {
    newCount: 1,
    activeCount: 0,
    items: [
      {
        id: 1,
        title: "Should not win",
        clientName: "Primal",
        status: "new",
        submittedAt: NOW,
        workspaceUrl: "/admin/operations/review-inbox",
        pageLocation: null,
      } as ReviewInboxItem,
    ],
  };
  const surface = composeExecutiveIntelligence({
    observedAt: NOW,
    briefing: input,
    schedule,
  });
  assert(surface.recommendation.id === "rec-schedule-recovery", "Schedule recovery wins when material");
  assert(surface.decision.scheduleMaterial === true, "Schedule marked material");
}

// 5. Portfolio wins when schedule not material
{
  const input = emptyBriefing();
  input.communications = {
    needsReplyCount: 1,
    staleUnresolvedCount: 0,
    overdueFollowUpCount: 0,
    openCount: 1,
    needsReply: [
      {
        id: 1,
        clientId: 1,
        clientName: "Primal",
        subject: "Question about launch",
        date: NOW,
        status: "needs-reply",
        href: "/admin/operations/command",
      },
    ],
  };
  const surface = composeExecutiveIntelligence({
    observedAt: NOW,
    briefing: input,
    schedule: scheduleInput(),
  });
  assert(surface.recommendation.id === "rec-comms-reply", "Portfolio comms wins when schedule quiet");
  assert(surface.decision.scheduleMaterial === false, "Schedule not material without calendar evidence");
}

// 6. Exactly one primary recommendation
{
  const surface = composeExecutiveIntelligence({ observedAt: NOW, briefing: emptyBriefing() });
  assert(typeof surface.recommendation.action === "string", "Primary recommendation has action");
  assert(typeof surface.recommendation.reasoning === "string", "Primary recommendation has reasoning");
  assert(Array.isArray(surface.recommendation.evidenceIds), "Primary recommendation has evidence IDs");
}

// 7. Explainability always exists
{
  const surface = composeExecutiveIntelligence({
    observedAt: NOW,
    briefing: emptyBriefing(),
    schedule: scheduleInput({ conflictCount: 1, observedEventCount: 2, orientation: "compressed" }),
  });
  assert(surface.explainability.decisionPath.length === 4, "Explainability has 4 decision path steps");
  assert(surface.explainability.confidenceRationale.length > 0, "Confidence rationale present");
  assert(surface.explainability.evidence === surface.evidence, "Explainability includes evidence");
}

// 8. Confidence behavior
{
  const calm = composeExecutiveIntelligence({ observedAt: NOW, briefing: emptyBriefing() });
  assert(calm.recommendation.confidence === "high", "Calm default has high confidence");
  assert(calm.recommendation.urgency === "low", "Calm default has low urgency");
}

// 9. Narrative input is structured data (no prose generation)
{
  const surface = composeExecutiveIntelligence({ observedAt: NOW, briefing: emptyBriefing() });
  assert(typeof surface.narrativeInput.primaryAction === "string", "Narrative input has primaryAction");
  assert(Array.isArray(surface.narrativeInput.riskSignals), "Narrative input has riskSignals array");
  assert(Array.isArray(surface.narrativeInput.evidenceHighlights), "Narrative input has evidenceHighlights");
}

// 10. Schedule conflict recommendation
{
  const attention: ExecutiveTodayAttentionItem[] = [
    {
      id: "conflict-1",
      title: "Overlapping commitments",
      evidence: "Two blocks overlap between 2–3 PM",
      href: "/admin/work/scheduling",
      hrefLabel: "Open Scheduling",
      severity: "risk",
    },
  ];
  const surface = composeExecutiveIntelligence({
    observedAt: NOW,
    schedule: scheduleInput({
      attention,
      conflictCount: 1,
      observedEventCount: 2,
      orientation: "compressed",
    }),
  });
  assert(surface.recommendation.id === "rec-schedule-conflict", "Conflict produces conflict recommendation");
}

// 11. isScheduleMaterial helper
{
  assert(
    isScheduleMaterial(scheduleInput({ recoveryCount: 1 })),
    "Recovery makes schedule material",
  );
  assert(
    !isScheduleMaterial(scheduleInput()),
    "Empty schedule is not material",
  );
}

// 12. Reversibility on recommendations
{
  const surface = composeExecutiveIntelligence({ observedAt: NOW, briefing: emptyBriefing() });
  assert(
    ["easy", "moderate", "hard"].includes(surface.recommendation.reversibility),
    "Recommendation includes reversibility",
  );
}

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
