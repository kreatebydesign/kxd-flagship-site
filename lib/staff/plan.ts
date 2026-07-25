/**
 * Deterministic daily plan for restricted staff.
 * Facts → sequence. No fabricated work. Intelligence may explain, not invent.
 */

import type { WorkListItem } from "@/lib/work/types";
import type { TrainingDashboardData } from "@/lib/training/types";
import {
  isDueToday,
  isPlannedForToday,
  isWorkOverdue,
} from "@/lib/work/views";
import type {
  StaffActor,
  StaffMorningOverview,
  StaffPlanItem,
  StaffPlanState,
  StaffPrimaryAction,
  StaffWaitingOnMattItem,
} from "./types";
import {
  bandLabel,
  classifyActionableBand,
  isReturnedWork,
  isWaitingOnMatt,
  needsInformation,
  requiresMattApproval,
  sortActionableWork,
  todayDateLabel,
  toLocalDateKey,
  type StaffPriorityBand,
} from "./prioritize";

function workHref(workId: number): string {
  return `/admin/operations/staff/work/${workId}`;
}

function trainingHref(pathSlug: string, lessonSlug?: string | null): string {
  if (lessonSlug) return `/admin/training/${pathSlug}/${lessonSlug}`;
  return `/admin/training/${pathSlug}`;
}

function estimateMinutes(work: WorkListItem): number | null {
  if (typeof work.estimatedEffort === "number" && work.estimatedEffort > 0) {
    return Math.round(work.estimatedEffort * 60);
  }
  return null;
}

function clientOrCategory(work: WorkListItem): string {
  if (work.clientName && work.clientName !== "Internal") return work.clientName;
  if (work.internalProject) return work.internalProject;
  return work.category.replace(/-/g, " ");
}

function dueState(work: WorkListItem, now = new Date()): string {
  if (isWorkOverdue(work, now)) return "Overdue";
  if (isDueToday(work, now)) return "Due today";
  if (isPlannedForToday(work, now)) return "Planned today";
  if (work.dueDate) return `Due ${work.dueDate.slice(0, 10)}`;
  return "No due date";
}

function resolvePlanState(
  work: WorkListItem,
  waiting: boolean,
  now = new Date(),
): StaffPlanState {
  if (work.status === "completed" || work.status === "archived") return "complete";
  if (waiting) return "waiting-on-matt";
  if (needsInformation(work)) return "needs-information";
  if (requiresMattApproval(work) && !waiting) return "prepare-for-matt";
  if (work.status === "in-progress" || isReturnedWork(work)) return "continue";
  if (
    work.plannedForDate &&
    !isPlannedForToday(work, now) &&
    !isDueToday(work, now) &&
    !isWorkOverdue(work, now)
  ) {
    return "scheduled-later";
  }
  return "ready-to-begin";
}

function whyForBand(band: StaffPriorityBand, work: WorkListItem): string {
  switch (band) {
    case 1:
      return "This is past its due date and needs calm, intentional progress today.";
    case 2:
      return "Matt marked this as priority — treat it ahead of routine work.";
    case 3:
      return "It is due today. Finishing it keeps the studio and client on schedule.";
    case 4:
      return "Matt returned this for correction. Finish the revisions before new work.";
    case 5:
      return "This blocks client progress until it moves.";
    case 6:
      return "This was planned for today — keep the day ordered.";
    case 7:
      return "The deadline is approaching. Prepare now so it does not become urgent.";
    default:
      return work.summary?.trim()
        ? "Authorized assigned work you can advance carefully."
        : "Safe preparation work within your authority.";
  }
}

function planStateLabel(state: StaffPlanState): string {
  switch (state) {
    case "ready-to-begin":
      return "Ready to begin";
    case "continue":
      return "Continue";
    case "needs-information":
      return "Needs information";
    case "prepare-for-matt":
      return "Prepare for Review";
    case "waiting-on-matt":
      return "Awaiting Approval";
    case "training-required":
      return "Training required";
    case "scheduled-later":
      return "Scheduled later";
    case "complete":
      return "Complete";
    default:
      return state;
  }
}

function toWorkPlanItem(
  work: WorkListItem,
  bucket: StaffPlanItem["bucket"],
  order: number,
  now = new Date(),
): StaffPlanItem {
  const waiting = isWaitingOnMatt(work);
  const band = waiting ? null : classifyActionableBand(work, now);
  const planState = resolvePlanState(work, waiting, now);
  const approval = requiresMattApproval(work);
  const missing = needsInformation(work)
    ? ["A clear summary of what is needed", "Any client facts already on file"]
    : [];

  return {
    id: `work-${work.id}`,
    order,
    bucket,
    kind: work.tags.includes("staff-responsibility") ? "responsibility" : "work",
    title: work.title,
    clientOrCategory: clientOrCategory(work),
    whyItMatters: band != null ? whyForBand(band, work) : "An authorized approver must act before you can finish this.",
    expectedOutcome: approval
      ? "A prepared packet ready for review — not a final external action."
      : "A clear update or completion within your authority.",
    estimatedMinutes: estimateMinutes(work),
    dueState: dueState(work, now),
    currentStatus: work.status,
    planState,
    canAct: !waiting && work.status !== "blocked",
    canCompleteIndependently: !approval && !waiting,
    requiresMattApproval: approval,
    missingInformation: missing,
    safestNextAction:
      planState === "waiting-on-matt"
        ? "Leave this waiting. Do not reopen it repeatedly."
        : planState === "needs-information"
          ? "Gather facts from KXD records — do not invent them."
          : planState === "prepare-for-matt"
            ? "Prepare carefully, then submit for approval."
            : "Open guided work mode and follow the checklist.",
    href: workHref(work.id),
    workId: work.id,
    priorityBand: band,
    evidence: [
      band != null ? `Priority: ${bandLabel(band)}` : "Awaiting Approval",
      `Status: ${work.status}`,
      dueState(work, now),
      `Plan state: ${planStateLabel(planState)}`,
    ],
  };
}

export function buildStaffPlan(input: {
  actor: StaffActor;
  assigned: WorkListItem[];
  training: TrainingDashboardData;
  now?: Date;
}): {
  plan: StaffPlanItem[];
  primaryAction: StaffPrimaryAction;
  hasUrgentWork: boolean;
  todaySummary: string;
  morning: StaffMorningOverview;
  waitingOnMatt: StaffWaitingOnMattItem[];
  comingNext: StaffPlanItem[];
  emptyState: {
    title: string;
    body: string;
    actionLabel: string;
    actionHref: string;
  } | null;
} {
  const { actor, assigned, training } = input;
  const now = input.now ?? new Date();
  const dateKey = toLocalDateKey(now);
  const dateLabel = todayDateLabel(now);

  const open = assigned.filter(
    (w) => w.status !== "completed" && w.status !== "archived",
  );
  const waitingWorks = open.filter((w) => isWaitingOnMatt(w));
  const blocked = open.filter((w) => w.status === "blocked");
  const actionable = sortActionableWork(
    open.filter((w) => !isWaitingOnMatt(w) && w.status !== "blocked"),
    now,
  );
  const overdue = actionable.filter((w) => isWorkOverdue(w, now));
  const scheduledLater = open.filter((w) => {
    if (isWaitingOnMatt(w) || w.status === "blocked") return false;
    if (isWorkOverdue(w, now) || isDueToday(w, now) || isPlannedForToday(w, now)) {
      return false;
    }
    if (w.status === "in-progress") return false;
    return Boolean(w.dueDate || w.plannedForDate);
  });

  const continueLesson = training.continueLesson ?? training.recommendedLesson;
  const trainingIncomplete = training.overallPercent < 100 && Boolean(continueLesson);

  const plan: StaffPlanItem[] = [];
  let order = 1;

  const startWork = actionable[0] ?? null;

  // Empty-day rule: training first when no operational work
  const preferTrainingFirst =
    !startWork && trainingIncomplete && Boolean(actor.onboardingCompletedAt);

  if (startWork && actor.onboardingCompletedAt) {
    plan.push(toWorkPlanItem(startWork, "start-here", order++, now));
  }

  if (preferTrainingFirst && continueLesson) {
    plan.push({
      id: `train-${continueLesson.pathSlug}-${continueLesson.slug}`,
      order: order++,
      bucket: "start-here",
      kind: "training",
      title: continueLesson.title,
      clientOrCategory: "Training",
      whyItMatters:
        "No assigned operational work is ready. Required training is the safest Start Here.",
      expectedOutcome:
        "Clear understanding of what you may do and what returns to Matt.",
      estimatedMinutes: continueLesson.estimatedMinutes,
      dueState: "Required",
      currentStatus: "training",
      planState: "training-required",
      canAct: true,
      canCompleteIndependently: true,
      requiresMattApproval: false,
      missingInformation: [],
      safestNextAction: "Continue the lesson, then return to your daily plan.",
      href: trainingHref(continueLesson.pathSlug, continueLesson.slug),
      workId: null,
      priorityBand: 8,
      evidence: [
        `Path: ${continueLesson.pathSlug}`,
        `Progress: ${training.overallPercent}%`,
      ],
    });
  }

  for (const work of actionable.slice(startWork ? 1 : 0, 8)) {
    if (startWork && work.id === startWork.id) continue;
    plan.push(toWorkPlanItem(work, "then", order++, now));
  }

  if (startWork && continueLesson && training.overallPercent < 80) {
    plan.push({
      id: `train-later-${continueLesson.pathSlug}-${continueLesson.slug}`,
      order: order++,
      bucket: "training",
      kind: "training",
      title: continueLesson.title,
      clientOrCategory: "Training",
      whyItMatters:
        "Training unlocks workflows you will use on real client work.",
      expectedOutcome:
        "Steady foundation progress after today's priority work.",
      estimatedMinutes: continueLesson.estimatedMinutes,
      dueState: "When capacity allows",
      currentStatus: "training",
      planState: "training-required",
      canAct: true,
      canCompleteIndependently: true,
      requiresMattApproval: false,
      missingInformation: [],
      safestNextAction: "Return here after your Start Here item.",
      href: trainingHref(continueLesson.pathSlug, continueLesson.slug),
      workId: null,
      priorityBand: 8,
      evidence: [`Progress: ${training.overallPercent}%`],
    });
  }

  const waitingOnMatt: StaffWaitingOnMattItem[] = waitingWorks.slice(0, 8).map((work) => {
    const submitted =
      work.activityHistory
        .filter((e) => /review|submitted/i.test(e.action) || /submitted/i.test(e.detail ?? ""))
        .map((e) => e.at)
        .sort()
        .at(-1) ?? (work.status === "review" ? work.updatedAt : null);
    const ageMs = submitted ? Date.now() - new Date(submitted).getTime() : 0;
    const followUpAppropriate = ageMs > 1000 * 60 * 60 * 24;

    plan.push({
      ...toWorkPlanItem(work, "waiting-on-matt", order++, now),
      canAct: false,
      safestNextAction: followUpAppropriate
        ? "A calm follow-up to Matt may be appropriate after a full day."
        : "Leave this waiting. Continue ready work.",
    });

    return {
      id: `wait-${work.id}`,
      title: work.title,
      preparedSummary:
        work.summary?.trim() ||
        "You prepared this item and submitted it for a decision.",
      decisionNeeded:
        work.status === "review"
          ? "Matt needs to approve, return, or clarify."
          : "Matt or the studio must advance this before you continue.",
      submittedAt: submitted,
      followUpAppropriate,
      href: workHref(work.id),
      workId: work.id,
    };
  });

  for (const work of blocked.slice(0, 3)) {
    plan.push({
      ...toWorkPlanItem(work, "can-wait", order++, now),
      canAct: false,
      planState: "needs-information",
      whyItMatters:
        "Blocked work should not consume focus until the blocker clears.",
      safestNextAction:
        "Document the blocker if needed, then ask Matt only if you cannot unblock it.",
      missingInformation: ["What is blocking progress?"],
    });
  }

  const comingNext: StaffPlanItem[] = scheduledLater
    .filter((w) => !actionable.slice(0, 8).some((a) => a.id === w.id))
    .slice(0, 5)
    .map((work, index) =>
      toWorkPlanItem(work, "coming-next", 100 + index, now),
    );

  for (const item of comingNext) {
    plan.push({ ...item, planState: "scheduled-later", canAct: false });
  }

  let primaryAction: StaffPrimaryAction;
  let emptyState: {
    title: string;
    body: string;
    actionLabel: string;
    actionHref: string;
  } | null = null;

  const startItem = plan.find((p) => p.bucket === "start-here") ?? null;

  if (!actor.onboardingCompletedAt) {
    primaryAction = {
      label: "Continue onboarding",
      href: "/admin/operations/staff/welcome",
      reason: "Finish your first guided welcome before taking live assignments.",
      evidence: ["Staff onboarding not marked complete"],
      title: "Welcome to KXD OS",
      clientOrCategory: "Internal",
      expectedOutcome: "Orientation complete and ready for assigned work.",
      estimatedMinutes: 15,
      permissionStatus: "Allowed",
      planState: "ready-to-begin",
      workId: null,
    };
  } else if (startItem) {
    primaryAction = {
      label: "Begin",
      href: startItem.href ?? "/admin/operations/staff",
      reason: startItem.whyItMatters,
      evidence: startItem.evidence,
      title: startItem.title,
      clientOrCategory: startItem.clientOrCategory,
      expectedOutcome: startItem.expectedOutcome,
      estimatedMinutes: startItem.estimatedMinutes,
      permissionStatus: startItem.canAct
        ? startItem.requiresMattApproval
          ? "Prepare only — sensitive outcomes require approval"
          : "You may advance this within your authority"
        : "Waiting — do not force progress",
      planState: startItem.planState,
      workId: startItem.workId,
    };
  } else if (continueLesson) {
    primaryAction = {
      label: "Continue training",
      href: trainingHref(continueLesson.pathSlug, continueLesson.slug),
      reason: "No urgent assigned work — keep building operational confidence.",
      evidence: [`Overall training ${training.overallPercent}%`],
      title: continueLesson.title,
      clientOrCategory: "Training",
      expectedOutcome: "Foundation progress without fabricating busywork.",
      estimatedMinutes: continueLesson.estimatedMinutes,
      permissionStatus: "Allowed",
      planState: "training-required",
      workId: null,
    };
    emptyState = {
      title: "Nothing urgent assigned",
      body: "That is okay. Continue training or wait for Matt with a clear next step. Do not invent work.",
      actionLabel: "Continue training",
      actionHref: trainingHref(continueLesson.pathSlug, continueLesson.slug),
    };
  } else {
    primaryAction = {
      label: "You are caught up",
      href: "/admin/operations/staff/wrap-up",
      reason:
        "No assigned operational work is ready and training is current. Stay available without inventing tasks.",
      evidence: ["Assigned open actionable work: 0"],
      title: "Caught up for now",
      clientOrCategory: "Internal",
      expectedOutcome: "Remain ready. Use wrap-up if the day is ending.",
      estimatedMinutes: null,
      permissionStatus: "No action required",
      planState: "complete",
      workId: null,
    };
    emptyState = {
      title: "You are caught up",
      body: "When Matt assigns work or a recurring responsibility is due, it will appear here. Until then, do not invent busywork.",
      actionLabel: "Open end-of-day wrap-up",
      actionHref: "/admin/operations/staff/wrap-up",
    };
  }

  const workloadMinutes = actionable
    .map(estimateMinutes)
    .filter((n): n is number => typeof n === "number" && n > 0)
    .reduce((sum, n) => sum + n, 0);

  const hasUrgentWork = overdue.length > 0 || Boolean(startWork && classifyActionableBand(startWork, now) <= 3);
  const actionableCount = actionable.length + (preferTrainingFirst ? 1 : 0);
  const caughtUp =
    Boolean(actor.onboardingCompletedAt) &&
    actionable.length === 0 &&
    !preferTrainingFirst &&
    waitingWorks.length === 0;

  const todaySummary = !actor.onboardingCompletedAt
    ? "Finish your welcome orientation first — then your daily plan will assemble from real assignments."
    : hasUrgentWork
      ? `You have ${actionable.length} actionable item${actionable.length === 1 ? "" : "s"}. Start with one clear action — KXD Intelligence will guide the rest.`
      : waitingWorks.length > 0 && actionable.length === 0
        ? `Nothing needs your hands right now. ${waitingWorks.length} item${waitingWorks.length === 1 ? " is" : "s are"} waiting on Matt.`
        : caughtUp
          ? "You are caught up. Stay ready without inventing work."
          : "No urgent work is assigned. Use this calm window for training and preparation.";

  const trainingLevelLabel =
    training.overallPercent >= 80
      ? "Foundation nearly complete"
      : training.overallPercent >= 40
        ? "Building operational confidence"
        : "Foundation in progress";

  const morning: StaffMorningOverview = {
    greeting: "", // filled by loader with name
    dateLabel,
    dateKey,
    summary: todaySummary,
    actionableCount,
    waitingOnMattCount: waitingWorks.length,
    estimatedWorkloadMinutes: workloadMinutes > 0 ? workloadMinutes : null,
    trainingPercent: training.overallPercent,
    trainingLevelLabel,
    caughtUp,
  };

  if (plan.length === 0 && emptyState) {
    plan.push({
      id: "empty-home",
      order: 1,
      bucket: "can-wait",
      kind: "empty",
      title: emptyState.title,
      clientOrCategory: "Internal",
      whyItMatters: "Empty queues are real. Fabricating work creates noise.",
      expectedOutcome: "Stay ready without inventing tasks.",
      estimatedMinutes: null,
      dueState: "—",
      currentStatus: "clear",
      planState: "complete",
      canAct: true,
      canCompleteIndependently: true,
      requiresMattApproval: false,
      missingInformation: [],
      safestNextAction: primaryAction.label,
      href: primaryAction.href,
      workId: null,
      priorityBand: null,
      evidence: ["No open assigned work"],
    });
  }

  void planStateLabel;

  return {
    plan,
    primaryAction,
    hasUrgentWork,
    todaySummary,
    morning,
    waitingOnMatt,
    comingNext,
    emptyState,
  };
}

export { planStateLabel };
