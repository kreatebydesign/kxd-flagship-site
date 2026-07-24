import "server-only";

import { getTrainingDashboard } from "@/lib/training/services";
import { getWorkEngineWorkspace, getWorkItem } from "@/lib/work/services";
import type { WorkListItem } from "@/lib/work/types";
import { staffActorFromUser, describeStaffActor } from "./actor";
import { buildStaffPlan } from "./plan";
import {
  STAFF_HOME_PATH,
  actorHasStaffCapability,
  isRestrictedStaff,
  staffRoleTitle,
} from "./permissions";
import { materializeResponsibilitiesForUser } from "./responsibilities";
import {
  countOpenHelpForStaff,
  listHelpRequestsForStaff,
  type StaffHelpRequestRecord,
} from "./help-requests";
import type {
  StaffGuidedWorkData,
  StaffHelpRequestView,
  StaffTodayData,
  StaffWrapUpData,
} from "./types";
import { getStaffPreviewSession } from "./preview";
import { buildStaffWrapUp, loadSavedWrapUpNote } from "./wrap-up";
import {
  isWaitingOnMatt,
  requiresMattApproval,
  todayDateLabel,
  toLocalDateKey,
} from "./prioritize";
import { STAFF_GUIDANCE_PROMPTS } from "./guidance";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyUser = Record<string, any>;

function toHelpView(record: StaffHelpRequestRecord): StaffHelpRequestView {
  return {
    id: record.id,
    question: record.question,
    pagePath: record.pagePath,
    status: record.status,
    intelligenceResponse: record.intelligenceResponse,
    responseSource: record.responseSource,
    confidence: record.confidence,
    requiresMatt: record.requiresMatt,
    mattResponse: record.mattResponse,
    workId: record.workId,
    workTitle: record.workTitle,
    clientLabel: record.clientLabel,
    createdAt: record.createdAt,
    answeredAt: record.answeredAt,
    href: record.href,
  };
}
function greetingFor(name: string): string {
  const hour = new Date().getHours();
  const part =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  return `${part}, ${name}.`;
}

export async function getAssignedWorkForStaff(
  userId: number,
): Promise<WorkListItem[]> {
  const workspace = await getWorkEngineWorkspace();
  const all = [
    ...workspace.currentWork,
    ...workspace.queue,
    ...workspace.upcoming,
    ...workspace.recentWork.slice(0, 40),
    ...workspace.completedToday,
  ];
  const seen = new Set<number>();
  const assigned: WorkListItem[] = [];
  for (const item of all) {
    if (item.assignedToId !== userId) continue;
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    assigned.push(item);
  }
  return assigned;
}

export async function loadStaffToday(
  user: AnyUser,
  options?: { previewStaffUserId?: number | null },
): Promise<StaffTodayData> {
  const preview = await getStaffPreviewSession();
  const actingUser =
    options?.previewStaffUserId != null
      ? { ...user, id: options.previewStaffUserId }
      : preview && actorHasStaffCapability(staffActorFromUser(user)!, "admin.preview-staff")
        ? null
        : user;

  let actor = staffActorFromUser(actingUser ?? user);
  if (!actor) {
    throw new Error("Unable to resolve staff actor.");
  }

  if (preview && actorHasStaffCapability(staffActorFromUser(user)!, "admin.preview-staff")) {
    actor = {
      ...actor,
      userId: preview.staffUserId,
      displayName: preview.staffLabel,
      staffRole:
        actor.staffRole === "none" ? "operations_coordinator" : actor.staffRole,
      role: "editor",
    };
  }

  // Materialize recurring responsibilities into Work Engine (idempotent).
  // Preview mode does not create work.
  if (!preview) {
    try {
      await materializeResponsibilitiesForUser(actor.userId);
    } catch {
      /* collection may be unavailable before migration — plan still works */
    }
  }

  const training = await getTrainingDashboard(user);
  const assigned = await getAssignedWorkForStaff(actor.userId);
  const {
    plan,
    primaryAction,
    hasUrgentWork,
    todaySummary,
    morning,
    waitingOnMatt,
    comingNext,
    emptyState,
  } = buildStaffPlan({ actor, assigned, training });

  let helpRequests: StaffHelpRequestView[] = [];
  try {
    const records = await listHelpRequestsForStaff(actor.userId);
    helpRequests = records.map(toHelpView);
  } catch {
    helpRequests = [];
  }

  const isPreview = Boolean(preview);
  const { roleTitle } = describeStaffActor(actor);
  const firstName = actor.displayName.split(" ")[0] || actor.displayName;
  const greeting = greetingFor(firstName);

  return {
    actor,
    greeting,
    roleTitle,
    trainingLevelLabel: morning.trainingLevelLabel,
    trainingPercent: training.overallPercent,
    todaySummary,
    hasUrgentWork,
    primaryAction,
    plan,
    morning: {
      ...morning,
      greeting,
    },
    waitingOnMatt,
    comingNext,
    wrapUpHref: "/admin/operations/staff/wrap-up",
    guidancePrompts: STAFF_GUIDANCE_PROMPTS,
    helpRequests,
    emptyState,
    permissions: {
      canAct: !isPreview && isRestrictedStaff(actor)
        ? actorHasStaffCapability(actor, "staff.assigned-work.update")
        : !isPreview,
      isPreview,
      previewBanner: isPreview
        ? `Previewing ${preview!.staffLabel}'s staff experience — changes are disabled.`
        : null,
    },
  };
}

export async function loadStaffWrapUp(user: AnyUser): Promise<StaffWrapUpData> {
  const actor = staffActorFromUser(user);
  if (!actor) throw new Error("Unable to resolve staff actor.");
  const assigned = await getAssignedWorkForStaff(actor.userId);
  const dateKey = toLocalDateKey();
  let savedNote: string | null = null;
  try {
    savedNote = await loadSavedWrapUpNote(actor.userId, dateKey);
  } catch {
    savedNote = null;
  }
  return buildStaffWrapUp({
    assigned,
    trainingCompletedToday: false,
    savedNote,
  });
}

export async function loadStaffGuidedWork(
  user: AnyUser,
  workId: number,
): Promise<StaffGuidedWorkData | null> {
  const actor = staffActorFromUser(user);
  if (!actor) return null;

  const work = await getWorkItem(workId);
  if (!work) return null;

  if (isRestrictedStaff(actor) && work.assignedToId !== actor.userId) {
    return null;
  }

  const mattApproval = requiresMattApproval(work) || isWaitingOnMatt(work);

  let helpRequests: StaffHelpRequestView[] = [];
  try {
    const records = await listHelpRequestsForStaff(actor.userId, {
      workId: work.id,
      includeResolved: true,
    });
    helpRequests = records.slice(0, 5).map(toHelpView);
  } catch {
    helpRequests = [];
  }

  return {
    workId: work.id,
    title: work.title,
    summary: work.summary,
    status: work.status,
    priority: work.priority,
    dueDate: work.dueDate,
    clientLabel: work.clientName ?? null,
    whyItMatters:
      "Assigned work moves the studio forward when completed carefully and within your authority.",
    whatKxdKnows: [
      work.summary ? `Summary on file: ${work.summary}` : "No summary stored yet.",
      work.clientName ? `Related client: ${work.clientName}` : "No client linked.",
      `Current status: ${work.status}`,
      work.dueDate ? `Due ${work.dueDate.slice(0, 10)}` : "No due date set.",
    ],
    whatToProduce: [
      "A clear internal update or draft",
      "Any missing facts gathered without inventing them",
      mattApproval
        ? "A packet ready for Matt's approval"
        : "Completion confirmation when the checklist is honest",
    ],
    steps: [
      {
        title: "Read the request",
        detail: "Understand what was asked before changing anything.",
      },
      {
        title: "Check what KXD already knows",
        detail: "Use existing client and work context. Do not invent facts.",
      },
      {
        title: "Produce the draft or update",
        detail: "Stay inside your permission boundary. Label AI drafts clearly.",
      },
      {
        title: "Check your work",
        detail: "Use the checklist. Ask KXD Intelligence if something feels unclear.",
      },
      {
        title: mattApproval ? "Prepare for Matt" : "Complete intentionally",
        detail: mattApproval
          ? "Submit for review — do not send, publish, or finalize alone."
          : "Mark complete only when the checklist is truly done.",
      },
    ],
    examples: [
      "Internal note: facts only, no promises to the client.",
      "Draft email: mark as draft and send to Matt for approval.",
    ],
    permissionBoundary: mattApproval
      ? "You may prepare. Matt must approve before anything leaves the studio or changes access, money, or public content."
      : "You may complete this assigned item. Do not change plans, entitlements, permissions, or send external messages.",
    checklist: [
      { id: "understood", label: "I understand what was requested", required: true },
      { id: "no-invention", label: "I did not invent client facts, prices, or dates", required: true },
      { id: "boundary", label: "I stayed inside my permission boundary", required: true },
      {
        id: "matt",
        label: mattApproval
          ? "Ready for Matt's review"
          : "I confirmed completion intentionally",
        required: true,
      },
    ],
    canCompleteIndependently: !mattApproval,
    requiresMattApproval: mattApproval,
    hrefBack: STAFF_HOME_PATH,
    helpRequests,
  };
}

export function staffHomePathForUser(user: AnyUser): string {
  const actor = staffActorFromUser(user);
  if (actor && isRestrictedStaff(actor)) return STAFF_HOME_PATH;
  return "/admin/operations/today";
}

export { staffRoleTitle, todayDateLabel };
