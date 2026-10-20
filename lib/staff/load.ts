import "server-only";

import { getTrainingStaffSummary } from "@/lib/training/summary";
import { buildStaffGuidedChecklistItems } from "./guided-checklist";
import { loadStaffGuidedChecklistChecked } from "./work-execution-service";
import { splitWorkNotes } from "./work-execution-notes";
import { formatInstructionBlocks, summarizeDeliverableProgress } from "./work-deliverables";
import { loadWorkDeliverableViews } from "./work-deliverables-service";
import { getWorkItem } from "@/lib/work/services";
import { listWorkAssignedToStaffActor } from "@/lib/work/staff-assigned";
import type { WorkListItem } from "@/lib/work/types";
import { staffActorFromUser, describeStaffActor } from "./actor";
import { buildStaffPlan } from "./plan";
import {
  STAFF_HOME_PATH,
  actorHasStaffCapability,
  isRestrictedStaff,
  staffLandingPathForActor,
  staffRoleTitle,
} from "./permissions";
import { materializeResponsibilitiesForUser } from "./responsibilities";
import { actorUsesAssignedClientScope } from "./client-assignments";
import {
  listHelpRequestsForStaff,
  type StaffHelpRequestRecord,
} from "./help-requests";
import type {
  StaffActor,
  StaffGuidedWorkData,
  StaffHelpRequestView,
  StaffTodayData,
  StaffWrapUpData,
} from "./types";
import { getStaffPreviewSession } from "./preview";
import { buildStaffWrapUp, loadSavedWrapUpNote } from "./wrap-up";
import {
  isWaitingOnMatt,
  todayDateLabel,
  toLocalDateKey,
} from "./prioritize";
import { workRequiresOperatorApproval } from "./work-approval";
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
  actor: StaffActor,
): Promise<WorkListItem[]> {
  return listWorkAssignedToStaffActor(actor, { includeCompleted: false });
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

  const trainingUser = actingUser ?? user;
  const training = await getTrainingStaffSummary(trainingUser);
  const assigned = await getAssignedWorkForStaff(actor);
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

  let documentAttention: StaffTodayData["documentAttention"] = [];
  if (actorHasStaffCapability(actor, "staff.documents.read")) {
    try {
      const { listPendingStaffDocumentAttention } = await import(
        "@/lib/staff-documents/data"
      );
      documentAttention = await listPendingStaffDocumentAttention(actor.userId);
    } catch {
      documentAttention = [];
    }
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
    documentAttention,
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
  const assigned = await getAssignedWorkForStaff(actor);
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
  if (actorUsesAssignedClientScope(actor) && work.clientId != null) {
    const allowed = await (
      await import("./client-assignments")
    ).staffMayAccessClient(actor, work.clientId);
    if (!allowed) return null;
  }

  const mattApproval =
    workRequiresOperatorApproval(work, actor) || isWaitingOnMatt(work);

  const { studioNotes, staffProgress } = splitWorkNotes(work.notes);
  const checklistItems = buildStaffGuidedChecklistItems(mattApproval);
  let checklistChecked: Record<string, boolean> = {};
  try {
    checklistChecked = await loadStaffGuidedChecklistChecked(
      work.id,
      actor.userId,
      mattApproval,
    );
  } catch {
    checklistChecked = Object.fromEntries(
      checklistItems.map((item) => [item.id, false]),
    );
  }

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

  let deliverables: Awaited<ReturnType<typeof loadWorkDeliverableViews>> = [];
  try {
    deliverables = await loadWorkDeliverableViews(work.id, actor.userId);
  } catch {
    deliverables = [];
  }
  const deliverableProgress = summarizeDeliverableProgress(deliverables);
  const instructionSource = [work.description, work.acceptanceCriteria]
    .filter((s) => s?.trim())
    .join("\n\n");
  const instructionBlocks = formatInstructionBlocks(instructionSource);

  return {
    workId: work.id,
    title: work.title,
    summary: work.summary,
    description: work.description,
    acceptanceCriteria: work.acceptanceCriteria,
    studioNotes,
    staffProgressNotes: staffProgress,
    checklistChecked,
    deliverables,
    deliverableProgress,
    instructionBlocks,
    activityHistory: work.activityHistory ?? [],
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
        ? "A packet ready for approval"
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
        title: mattApproval ? "Prepare for Review" : "Complete intentionally",
        detail: mattApproval
          ? "Submit for approval — do not send, publish, or finalize alone."
          : "Mark complete only when the checklist is truly done.",
      },
    ],
    examples: [
      "Internal note: facts only, no promises to the client.",
      "Draft email: mark as draft and submit for approval.",
    ],
    permissionBoundary: mattApproval
      ? "You may prepare. An authorized approver must decide before anything leaves the studio or changes access, money, or public content."
      : "You may complete this assigned item. Do not change plans, entitlements, permissions, or send external messages.",
    checklist: checklistItems,
    canCompleteIndependently: !mattApproval,
    requiresMattApproval: mattApproval,
    hrefBack: STAFF_HOME_PATH,
    hrefMyWork: "/admin/operations/staff/my-work",
    helpRequests,
  };
}

export function staffHomePathForUser(user: AnyUser): string {
  const actor = staffActorFromUser(user);
  if (actor && isRestrictedStaff(actor)) return STAFF_HOME_PATH;
  return "/admin/operations/today";
}

/** Login / Payload isolation destination — welcome when onboarding incomplete. */
export function staffLandingPathForUser(user: AnyUser): string {
  const actor = staffActorFromUser(user);
  if (!actor || !isRestrictedStaff(actor)) return "/admin/operations/today";
  return staffLandingPathForActor(actor);
}

export { staffRoleTitle, todayDateLabel };
